const crypto = require("crypto");
const { pool } = require("../config/db");
const {
  getGaReportingTimezone,
  getCalendarDateString,
  getCurrentHour,
  getTimezoneShortLabel,
  isValidCalendarDateString,
  listHourlyDateOptions,
  getZonedDayMysqlBounds,
  getCalendarDateForInstant,
  getZonedParts,
  parseMysqlUtcDatetime
} = require("../utils/gaReportingTimezone");

function newInviteToken() {
  return crypto.randomUUID();
}

function normalizeVendorCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 40);
}

function generateVendorCode() {
  const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `V${raw}`.slice(0, 12);
}

/** Accepted + not revoked — grants vendor dashboard access. */
async function findAcceptedShare(eventId, sharedWithUserId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT *
     FROM event_vendor_shares
     WHERE event_id = ?
       AND shared_with_user_id = ?
       AND revoked_at IS NULL
       AND status = 'accepted'
     LIMIT 1`,
    [eventId, sharedWithUserId]
  );
  return rows[0] || null;
}

async function hasActiveVendorShare(eventId, sharedWithUserId, conn) {
  const row = await findAcceptedShare(eventId, sharedWithUserId, conn);
  return Boolean(row);
}

async function findShareByCode(eventId, vendorCode, conn) {
  const runner = conn || pool;
  const code = normalizeVendorCode(vendorCode);
  if (!code) {
    return null;
  }
  const [rows] = await runner.query(
    `SELECT *
     FROM event_vendor_shares
     WHERE event_id = ?
       AND vendor_code = ?
     ORDER BY (revoked_at IS NULL) DESC, id DESC
     LIMIT 1`,
    [eventId, code]
  );
  return rows[0] || null;
}

/** Organizer list includes revoked rows for history. */
async function listSharesForEvent(eventId, ownerUserId, { includeRevoked = true } = {}, conn) {
  const runner = conn || pool;
  const revokedClause = includeRevoked ? "" : "AND s.revoked_at IS NULL";
  const [rows] = await runner.query(
    `SELECT
       s.id,
       s.event_id,
       s.owner_user_id,
       s.shared_with_user_id,
       s.shared_with_email,
       s.vendor_code,
       s.status,
       s.invite_token,
       s.accepted_at,
       s.created_at,
       s.revoked_at,
       u.name AS shared_with_name,
       u.email AS shared_with_user_email
     FROM event_vendor_shares s
     LEFT JOIN users u ON u.id = s.shared_with_user_id
     WHERE s.event_id = ?
       AND s.owner_user_id = ?
       ${revokedClause}
     ORDER BY (s.revoked_at IS NULL) DESC, s.created_at DESC`,
    [eventId, ownerUserId]
  );
  return rows;
}

/** Accepted shares for the partner dashboard. */
async function listSharedEventsForUser(sharedWithUserId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT
       s.id AS share_id,
       s.status,
       s.vendor_code,
       s.accepted_at,
       s.created_at AS shared_at,
       e.id AS event_id,
       e.title,
       e.status AS event_status,
       e.ticket_sales_mode,
       e.event_date,
       e.image_url,
       e.public_slug,
       owner.id AS owner_user_id,
       owner.name AS owner_name,
       owner.email AS owner_email
     FROM event_vendor_shares s
     INNER JOIN events e ON e.id = s.event_id
     INNER JOIN users owner ON owner.id = s.owner_user_id
     WHERE s.shared_with_user_id = ?
       AND s.revoked_at IS NULL
       AND s.status = 'accepted'
     ORDER BY s.created_at DESC`,
    [sharedWithUserId]
  );
  return rows;
}

/** Events the user owns that have at least one vendor share (for My shares). */
async function listOwnedEventsWithShares(ownerUserId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT
       e.id AS event_id,
       e.title,
       e.public_slug,
       e.image_url,
       e.event_date,
       COUNT(s.id) AS share_count,
       SUM(CASE WHEN s.revoked_at IS NULL AND s.status = 'accepted' THEN 1 ELSE 0 END) AS active_count
     FROM events e
     INNER JOIN event_vendor_shares s ON s.event_id = e.id AND s.owner_user_id = e.organizer_id
     WHERE e.organizer_id = ?
     GROUP BY e.id, e.title, e.public_slug, e.image_url, e.event_date
     ORDER BY e.event_date DESC, e.id DESC`,
    [ownerUserId]
  );
  return rows;
}

async function createShare(
  { eventId, ownerUserId, sharedWithUserId, sharedWithEmail, vendorCode, inviteToken },
  conn
) {
  const runner = conn || pool;
  const token = inviteToken || newInviteToken();
  const code = normalizeVendorCode(vendorCode) || generateVendorCode();

  const [existing] = await runner.query(
    `SELECT id, revoked_at, status, invite_token, vendor_code
     FROM event_vendor_shares
     WHERE event_id = ? AND shared_with_user_id = ?
     LIMIT 1`,
    [eventId, sharedWithUserId]
  );

  if (existing[0]) {
    if (existing[0].revoked_at == null && existing[0].status === "accepted") {
      return {
        id: existing[0].id,
        alreadyExists: true,
        status: "accepted",
        vendorCode: existing[0].vendor_code,
        inviteToken: existing[0].invite_token
      };
    }
    if (existing[0].revoked_at == null && existing[0].status === "pending") {
      const nextToken = existing[0].invite_token || token;
      if (!existing[0].invite_token) {
        await runner.query(`UPDATE event_vendor_shares SET invite_token = ? WHERE id = ?`, [
          nextToken,
          existing[0].id
        ]);
      }
      return {
        id: existing[0].id,
        alreadyExists: true,
        status: "pending",
        vendorCode: existing[0].vendor_code,
        inviteToken: nextToken,
        resent: true
      };
    }
    // Reactivate revoked share — keep prior code unless a new one was supplied.
    const nextCode = normalizeVendorCode(vendorCode) || existing[0].vendor_code || code;
    await runner.query(
      `UPDATE event_vendor_shares
       SET revoked_at = NULL,
           owner_user_id = ?,
           shared_with_email = ?,
           vendor_code = ?,
           status = 'pending',
           invite_token = ?,
           accepted_at = NULL,
           created_at = NOW()
       WHERE id = ?`,
      [ownerUserId, sharedWithEmail, nextCode, token, existing[0].id]
    );
    return {
      id: existing[0].id,
      alreadyExists: false,
      status: "pending",
      vendorCode: nextCode,
      inviteToken: token,
      reactivated: true
    };
  }

  // Ensure code uniqueness for this event.
  let finalCode = code;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [codeRows] = await runner.query(
      `SELECT id FROM event_vendor_shares WHERE event_id = ? AND vendor_code = ? LIMIT 1`,
      [eventId, finalCode]
    );
    if (!codeRows[0]) {
      break;
    }
    finalCode = generateVendorCode();
  }

  const [result] = await runner.query(
    `INSERT INTO event_vendor_shares
      (event_id, owner_user_id, shared_with_user_id, shared_with_email, vendor_code, status, invite_token, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, NOW())`,
    [eventId, ownerUserId, sharedWithUserId, sharedWithEmail, finalCode, token]
  );
  return {
    id: result.insertId,
    alreadyExists: false,
    status: "pending",
    vendorCode: finalCode,
    inviteToken: token
  };
}

async function findShareByIdForOwner(shareId, ownerUserId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT *
     FROM event_vendor_shares
     WHERE id = ? AND owner_user_id = ?
     LIMIT 1`,
    [shareId, ownerUserId]
  );
  return rows[0] || null;
}

async function findShareByInviteToken(inviteToken, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT *
     FROM event_vendor_shares
     WHERE invite_token = ? AND revoked_at IS NULL
     LIMIT 1`,
    [String(inviteToken || "").trim()]
  );
  return rows[0] || null;
}

async function acceptShareByToken({ inviteToken, userId }, conn) {
  const runner = conn || pool;
  const share = await findShareByInviteToken(inviteToken, runner);
  if (!share) {
    return null;
  }
  if (Number(share.shared_with_user_id) !== Number(userId)) {
    const err = new Error("FORBIDDEN");
    err.code = "FORBIDDEN";
    throw err;
  }
  if (share.status === "accepted") {
    return { ...share, alreadyAccepted: true };
  }
  await runner.query(
    `UPDATE event_vendor_shares
     SET status = 'accepted', accepted_at = NOW()
     WHERE id = ? AND revoked_at IS NULL`,
    [share.id]
  );
  return { ...share, status: "accepted", alreadyAccepted: false };
}

async function revokeShare(shareId, ownerUserId, conn) {
  const runner = conn || pool;
  const [result] = await runner.query(
    `UPDATE event_vendor_shares
     SET revoked_at = NOW()
     WHERE id = ? AND owner_user_id = ? AND revoked_at IS NULL`,
    [shareId, ownerUserId]
  );
  return result.affectedRows > 0;
}

/**
 * Record every partner-link open as a visit.
 * Unique visitors are derived separately via DISTINCT session_key.
 */
async function recordLinkHit(
  { eventId, vendorCode, shareId = null, sessionKey, path = null, userAgent = null },
  conn
) {
  const runner = conn || pool;
  const code = normalizeVendorCode(vendorCode);
  const session = String(sessionKey || "").trim().slice(0, 64);
  if (!code || !session) {
    return { recorded: false, skipped: true };
  }

  await runner.query(
    `INSERT INTO event_vendor_link_hits
      (event_id, vendor_code, share_id, session_key, path, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      eventId,
      code,
      shareId || null,
      session,
      path ? String(path).slice(0, 255) : null,
      userAgent ? String(userAgent).slice(0, 255) : null
    ]
  );
  await touchLinkPresence(
    { eventId, vendorCode: code, shareId, sessionKey: session },
    runner
  );
  return { recorded: true };
}

/** Upsert live presence for a partner-link session (does not count as a visit). */
async function touchLinkPresence(
  { eventId, vendorCode, shareId = null, sessionKey },
  conn
) {
  const runner = conn || pool;
  const code = normalizeVendorCode(vendorCode);
  const session = String(sessionKey || "").trim().slice(0, 64);
  if (!code || !session) {
    return { touched: false };
  }
  try {
    await runner.query(
      `INSERT INTO event_vendor_link_presence
        (event_id, vendor_code, share_id, session_key, last_seen_at, created_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         last_seen_at = NOW(),
         share_id = COALESCE(VALUES(share_id), share_id)`,
      [eventId, code, shareId || null, session]
    );
    return { touched: true };
  } catch (err) {
    // Table may not exist yet on a host that has not run the presence migration.
    if (err?.code === "ER_NO_SUCH_TABLE") {
      return { touched: false, missing_table: true };
    }
    throw err;
  }
}

/** Sessions with a heartbeat in the last `windowSeconds` (default 90s). */
async function getLivePresenceCounts(eventId, vendorCode, { windowSeconds = 90 } = {}, conn) {
  const runner = conn || pool;
  const code = normalizeVendorCode(vendorCode);
  const window = Math.max(30, Math.min(Number(windowSeconds) || 90, 300));
  try {
    const [rows] = await runner.query(
      `SELECT
         COUNT(*) AS live_sessions,
         COUNT(*) AS live_hits
       FROM event_vendor_link_presence
       WHERE event_id = ?
         AND vendor_code = ?
         AND last_seen_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)`,
      [eventId, code, window]
    );
    const row = rows[0] || {};
    return {
      live_sessions: Number(row.live_sessions) || 0,
      live_hits: Number(row.live_hits) || 0,
      window_seconds: window
    };
  } catch (err) {
    if (err?.code === "ER_NO_SUCH_TABLE") {
      return { live_sessions: 0, live_hits: 0, window_seconds: window, missing_table: true };
    }
    throw err;
  }
}

async function getHitInsights(eventId, vendorCode, { hourlyDate = null } = {}, conn) {
  const runner = conn || pool;
  const code = normalizeVendorCode(vendorCode);
  const tz = getGaReportingTimezone();
  const tzLabel = getTimezoneShortLabel(tz);
  const todayStr = getCalendarDateString(0, tz);
  const yesterdayStr = getCalendarDateString(-1, tz);
  const rangeStartStr = getCalendarDateString(-29, tz);
  const rangeStartBounds = getZonedDayMysqlBounds(rangeStartStr, tz);
  const todayBounds = getZonedDayMysqlBounds(todayStr, tz);
  const yesterdayBounds = getZonedDayMysqlBounds(yesterdayStr, tz);
  const last7Bounds = getZonedDayMysqlBounds(getCalendarDateString(-6, tz), tz);
  const last30Bounds = rangeStartBounds;

  const [totals] = await runner.query(
    `SELECT
       COUNT(*) AS total_hits,
       COUNT(DISTINCT session_key) AS unique_sessions
     FROM event_vendor_link_hits
     WHERE event_id = ? AND vendor_code = ?`,
    [eventId, code]
  );

  const [windowRows] = await runner.query(
    `SELECT
       SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS hits_today,
       SUM(CASE WHEN created_at >= ? AND created_at < ? THEN 1 ELSE 0 END) AS hits_yesterday,
       SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS hits_last_7_days,
       SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS hits_last_30_days
     FROM event_vendor_link_hits
     WHERE event_id = ? AND vendor_code = ?`,
    [
      todayBounds.fromMysql,
      yesterdayBounds.fromMysql,
      yesterdayBounds.toMysql,
      last7Bounds.fromMysql,
      last30Bounds.fromMysql,
      eventId,
      code
    ]
  );

  const live = await getLivePresenceCounts(eventId, code, { windowSeconds: 90 }, runner);

  const [recentHits] = await runner.query(
    `SELECT created_at, session_key
     FROM event_vendor_link_hits
     WHERE event_id = ?
       AND vendor_code = ?
       AND created_at >= ?
     ORDER BY created_at ASC`,
    [eventId, code, rangeStartBounds.fromMysql]
  );

  const trendMap = new Map();
  for (const hit of recentHits || []) {
    const instant = parseMysqlUtcDatetime(hit.created_at);
    if (!instant) {
      continue;
    }
    const day = getCalendarDateForInstant(instant, tz);
    if (!trendMap.has(day)) {
      trendMap.set(day, { hits: 0, sessions: new Set() });
    }
    const bucket = trendMap.get(day);
    bucket.hits += 1;
    if (hit.session_key) {
      bucket.sessions.add(String(hit.session_key));
    }
  }

  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([day, data]) => ({
      day,
      hits: data.hits,
      sessions: data.sessions.size,
      views: data.hits
    }));

  const availableDates = listHourlyDateOptions(7, tz);
  let selectedDate = hourlyDate ? String(hourlyDate).slice(0, 10) : todayStr;
  if (!isValidCalendarDateString(selectedDate)) {
    selectedDate = todayStr;
  }
  if (!availableDates.some((opt) => opt.date === selectedDate)) {
    selectedDate = todayStr;
  }

  const selectedBounds = getZonedDayMysqlBounds(selectedDate, tz);
  const [dayHits] = await runner.query(
    `SELECT created_at
     FROM event_vendor_link_hits
     WHERE event_id = ?
       AND vendor_code = ?
       AND created_at >= ?
       AND created_at < ?`,
    [eventId, code, selectedBounds.fromMysql, selectedBounds.toMysql]
  );

  const hourMap = new Map();
  for (const hit of dayHits || []) {
    const instant = parseMysqlUtcDatetime(hit.created_at);
    if (!instant) {
      continue;
    }
    const hour = getZonedParts(instant, tz).hour;
    hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
  }

  const currentHour = getCurrentHour(tz);
  const isToday = selectedDate === todayStr;
  const liveHits = Number(live.live_hits) || 0;
  const hourly = Array.from({ length: 24 }, (_, hour) => {
    const is_current_hour = isToday && hour === currentHour;
    const is_future = isToday && hour > currentHour;
    // Hits are written immediately — no GA-style lag. Do not mix presence
    // (live_hits) into visit bars; only mark the current hour as live for styling.
    const views = is_future ? 0 : hourMap.get(hour) || 0;
    return {
      hour,
      views,
      live_realtime: Boolean(is_current_hour && (views > 0 || liveHits > 0)),
      is_current_hour,
      is_future
    };
  });
  const dayTotal = hourly.reduce(
    (sum, row) => (row.is_future ? sum : sum + (Number(row.views) || 0)),
    0
  );

  const totalRow = totals[0] || {};
  const windowRow = windowRows[0] || {};
  return {
    total_hits: Number(totalRow.total_hits) || 0,
    unique_sessions: Number(totalRow.unique_sessions) || 0,
    hits_last_7_days: Number(windowRow.hits_last_7_days) || 0,
    hits_last_30_days: Number(windowRow.hits_last_30_days) || 0,
    hits_today: Number(windowRow.hits_today) || 0,
    hits_yesterday: Number(windowRow.hits_yesterday) || 0,
    live_sessions_30m: Number(live.live_sessions) || 0,
    live_hits_30m: Number(live.live_hits) || 0,
    live_window_seconds: live.window_seconds || 90,
    today_date: todayStr,
    yesterday_date: yesterdayStr,
    reporting_timezone: tz,
    reporting_timezone_label: tzLabel,
    trend,
    hourly_today: hourly,
    hourly_chart: {
      selected_date: selectedDate,
      today_date: todayStr,
      available_dates: availableDates,
      timezone: tz,
      timezone_label: tzLabel,
      is_today: isToday,
      current_hour: currentHour,
      day_total_views: dayTotal
    }
  };
}

async function getBookingInsightsForVendor(eventId, vendorCode, conn) {
  const runner = conn || pool;
  const code = normalizeVendorCode(vendorCode);
  const [rows] = await runner.query(
    `SELECT
       COUNT(*) AS total_bookings,
       COALESCE(SUM(attendee_count), 0) AS total_attendees,
       COALESCE(SUM(CASE WHEN payment_status IN ('paid', 'free') THEN total_amount ELSE 0 END), 0) AS gross_revenue,
       COALESCE(SUM(CASE WHEN payment_status IN ('paid', 'free') THEN discount_amount ELSE 0 END), 0) AS total_discounts,
       SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_bookings,
       SUM(CASE WHEN payment_status = 'free' THEN 1 ELSE 0 END) AS free_bookings,
       SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) AS pending_bookings,
       SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) AS failed_bookings,
       SUM(CASE WHEN created_at >= CURDATE() THEN 1 ELSE 0 END) AS bookings_today,
       SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS bookings_last_7_days
     FROM event_bookings
     WHERE event_id = ?
       AND UPPER(TRIM(vendor_code)) = ?`,
    [eventId, code]
  );
  const [trend] = await runner.query(
    `SELECT DATE(created_at) AS day,
            COUNT(*) AS bookings,
            COALESCE(SUM(attendee_count), 0) AS attendees,
            COALESCE(SUM(CASE WHEN payment_status IN ('paid', 'free') THEN total_amount ELSE 0 END), 0) AS revenue
     FROM event_bookings
     WHERE event_id = ?
       AND UPPER(TRIM(vendor_code)) = ?
       AND created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
     GROUP BY DATE(created_at)
     ORDER BY day ASC`,
    [eventId, code]
  );
  const [tierRows] = await runner.query(
    `SELECT ticket_items_json, attendee_count, total_days, total_amount, subtotal_amount,
            payment_status, created_at
     FROM event_bookings
     WHERE event_id = ?
       AND UPPER(TRIM(vendor_code)) = ?
       AND payment_status IN ('paid', 'free')`,
    [eventId, code]
  );
  const row = rows[0] || {};
  return {
    total_bookings: Number(row.total_bookings) || 0,
    total_attendees: Number(row.total_attendees) || 0,
    gross_revenue: Number(row.gross_revenue) || 0,
    total_discounts: Number(row.total_discounts) || 0,
    paid_bookings: Number(row.paid_bookings) || 0,
    free_bookings: Number(row.free_bookings) || 0,
    pending_bookings: Number(row.pending_bookings) || 0,
    failed_bookings: Number(row.failed_bookings) || 0,
    bookings_today: Number(row.bookings_today) || 0,
    bookings_last_7_days: Number(row.bookings_last_7_days) || 0,
    trend: (trend || []).map((t) => ({
      day: t.day,
      bookings: Number(t.bookings) || 0,
      attendees: Number(t.attendees) || 0,
      revenue: Number(t.revenue) || 0
    })),
    tierRows: tierRows || []
  };
}

async function listBookingsForVendor(eventId, vendorCode, conn) {
  const runner = conn || pool;
  const code = normalizeVendorCode(vendorCode);
  const [rows] = await runner.query(
    `SELECT
       eb.id,
       eb.event_id,
       eb.organizer_id,
       eb.user_id,
       eb.is_guest_booking,
       eb.name,
       eb.email,
       eb.phone,
       eb.attendee_count,
       eb.ticket_items_json,
       eb.booking_date,
       eb.selected_dates_json,
       eb.selected_seats_json,
       eb.total_days,
       eb.total_amount,
       eb.subtotal_amount,
       eb.discount_amount,
       eb.coupon_code,
       eb.vendor_code,
       eb.payment_status,
       eb.amount_paid_cents,
       eb.currency,
       eb.paid_at,
       eb.check_in_code,
       eb.created_at,
       e.title AS event_title
     FROM event_bookings eb
     INNER JOIN events e ON e.id = eb.event_id
     WHERE eb.event_id = ?
       AND UPPER(TRIM(eb.vendor_code)) = ?
     ORDER BY eb.created_at DESC`,
    [eventId, code]
  );
  return rows;
}

module.exports = {
  newInviteToken,
  normalizeVendorCode,
  generateVendorCode,
  findAcceptedShare,
  hasActiveVendorShare,
  findShareByCode,
  listSharesForEvent,
  listSharedEventsForUser,
  listOwnedEventsWithShares,
  createShare,
  findShareByIdForOwner,
  findShareByInviteToken,
  acceptShareByToken,
  revokeShare,
  recordLinkHit,
  touchLinkPresence,
  getLivePresenceCounts,
  getHitInsights,
  getBookingInsightsForVendor,
  listBookingsForVendor
};
