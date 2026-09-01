const { pool } = require("../config/db");
const { listEventsByOrganizer, findEventById } = require("../models/eventModel");
const { listSharedEventsForUser } = require("../models/eventAnalyticsShareModel");
const { getBookingInsightsForWindow } = require("./eventAnalyticsService");
const { sendTransactionalEmail, isBrevoConfigured } = require("../utils/emailIntegrations");
const { buildWeeklyOrganizerSummaryEmail, formatDateUs } = require("../utils/transactionalEmailTemplates");
const { getAppTimeZone } = require("../utils/couponDatetime");
const {
  getGaReportingTimezone,
  getCalendarDateString,
  getTimezoneShortLabel
} = require("../utils/gaReportingTimezone");
const { normalizeTicketSalesMode, readTicketSalesModeRaw } = require("../utils/eventTicketSalesMode");

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

function weekdayInTz(dateStr, timeZone) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const probe = zonedWallTimeToUtcDate(y, m, d, 12, 0, 0, timeZone);
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(probe);
}

/**
 * Previous completed Mon–Sun week in app timezone (half-open [mon, nextMon)).
 * When called on Monday, this is last week; mid-week still targets the most recent completed week.
 */
function getPreviousWeekWindow(now = new Date(), timeZone = getAppTimeZone() || getGaReportingTimezone()) {
  const todayStr = getCalendarDateString(0, timeZone);
  // Walk back to most recent Monday (including today if Monday).
  let cursor = todayStr;
  for (let i = 0; i < 7; i += 1) {
    if (weekdayInTz(cursor, timeZone) === "Mon") {
      break;
    }
    cursor = addCalendarDays(cursor, -1);
  }
  // Completed week ends at this Monday 00:00 → start is 7 days earlier.
  const weekEndDate = cursor;
  const weekStartDate = addCalendarDays(weekEndDate, -7);
  const [ys, ms, ds] = weekStartDate.split("-").map(Number);
  const [ye, me, de] = weekEndDate.split("-").map(Number);
  const fromUtc = zonedWallTimeToUtcDate(ys, ms, ds, 0, 0, 0, timeZone);
  const toUtc = zonedWallTimeToUtcDate(ye, me, de, 0, 0, 0, timeZone);
  const weekLabel = `${formatDateUs(weekStartDate)} – ${formatDateUs(addCalendarDays(weekEndDate, -1))}`;
  return {
    timeZone,
    weekStartDate,
    weekEndDate,
    weekLabel,
    fromMysql: toMysqlUtcDatetime(fromUtc),
    toMysql: toMysqlUtcDatetime(toUtc),
    timezoneLabel: getTimezoneShortLabel(timeZone)
  };
}

async function listWeeklySummaryRecipients() {
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
    if (!isPlatform) {
      events.push({
        title: item.title,
        accessLabel: item.accessLabel,
        isPlatform: false,
        bookings: 0,
        attendees: 0,
        revenue: 0,
        paidBookings: 0,
        freeBookings: 0,
        tiers: []
      });
      continue;
    }

    const insights = await getBookingInsightsForWindow(
      item.eventId,
      event,
      window.fromMysql,
      window.toMysql
    );
    const tiers = Array.isArray(insights.tiers)
      ? insights.tiers
          .filter((t) => (Number(t.tickets_sold) || 0) > 0 || (Number(t.gross_revenue) || 0) > 0)
          .map((t) => ({
            name: t.level_name || "Tier",
            tickets: Number(t.tickets_sold) || 0,
            revenue: Number(t.gross_revenue) || 0
          }))
      : [];

    events.push({
      title: item.title,
      accessLabel: item.accessLabel,
      isPlatform: true,
      bookings: Number(insights.total_bookings) || 0,
      attendees: Number(insights.total_attendees) || 0,
      revenue: Number(insights.gross_revenue) || 0,
      paidBookings: Number(insights.paid_bookings) || 0,
      freeBookings: Number(insights.free_bookings) || 0,
      tiers
    });
  }

  events.sort((a, b) => String(a.title).localeCompare(String(b.title), "en", { sensitivity: "base" }));
  return events;
}

async function sendWeeklySummaryForUser(user, window) {
  const events = await buildEventSummariesForUser(user.id, window);
  if (!events.length) {
    return { skipped: true, reason: "no_events" };
  }

  const totals = events.reduce(
    (acc, ev) => {
      if (ev.isPlatform) {
        acc.bookings += Number(ev.bookings) || 0;
        acc.attendees += Number(ev.attendees) || 0;
        acc.revenue += Number(ev.revenue) || 0;
      }
      return acc;
    },
    { events: events.length, bookings: 0, attendees: 0, revenue: 0 }
  );

  const { subject, text, html } = buildWeeklyOrganizerSummaryEmail({
    recipientName: String(user.name || "").split(/\s+/)[0] || user.name || "there",
    weekLabel: window.weekLabel,
    timezoneLabel: window.timezoneLabel,
    totals,
    events
  });

  await sendTransactionalEmail({
    to: user.email,
    subject,
    text,
    html
  });

  return { skipped: false, eventCount: events.length, bookings: totals.bookings };
}

/**
 * Send one weekly digest per eligible user (owners + accepted share recipients).
 */
async function runWeeklyOrganizerSummary({ force = false } = {}) {
  if (!isBrevoConfigured() && !force) {
    return { ok: false, reason: "brevo_not_configured", sent: 0 };
  }

  const window = getPreviousWeekWindow();
  const recipients = await listWeeklySummaryRecipients();
  let sent = 0;
  let skipped = 0;
  const errors = [];

  for (const user of recipients) {
    try {
      const result = await sendWeeklySummaryForUser(user, window);
      if (result.skipped) {
        skipped += 1;
      } else {
        sent += 1;
      }
    } catch (err) {
      errors.push({ userId: user.id, message: err?.message || String(err) });
    }
  }

  return {
    ok: true,
    weekLabel: window.weekLabel,
    fromMysql: window.fromMysql,
    toMysql: window.toMysql,
    recipients: recipients.length,
    sent,
    skipped,
    errors
  };
}

function startWeeklyOrganizerSummaryJob() {
  if (global.__weeklyOrganizerSummaryJobStarted) {
    return;
  }
  global.__weeklyOrganizerSummaryJobStarted = true;

  const enabled = String(process.env.WEEKLY_SUMMARY_ENABLED || "true").toLowerCase() !== "false";
  if (!enabled) {
    // eslint-disable-next-line no-console
    console.log("[weekly-summary] Disabled via WEEKLY_SUMMARY_ENABLED=false");
    return;
  }

  const timeZone = getAppTimeZone() || getGaReportingTimezone();
  // Default Monday 09:00 in APP_TIMEZONE
  const targetWeekday = String(process.env.WEEKLY_SUMMARY_WEEKDAY || "Mon");
  const targetHour = Number(process.env.WEEKLY_SUMMARY_HOUR || 9);
  const checkEveryMs = Number(process.env.WEEKLY_SUMMARY_CHECK_MS || 15 * 60 * 1000);

  const runIfDue = async () => {
    try {
      if (!isBrevoConfigured()) {
        return;
      }
      const now = new Date();
      const parts = formatPartsInTz(now, timeZone);
      const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now);
      const hour = Number(parts.hour);
      const dateKey = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;

      if (weekday !== targetWeekday || hour !== targetHour) {
        return;
      }
      if (global.__weeklyOrganizerSummaryLastRunDate === dateKey) {
        return;
      }
      global.__weeklyOrganizerSummaryLastRunDate = dateKey;

      // eslint-disable-next-line no-console
      console.log(`[weekly-summary] Running digest for week ending ${dateKey} (${timeZone})`);
      const result = await runWeeklyOrganizerSummary();
      // eslint-disable-next-line no-console
      console.log(
        `[weekly-summary] Done sent=${result.sent} skipped=${result.skipped} errors=${result.errors?.length || 0}`
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[weekly-summary] Job failed:", err?.message || err);
    }
  };

  // Delay first check slightly so boot is not blocked.
  setTimeout(() => {
    runIfDue().catch(() => {});
  }, 20_000);

  setInterval(() => {
    runIfDue().catch(() => {});
  }, checkEveryMs);

  // eslint-disable-next-line no-console
  console.log(
    `[weekly-summary] Scheduled (${targetWeekday} ${targetHour}:00 ${timeZone}, check every ${Math.round(checkEveryMs / 60000)}m)`
  );
}

module.exports = {
  getPreviousWeekWindow,
  listWeeklySummaryRecipients,
  buildEventSummariesForUser,
  sendWeeklySummaryForUser,
  runWeeklyOrganizerSummary,
  startWeeklyOrganizerSummaryJob
};
