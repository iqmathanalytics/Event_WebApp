const { pool } = require("../config/db");
const { listEventsByOrganizer, findEventById } = require("../models/eventModel");
const { listSharedEventsForUser } = require("../models/eventAnalyticsShareModel");
const { getBookingInsightsForWindow, getBookingInsights } = require("./eventAnalyticsService");
const { sendTransactionalEmail, isBrevoConfigured } = require("../utils/emailIntegrations");
const { buildDailyOrganizerEventSummaryEmail, formatDateUs } = require("../utils/transactionalEmailTemplates");
const { getAppTimeZone } = require("../utils/couponDatetime");
const {
  getGaReportingTimezone,
  getCalendarDateString,
  getTimezoneShortLabel
} = require("../utils/gaReportingTimezone");
const { normalizeTicketSalesMode, readTicketSalesModeRaw } = require("../utils/eventTicketSalesMode");

function isActiveListedEvent(event) {
  if (!event) {
    return false;
  }
  const listed =
    event.is_listed !== false &&
    event.is_listed !== 0 &&
    String(event.is_listed) !== "false";
  const shown =
    event.show_on_events_page !== false &&
    event.show_on_events_page !== 0 &&
    String(event.show_on_events_page) !== "false";
  return listed && shown;
}

function formatPartsInTz(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || "00";
  let hour = Number(get("hour"));
  if (hour === 24) {
    hour = 0;
  }
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour,
    minute: Number(get("minute")),
    second: Number(get("second"))
  };
}

/** UTC Date for local wall-clock Y-M-D H:M:S in timeZone. */
function zonedWallTimeToUtcDate(year, month, day, hour, minute, second, timeZone) {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 4; i += 1) {
    const p = formatPartsInTz(new Date(utcMs), timeZone);
    const asLocalMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const wantedMs = Date.UTC(year, month - 1, day, hour, minute, second);
    utcMs += wantedMs - asLocalMs;
  }
  return new Date(utcMs);
}

function toMysqlUtcDatetime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function addCalendarDays(dateStr, days) {
  const [y, m, d] = String(dateStr)
    .split("-")
    .map((n) => Number(n));
  const utc = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(utc.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Previous completed calendar day in app timezone (half-open [yesterday, today)).
 */
function getPreviousDayWindow(now = new Date(), timeZone = getAppTimeZone() || getGaReportingTimezone()) {
  const todayStr = getCalendarDateString(0, timeZone);
  const dayStartDate = addCalendarDays(todayStr, -1);
  const dayEndDate = todayStr;
  const [ys, ms, ds] = dayStartDate.split("-").map(Number);
  const [ye, me, de] = dayEndDate.split("-").map(Number);
  const fromUtc = zonedWallTimeToUtcDate(ys, ms, ds, 0, 0, 0, timeZone);
  const toUtc = zonedWallTimeToUtcDate(ye, me, de, 0, 0, 0, timeZone);
  const dayLabel = formatDateUs(dayStartDate);
  return {
    timeZone,
    dayStartDate,
    dayEndDate,
    dayLabel,
    weekLabel: dayLabel,
    weekStartDate: dayStartDate,
    weekEndDate: dayEndDate,
    fromMysql: toMysqlUtcDatetime(fromUtc),
    toMysql: toMysqlUtcDatetime(toUtc),
    timezoneLabel: getTimezoneShortLabel(timeZone)
  };
}

/** @deprecated Use getPreviousDayWindow — kept for older scripts. */
const getPreviousWeekWindow = getPreviousDayWindow;

async function listDailySummaryRecipients() {
  const [rows] = await pool.query(
    `SELECT DISTINCT u.id, u.name, u.email
     FROM users u
     WHERE u.is_active = 1
       AND u.email IS NOT NULL
       AND TRIM(u.email) <> ''
       AND (
         u.organizer_enabled = 1
         OR EXISTS (
           SELECT 1 FROM events e WHERE e.organizer_id = u.id LIMIT 1
         )
         OR EXISTS (
           SELECT 1 FROM event_analytics_shares s
           WHERE s.shared_with_user_id = u.id
             AND s.revoked_at IS NULL
             AND COALESCE(s.status, 'accepted') = 'accepted'
           LIMIT 1
         )
       )
     ORDER BY u.id ASC`
  );
  return rows;
}

const listWeeklySummaryRecipients = listDailySummaryRecipients;

async function buildEventSummariesForUser(userId, window) {
  const owned = await listEventsByOrganizer(userId);
  const shared = await listSharedEventsForUser(userId);
  const byId = new Map();

  owned.forEach((ev) => {
    byId.set(Number(ev.id), {
      eventId: Number(ev.id),
      title: ev.title || "Event",
      accessLabel: "Your event",
      ticketSalesMode: normalizeTicketSalesMode(readTicketSalesModeRaw(ev) ?? ev.ticket_sales_mode),
      eventRow: ev
    });
  });

  shared.forEach((row) => {
    const id = Number(row.event_id);
    if (byId.has(id)) {
      return;
    }
    byId.set(id, {
      eventId: id,
      title: row.title || "Event",
      accessLabel: row.owner_name ? `Shared by ${row.owner_name}` : "Shared with you",
      ticketSalesMode: normalizeTicketSalesMode(readTicketSalesModeRaw(row) ?? row.ticket_sales_mode),
      eventRow: null
    });
  });

  const events = [];
  for (const item of byId.values()) {
    const isPlatform = item.ticketSalesMode === "platform";
    let event = item.eventRow;
    if (!event) {
      event = await findEventById(item.eventId);
    }
    if (!isActiveListedEvent(event)) {
      continue;
    }
    if (!isPlatform) {
      continue;
    }

    const [dayInsights, lifetimeInsights] = await Promise.all([
      getBookingInsightsForWindow(item.eventId, event, window.fromMysql, window.toMysql),
      getBookingInsights(item.eventId, event)
    ]);

    const dayTiers = Array.isArray(dayInsights.tiers)
      ? dayInsights.tiers
          .filter((t) => (Number(t.tickets_sold) || 0) > 0 || (Number(t.gross_revenue) || 0) > 0)
          .map((t) => ({
            name: t.level_name || "Tier",
            tickets: Number(t.tickets_sold) || 0,
            revenue: Number(t.gross_revenue) || 0
          }))
      : [];

    const lifetimeTiers = Array.isArray(lifetimeInsights.tiers)
      ? lifetimeInsights.tiers
          .filter((t) => (Number(t.tickets_sold) || 0) > 0 || (Number(t.gross_revenue) || 0) > 0)
          .map((t) => ({
            name: t.level_name || "Tier",
            tickets: Number(t.tickets_sold) || 0,
            revenue: Number(t.gross_revenue) || 0
          }))
      : [];

    events.push({
      eventId: item.eventId,
      title: item.title,
      accessLabel: item.accessLabel,
      isPlatform: true,
      bookings: Number(dayInsights.total_bookings) || 0,
      attendees: Number(dayInsights.total_attendees) || 0,
      revenue: Number(dayInsights.gross_revenue) || 0,
      paidBookings: Number(dayInsights.paid_bookings) || 0,
      freeBookings: Number(dayInsights.free_bookings) || 0,
      tiers: dayTiers,
      totalSales: Number(lifetimeInsights.gross_revenue) || 0,
      totalTickets: Number(lifetimeInsights.total_attendees) || 0,
      totalBookings: Number(lifetimeInsights.total_bookings) || 0,
      lifetimeTiers
    });
  }

  events.sort((a, b) => String(a.title).localeCompare(String(b.title), "en", { sensitivity: "base" }));
  return events;
}

async function sendDailySummaryForUser(user, window) {
  const events = await buildEventSummariesForUser(user.id, window);
  const platformEvents = events.filter((ev) => ev.isPlatform);
  if (!platformEvents.length) {
    return { skipped: true, reason: "no_platform_events", emailsSent: 0 };
  }

  const recipientName = String(user.name || "").split(/\s+/)[0] || user.name || "there";
  let emailsSent = 0;
  let bookings = 0;

  for (const event of platformEvents) {
    const { subject, text, html } = buildDailyOrganizerEventSummaryEmail({
      recipientName,
      dayLabel: window.dayLabel || window.weekLabel,
      timezoneLabel: window.timezoneLabel,
      event
    });

    await sendTransactionalEmail({
      to: user.email,
      subject,
      text,
      html
    });
    emailsSent += 1;
    bookings += Number(event.bookings) || 0;
  }

  return { skipped: false, eventCount: platformEvents.length, emailsSent, bookings };
}

/** @deprecated Prefer sendDailySummaryForUser */
const sendWeeklySummaryForUser = sendDailySummaryForUser;

/**
 * Send one daily digest email per platform event for each eligible user
 * (owners + accepted share recipients).
 */
async function runDailyOrganizerSummary({ force = false } = {}) {
  if (!isBrevoConfigured() && !force) {
    return { ok: false, reason: "brevo_not_configured", sent: 0 };
  }

  const window = getPreviousDayWindow();
  const recipients = await listDailySummaryRecipients();
  let sent = 0;
  let emailsSent = 0;
  let skipped = 0;
  const errors = [];

  for (const user of recipients) {
    try {
      const result = await sendDailySummaryForUser(user, window);
      if (result.skipped) {
        skipped += 1;
      } else {
        sent += 1;
        emailsSent += Number(result.emailsSent) || 0;
      }
    } catch (err) {
      errors.push({ userId: user.id, message: err?.message || String(err) });
    }
  }

  return {
    ok: true,
    dayLabel: window.dayLabel,
    weekLabel: window.dayLabel,
    fromMysql: window.fromMysql,
    toMysql: window.toMysql,
    recipients: recipients.length,
    sent,
    emailsSent,
    skipped,
    errors
  };
}

const runWeeklyOrganizerSummary = runDailyOrganizerSummary;

function summaryEnabled() {
  const daily = process.env.DAILY_SUMMARY_ENABLED;
  if (daily != null && String(daily).trim() !== "") {
    return String(daily).toLowerCase() !== "false";
  }
  return String(process.env.WEEKLY_SUMMARY_ENABLED || "true").toLowerCase() !== "false";
}

function summaryHour() {
  const daily = process.env.DAILY_SUMMARY_HOUR;
  if (daily != null && String(daily).trim() !== "") {
    return Number(daily);
  }
  return Number(process.env.WEEKLY_SUMMARY_HOUR || 9);
}

function summaryCheckMs() {
  const daily = process.env.DAILY_SUMMARY_CHECK_MS;
  if (daily != null && String(daily).trim() !== "") {
    return Number(daily);
  }
  return Number(process.env.WEEKLY_SUMMARY_CHECK_MS || 15 * 60 * 1000);
}

function startDailyOrganizerSummaryJob() {
  if (global.__dailyOrganizerSummaryJobStarted || global.__weeklyOrganizerSummaryJobStarted) {
    return;
  }
  global.__dailyOrganizerSummaryJobStarted = true;
  global.__weeklyOrganizerSummaryJobStarted = true;

  if (!summaryEnabled()) {
    // eslint-disable-next-line no-console
    console.log("[daily-summary] Disabled via DAILY_SUMMARY_ENABLED / WEEKLY_SUMMARY_ENABLED=false");
    return;
  }

  const timeZone = getAppTimeZone() || getGaReportingTimezone();
  const targetHour = summaryHour();
  const checkEveryMs = summaryCheckMs();

  const runIfDue = async () => {
    try {
      if (!isBrevoConfigured()) {
        return;
      }
      const now = new Date();
      const parts = formatPartsInTz(now, timeZone);
      const hour = Number(parts.hour);
      const dateKey = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;

      if (hour !== targetHour) {
        return;
      }
      if (global.__dailyOrganizerSummaryLastRunDate === dateKey) {
        return;
      }
      global.__dailyOrganizerSummaryLastRunDate = dateKey;
      global.__weeklyOrganizerSummaryLastRunDate = dateKey;

      // eslint-disable-next-line no-console
      console.log(`[daily-summary] Running per-event digests for ${dateKey} (${timeZone})`);
      const result = await runDailyOrganizerSummary();
      // eslint-disable-next-line no-console
      console.log(
        `[daily-summary] Done users=${result.sent} emails=${result.emailsSent} skipped=${result.skipped} errors=${result.errors?.length || 0}`
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[daily-summary] Job failed:", err?.message || err);
    }
  };

  setTimeout(() => {
    runIfDue().catch(() => {});
  }, 20_000);

  setInterval(() => {
    runIfDue().catch(() => {});
  }, checkEveryMs);

  // eslint-disable-next-line no-console
  console.log(
    `[daily-summary] Scheduled (daily ${targetHour}:00 ${timeZone}, check every ${Math.round(checkEveryMs / 60000)}m, one email per event)`
  );
}

const startWeeklyOrganizerSummaryJob = startDailyOrganizerSummaryJob;

module.exports = {
  getPreviousDayWindow,
  getPreviousWeekWindow,
  listDailySummaryRecipients,
  listWeeklySummaryRecipients,
  buildEventSummariesForUser,
  sendDailySummaryForUser,
  sendWeeklySummaryForUser,
  runDailyOrganizerSummary,
  runWeeklyOrganizerSummary,
  startDailyOrganizerSummaryJob,
  startWeeklyOrganizerSummaryJob
};
