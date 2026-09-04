const { pool } = require("../config/db");

const HOLD_MINUTES = 5;
const GUEST_SCHEMA_CACHE_MS = 60_000;
let guestCouponSchemaReady = null;
let guestCouponSchemaCheckedAt = 0;

function normalizeGuestEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeCouponCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

async function purgeExpiredHolds(conn) {
  const runner = conn || pool;
  await runner.query(`DELETE FROM event_coupon_holds WHERE expires_at < NOW()`);
}

async function isGuestCouponSchemaReady(conn) {
  const now = Date.now();
  if (guestCouponSchemaReady != null && now - guestCouponSchemaCheckedAt < GUEST_SCHEMA_CACHE_MS) {
    return guestCouponSchemaReady;
  }
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT COUNT(*) AS n
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'event_coupon_holds'
       AND column_name = 'guest_email'`
  );
  guestCouponSchemaReady = Number(rows[0]?.n || 0) > 0;
  guestCouponSchemaCheckedAt = now;
  return guestCouponSchemaReady;
}

async function countActiveHoldsForCoupon(couponId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT COUNT(*) AS c FROM event_coupon_holds WHERE coupon_id = ? AND expires_at >= NOW()`,
    [couponId]
  );
  return Number(rows[0]?.c || 0);
}

async function countActiveHoldsForCouponUser(couponId, userId, excludeHoldId, conn) {
  const runner = conn || pool;
  const values = [couponId, userId];
  let exclude = "";
  if (excludeHoldId) {
    exclude = " AND id <> ?";
    values.push(excludeHoldId);
  }
  const [rows] = await runner.query(
    `SELECT COUNT(*) AS c FROM event_coupon_holds
     WHERE coupon_id = ? AND user_id = ? AND expires_at >= NOW()${exclude}`,
    values
  );
  return Number(rows[0]?.c || 0);
}

async function countRedemptionsForCouponUser(couponId, userId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT COUNT(*) AS c FROM event_coupon_redemptions WHERE coupon_id = ? AND user_id = ?`,
    [couponId, userId]
  );
  return Number(rows[0]?.c || 0);
}

async function countActiveHoldsForCouponGuest(couponId, guestEmail, excludeHoldId, conn) {
  const email = normalizeGuestEmail(guestEmail);
  if (!email) {
    return 0;
  }
  const runner = conn || pool;
  const values = [couponId, email];
  let exclude = "";
  if (excludeHoldId) {
    exclude = " AND id <> ?";
    values.push(excludeHoldId);
  }
  const [rows] = await runner.query(
    `SELECT COUNT(*) AS c FROM event_coupon_holds
     WHERE coupon_id = ? AND guest_email = ? AND user_id IS NULL AND expires_at >= NOW()${exclude}`,
    values
  );
  return Number(rows[0]?.c || 0);
}

async function countRedemptionsForCouponGuestEmail(couponId, guestEmail, conn) {
  const email = normalizeGuestEmail(guestEmail);
  if (!email) {
    return 0;
  }
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT COUNT(*) AS c
     FROM event_coupon_redemptions r
     INNER JOIN event_bookings b ON b.id = r.booking_id
     WHERE r.coupon_id = ? AND LOWER(TRIM(b.email)) = ?`,
    [couponId, email]
  );
  return Number(rows[0]?.c || 0);
}

async function findCouponByOrganizerAndCode(organizerId, code, conn) {
  const runner = conn || pool;
  const normalized = normalizeCouponCode(code);
  const [rows] = await runner.query(
    `SELECT * FROM event_coupons WHERE organizer_id = ? AND code = ? LIMIT 1`,
    [organizerId, normalized]
  );
  return rows[0] || null;
}

async function findCouponByIdForOrganizer(couponId, organizerId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT * FROM event_coupons WHERE id = ? AND organizer_id = ? LIMIT 1`,
    [couponId, organizerId]
  );
  return rows[0] || null;
}

async function listCouponEventIds(couponId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(`SELECT event_id FROM event_coupon_events WHERE coupon_id = ?`, [couponId]);
  return rows.map((r) => Number(r.event_id));
}

async function couponAppliesToEvent(coupon, eventId, conn) {
  if (coupon.scope === "all_events") {
    return true;
  }
  const ids = await listCouponEventIds(coupon.id, conn);
  return ids.includes(Number(eventId));
}

async function listCouponsByOrganizer(organizerId) {
  const [rows] = await pool.query(
    `SELECT c.*,
            (SELECT COUNT(*) FROM event_coupon_holds h WHERE h.coupon_id = c.id AND h.expires_at >= NOW()) AS active_holds
     FROM event_coupons c
     WHERE c.organizer_id = ?
     ORDER BY c.created_at DESC`,
    [organizerId]
  );

  const coupons = [];
  for (const row of rows) {
    const eventIds = row.scope === "specific_events" ? await listCouponEventIds(row.id) : [];
    coupons.push({
      ...row,
      event_ids: eventIds,
      active_holds: Number(row.active_holds || 0)
    });
  }
  return coupons;
}

async function replaceCouponEvents(couponId, eventIds, conn) {
  const runner = conn || pool;
  await runner.query(`DELETE FROM event_coupon_events WHERE coupon_id = ?`, [couponId]);
  if (!eventIds.length) {
    return;
  }
  const values = eventIds.map((eventId) => [couponId, eventId]);
  await runner.query(`INSERT INTO event_coupon_events (coupon_id, event_id) VALUES ?`, [values]);
}

async function createCoupon(payload, conn) {
  const runner = conn || pool;
  const [result] = await runner.query(
    `INSERT INTO event_coupons
      (organizer_id, code, discount_type, discount_value, scope, starts_at, ends_at, is_active,
       max_redemptions, max_redemptions_per_user, min_ticket_count, min_order_amount, max_discount_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.organizer_id,
      normalizeCouponCode(payload.code),
      payload.discount_type,
      payload.discount_value,
      payload.scope,
      payload.starts_at,
      payload.ends_at,
      payload.is_active ? 1 : 0,
      payload.max_redemptions,
      payload.max_redemptions_per_user,
      payload.min_ticket_count,
      payload.min_order_amount,
      payload.max_discount_amount
    ]
  );
  const couponId = result.insertId;
  if (payload.scope === "specific_events" && payload.event_ids?.length) {
    await replaceCouponEvents(couponId, payload.event_ids, runner);
  }
  return couponId;
}

async function updateCoupon(couponId, payload, conn) {
  const runner = conn || pool;
  await runner.query(
    `UPDATE event_coupons SET
      code = ?,
      discount_type = ?,
      discount_value = ?,
      scope = ?,
      starts_at = ?,
      ends_at = ?,
      is_active = ?,
      max_redemptions = ?,
      max_redemptions_per_user = ?,
      min_ticket_count = ?,
      min_order_amount = ?,
      max_discount_amount = ?
     WHERE id = ?`,
    [
      normalizeCouponCode(payload.code),
      payload.discount_type,
      payload.discount_value,
      payload.scope,
      payload.starts_at,
      payload.ends_at,
      payload.is_active ? 1 : 0,
      payload.max_redemptions,
      payload.max_redemptions_per_user,
      payload.min_ticket_count,
      payload.min_order_amount,
      payload.max_discount_amount,
      couponId
    ]
  );
  await runner.query(`DELETE FROM event_coupon_events WHERE coupon_id = ?`, [couponId]);
  if (payload.scope === "specific_events" && payload.event_ids?.length) {
    await replaceCouponEvents(couponId, payload.event_ids, runner);
  }
}

async function setCouponActive(couponId, isActive, conn) {
  const runner = conn || pool;
  await runner.query(`UPDATE event_coupons SET is_active = ? WHERE id = ?`, [isActive ? 1 : 0, couponId]);
}

async function deleteCouponById(couponId, conn) {
  const runner = conn || pool;
  await runner.query(`DELETE FROM event_coupons WHERE id = ?`, [couponId]);
}

async function createHold(payload, conn) {
  const runner = conn || pool;
  await runner.query(
    `INSERT INTO event_coupon_holds
      (coupon_id, user_id, guest_email, event_id, hold_token, attendee_count, selected_dates_json,
       subtotal_amount, discount_amount, total_amount, hold_kind, applied_code, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [
      payload.coupon_id ?? null,
      payload.user_id ?? null,
      payload.guest_email ? normalizeGuestEmail(payload.guest_email) : null,
      payload.event_id,
      payload.hold_token,
      payload.attendee_count,
      payload.selected_dates_json,
      payload.subtotal_amount,
      payload.discount_amount,
      payload.total_amount,
      payload.hold_kind === "vendor" ? "vendor" : "coupon",
      payload.applied_code ? String(payload.applied_code).trim().toUpperCase().slice(0, 40) : null,
      HOLD_MINUTES
    ]
  );
}

async function deleteHoldsForUserCouponEvent(userId, couponId, eventId, conn) {
  const runner = conn || pool;
  await runner.query(
    `DELETE FROM event_coupon_holds WHERE user_id = ? AND coupon_id = ? AND event_id = ?`,
    [userId, couponId, eventId]
  );
}

async function deleteVendorHoldsForUserEvent(userId, eventId, conn) {
  const runner = conn || pool;
  await runner.query(
    `DELETE FROM event_coupon_holds
     WHERE user_id = ? AND event_id = ? AND COALESCE(hold_kind, 'coupon') = 'vendor'`,
    [userId, eventId]
  );
}

async function deleteAllHoldsForUserEvent(userId, eventId, conn) {
  const runner = conn || pool;
  await runner.query(`DELETE FROM event_coupon_holds WHERE user_id = ? AND event_id = ?`, [
    userId,
    eventId
  ]);
}

async function deleteAllHoldsForGuestEvent(guestEmail, eventId, conn) {
  const email = normalizeGuestEmail(guestEmail);
  if (!email) {
    return;
  }
  const runner = conn || pool;
  await runner.query(
    `DELETE FROM event_coupon_holds WHERE guest_email = ? AND user_id IS NULL AND event_id = ?`,
    [email, eventId]
  );
}

async function deleteAllHoldsForIdentityEvent(identity, eventId, conn) {
  if (identity?.userId) {
    await deleteAllHoldsForUserEvent(identity.userId, eventId, conn);
    return;
  }
  await deleteAllHoldsForGuestEvent(identity?.guestEmail, eventId, conn);
}

async function findActiveHoldForCouponEvent(identity, couponId, eventId, conn) {
  const runner = conn || pool;
  if (identity?.userId) {
    return findActiveHoldForUserCouponEvent(identity.userId, couponId, eventId, conn);
  }
  const email = normalizeGuestEmail(identity?.guestEmail);
  if (!email) {
    return null;
  }
  const [rows] = await runner.query(
    `SELECT * FROM event_coupon_holds
     WHERE guest_email = ? AND user_id IS NULL AND coupon_id = ? AND event_id = ? AND expires_at >= NOW()
     ORDER BY id DESC
     LIMIT 1`,
    [email, couponId, eventId]
  );
  return rows[0] || null;
}

async function findActiveVendorHoldForUserEvent(userId, eventId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT * FROM event_coupon_holds
     WHERE user_id = ? AND event_id = ? AND COALESCE(hold_kind, 'coupon') = 'vendor' AND expires_at >= NOW()
     ORDER BY id DESC
     LIMIT 1`,
    [userId, eventId]
  );
  return rows[0] || null;
}

async function findHoldByToken(holdToken, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(`SELECT * FROM event_coupon_holds WHERE hold_token = ? LIMIT 1`, [holdToken]);
  return rows[0] || null;
}

/** Active = not past expires_at (compare in DB; avoids JS/MySQL timezone skew). */
async function findActiveHoldByToken(holdToken, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT * FROM event_coupon_holds WHERE hold_token = ? AND expires_at >= NOW() LIMIT 1`,
    [holdToken]
  );
  return rows[0] || null;
}

async function findActiveHoldForUserCouponEvent(userId, couponId, eventId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT * FROM event_coupon_holds
     WHERE user_id = ? AND coupon_id = ? AND event_id = ? AND expires_at >= NOW()
     ORDER BY id DESC
     LIMIT 1`,
    [userId, couponId, eventId]
  );
  return rows[0] || null;
}

async function updateHoldPricing(
  holdId,
  { attendee_count, selected_dates_json, subtotal_amount, discount_amount, total_amount },
  conn
) {
  const runner = conn || pool;
  await runner.query(
    `UPDATE event_coupon_holds
     SET attendee_count = ?,
         selected_dates_json = ?,
         subtotal_amount = ?,
         discount_amount = ?,
         total_amount = ?
     WHERE id = ?`,
    [
      attendee_count,
      selected_dates_json,
      subtotal_amount,
      discount_amount,
      total_amount,
      holdId
    ]
  );
}

/** Extend hold while customer completes Stripe checkout (minutes). */
async function extendHoldExpiry(holdToken, extraMinutes, conn) {
  const runner = conn || pool;
  await runner.query(
    `UPDATE event_coupon_holds
     SET expires_at = DATE_ADD(GREATEST(expires_at, NOW()), INTERVAL ? MINUTE)
     WHERE hold_token = ?`,
    [extraMinutes, holdToken]
  );
}

async function deleteHoldByToken(holdToken, conn) {
  const runner = conn || pool;
  await runner.query(`DELETE FROM event_coupon_holds WHERE hold_token = ?`, [holdToken]);
}

async function incrementCouponRedemption(couponId, conn) {
  const runner = conn || pool;
  await runner.query(`UPDATE event_coupons SET redemption_count = redemption_count + 1 WHERE id = ?`, [couponId]);
}

async function insertRedemption({ couponId, userId, bookingId }, conn) {
  const runner = conn || pool;
  await runner.query(
    `INSERT INTO event_coupon_redemptions (coupon_id, user_id, booking_id) VALUES (?, ?, ?)`,
    [couponId, userId, bookingId]
  );
}

async function getCouponRedemptionCount(couponId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(`SELECT redemption_count FROM event_coupons WHERE id = ?`, [couponId]);
  return Number(rows[0]?.redemption_count || 0);
}

/** Active organizer coupons that apply to a platform event (for public checkout visibility). */
async function countActiveCouponsForEvent(eventId, organizerId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT COUNT(*) AS c
     FROM event_coupons c
     WHERE c.organizer_id = ?
       AND c.is_active = 1
       AND (
         c.scope = 'all_events'
         OR EXISTS (
           SELECT 1 FROM event_coupon_events ce
           WHERE ce.coupon_id = c.id AND ce.event_id = ?
         )
       )`,
    [organizerId, eventId]
  );
  return Number(rows[0]?.c || 0);
}

module.exports = {
  HOLD_MINUTES,
  normalizeCouponCode,
  purgeExpiredHolds,
  countActiveHoldsForCoupon,
  countActiveHoldsForCouponUser,
  countRedemptionsForCouponUser,
  findCouponByOrganizerAndCode,
  findCouponByIdForOrganizer,
  listCouponEventIds,
  couponAppliesToEvent,
  listCouponsByOrganizer,
  createCoupon,
  updateCoupon,
  setCouponActive,
  deleteCouponById,
  createHold,
  deleteHoldsForUserCouponEvent,
  deleteVendorHoldsForUserEvent,
  deleteAllHoldsForUserEvent,
  findActiveVendorHoldForUserEvent,
  findHoldByToken,
  findActiveHoldByToken,
  findActiveHoldForUserCouponEvent,
  updateHoldPricing,
  extendHoldExpiry,
  deleteHoldByToken,
  incrementCouponRedemption,
  insertRedemption,
  getCouponRedemptionCount,
  countActiveCouponsForEvent,
  isGuestCouponSchemaReady,
  normalizeGuestEmail,
  countActiveHoldsForCouponGuest,
  countRedemptionsForCouponGuestEmail,
  deleteAllHoldsForGuestEvent,
  deleteAllHoldsForIdentityEvent,
  findActiveHoldForCouponEvent
};
