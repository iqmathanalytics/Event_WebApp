const { pool } = require("../config/db");

function isMissingColumnError(err) {
  if (!err) {
    return false;
  }
  if (err.errno === 1054 || err.code === "ER_BAD_FIELD_ERROR") {
    return true;
  }
  const msg = String(err.message || "");
  return /unknown column/i.test(msg);
}

function isDuplicateKeyError(err) {
  if (!err) {
    return false;
  }
  if (err.errno === 1062 || err.code === "ER_DUP_ENTRY") {
    return true;
  }
  return /duplicate entry/i.test(String(err.message || ""));
}

/** Remove extra rows for the same email; keep the row with keepId (lowest id after ORDER BY id). */
async function deleteOtherNewsletterRowsForEmail(normalizedEmail, keepId) {
  const e = String(normalizedEmail || "")
    .trim()
    .toLowerCase();
  const kid = Number(keepId);
  if (!e || !Number.isFinite(kid) || kid <= 0) {
    return;
  }
  await pool.query(`DELETE FROM newsletter_subscribers WHERE LOWER(TRIM(email)) = ? AND id != ?`, [e, kid]);
}

/**
 * Legacy table (no guest columns): only email + city_id + flags.
 */
async function subscribeNewsletterLegacy({ email, cityId }) {
  const e = String(email).toLowerCase();
  const cid = cityId || null;

  const [rows] = await pool.query(
    `SELECT id FROM newsletter_subscribers WHERE email = ? ORDER BY id ASC LIMIT 1`,
    [e]
  );

  if (rows.length > 0) {
    await pool.query(
      `UPDATE newsletter_subscribers SET is_active = 1, unsubscribed_at = NULL, city_id = ?
       WHERE id = ?`,
      [cid, rows[0].id]
    );
    await deleteOtherNewsletterRowsForEmail(e, rows[0].id);
    return true;
  }

  try {
    const [insertRes] = await pool.query(
      `INSERT INTO newsletter_subscribers (email, city_id, is_active, subscribed_at, created_at)
       VALUES (?, ?, 1, NOW(), NOW())`,
      [e, cid]
    );
    if (insertRes.insertId) {
      await deleteOtherNewsletterRowsForEmail(e, insertRes.insertId);
    }
    return true;
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const [dup] = await pool.query(
        `SELECT id FROM newsletter_subscribers WHERE email = ? ORDER BY id ASC LIMIT 1`,
        [e]
      );
      if (dup.length > 0) {
        await pool.query(
          `UPDATE newsletter_subscribers SET is_active = 1, unsubscribed_at = NULL, city_id = ?
           WHERE id = ?`,
          [cid, dup[0].id]
        );
        await deleteOtherNewsletterRowsForEmail(e, dup[0].id);
      }
      return true;
    }
    throw err;
  }
}

async function subscribeNewsletterFull({ email, cityId, firstName, lastName, interestsNote }) {
  const e = String(email).toLowerCase();
  const fn = firstName != null && String(firstName).trim() !== "" ? String(firstName).trim() : null;
  const ln = lastName != null && String(lastName).trim() !== "" ? String(lastName).trim() : null;
  const intn =
    interestsNote != null && String(interestsNote).trim() !== ""
      ? String(interestsNote).trim().slice(0, 500)
      : null;
  const cid = cityId || null;

  // One row per email: merge into existing row (any city_id) so guest signups + later logged-in subscribe never duplicate.
  const [existing] = await pool.query(
    `SELECT id FROM newsletter_subscribers WHERE email = ? ORDER BY id ASC LIMIT 1`,
    [e]
  );

  if (existing.length > 0) {
    const keepId = existing[0].id;
    const ok = await reactivateSubscriberById({
      id: keepId,
      email: e,
      cityId: cid,
      firstName: fn,
      lastName: ln,
      interestsNote: intn
    });
    await deleteOtherNewsletterRowsForEmail(e, keepId);
    return ok;
  }

  try {
    const [insertRes] = await pool.query(
      `INSERT INTO newsletter_subscribers (email, first_name, last_name, city_id, interests_note, is_active, subscribed_at, created_at)
       VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [e, fn, ln, cid, intn]
    );
    if (insertRes.insertId) {
      await deleteOtherNewsletterRowsForEmail(e, insertRes.insertId);
    }
    return insertRes.affectedRows > 0;
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const [dup] = await pool.query(
        `SELECT id FROM newsletter_subscribers WHERE email = ? ORDER BY id ASC LIMIT 1`,
        [e]
      );
      if (dup.length > 0) {
        const keepId = dup[0].id;
        const ok = await reactivateSubscriberById({
          id: keepId,
          email: e,
          cityId: cid,
          firstName: fn,
          lastName: ln,
          interestsNote: intn
        });
        await deleteOtherNewsletterRowsForEmail(e, keepId);
        return ok;
      }
    }
    throw err;
  }
}

async function subscribeNewsletter(payload) {
  try {
    return await subscribeNewsletterFull(payload);
  } catch (err) {
    if (isMissingColumnError(err)) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(
          "[newsletterModel] Guest columns missing; using legacy row. Apply sql/newsletter_guest_columns.sql to store names/interests in DB."
        );
      }
      return subscribeNewsletterLegacy(payload);
    }
    throw err;
  }
}

function normalizeNewsletterEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

/** After account creation, force newsletter rows to the same canonical email string as `users.email` (guest vs account casing). */
async function alignNewsletterRowsToCanonicalEmail(canonicalEmail) {
  const e = normalizeNewsletterEmail(canonicalEmail);
  if (!e) {
    return;
  }
  await pool.query(`UPDATE newsletter_subscribers SET email = ? WHERE LOWER(TRIM(email)) = ?`, [e, e]);
}

/** Attach newsletter rows to a user id (guest → account). Safe if `user_id` column not migrated yet. */
async function linkNewsletterSubscriberToUser(userId, canonicalEmail) {
  const uid = Number(userId);
  const e = normalizeNewsletterEmail(canonicalEmail);
  if (!Number.isFinite(uid) || uid <= 0 || !e) {
    return;
  }
  try {
    await pool.query(`UPDATE newsletter_subscribers SET user_id = ? WHERE LOWER(TRIM(email)) = ?`, [uid, e]);
  } catch (err) {
    if (isMissingColumnError(err)) {
      return;
    }
    throw err;
  }
}

/** True if this email already has an active subscription (any city_id). Used for guest signup to avoid duplicate rows. */
async function hasActiveSubscriptionForEmail(email) {
  const e = normalizeNewsletterEmail(email);
  if (!e) {
    return false;
  }
  const [rows] = await pool.query(
    `SELECT id FROM newsletter_subscribers
     WHERE LOWER(TRIM(email)) = ? AND is_active = 1
     LIMIT 1`,
    [e]
  );
  return rows.length > 0;
}

/**
 * Active subscription for this account: join users → newsletter by matching email (guest rows) or user_id.
 * Single INNER JOIN from users avoids orphaned EXISTS edge cases; city_id is not part of the match.
 */
async function hasActiveSubscriptionForUserId(userId) {
  const uid = Number(userId);
  if (!Number.isFinite(uid) || uid <= 0) {
    return false;
  }
  try {
    const [rows] = await pool.query(
      `SELECT 1 AS ok
       FROM users u
       WHERE u.id = ?
         AND EXISTS (
           SELECT 1
           FROM newsletter_subscribers ns
           WHERE ns.is_active = 1
             AND (
               LOWER(TRIM(ns.email)) = LOWER(TRIM(u.email))
               OR ns.user_id = u.id
             )
           LIMIT 1
         )
       LIMIT 1`,
      [uid]
    );
    return rows.length > 0;
  } catch (err) {
    if (!isMissingColumnError(err)) {
      throw err;
    }
    const [rows] = await pool.query(
      `SELECT 1 AS ok
       FROM users u
       WHERE u.id = ?
         AND EXISTS (
           SELECT 1
           FROM newsletter_subscribers ns
           WHERE ns.is_active = 1
             AND LOWER(TRIM(ns.email)) = LOWER(TRIM(u.email))
           LIMIT 1
         )
       LIMIT 1`,
      [uid]
    );
    return rows.length > 0;
  }
}

/** Oldest inactive row for this email (for reactivation instead of inserting a second row). */
async function getFirstInactiveSubscriberIdForEmail(email) {
  const e = normalizeNewsletterEmail(email);
  if (!e) {
    return null;
  }
  const [rows] = await pool.query(
    `SELECT id FROM newsletter_subscribers
     WHERE LOWER(TRIM(email)) = ? AND is_active = 0
     ORDER BY id ASC LIMIT 1`,
    [e]
  );
  return rows[0]?.id ?? null;
}

async function reactivateSubscriberById({ id, email, cityId, firstName, lastName, interestsNote }) {
  const e = String(email || "").toLowerCase();
  const fn = firstName != null && String(firstName).trim() !== "" ? String(firstName).trim() : null;
  const ln = lastName != null && String(lastName).trim() !== "" ? String(lastName).trim() : null;
  const intn =
    interestsNote != null && String(interestsNote).trim() !== ""
      ? String(interestsNote).trim().slice(0, 500)
      : null;
  const cid = cityId || null;

  try {
    const [res] = await pool.query(
      `UPDATE newsletter_subscribers SET
        is_active = 1,
        unsubscribed_at = NULL,
        city_id = ?,
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        interests_note = COALESCE(?, interests_note)
       WHERE id = ? AND email = ?`,
      [cid, fn, ln, intn, id, e]
    );
    return res.affectedRows > 0;
  } catch (err) {
    if (isMissingColumnError(err)) {
      const [res] = await pool.query(
        `UPDATE newsletter_subscribers SET
          is_active = 1,
          unsubscribed_at = NULL,
          city_id = ?
         WHERE id = ? AND email = ?`,
        [cid, id, e]
      );
      return res.affectedRows > 0;
    }
    throw err;
  }
}

async function getActiveSubscription({ email, cityId }) {
  const [rows] = await pool.query(
    `SELECT id, email, city_id, is_active, subscribed_at
     FROM newsletter_subscribers
     WHERE email = ? AND ((city_id IS NULL AND ? IS NULL) OR city_id = ?)
     LIMIT 1`,
    [email, cityId || null, cityId || null]
  );
  return rows[0] || null;
}

const SUBSCRIBER_LIST_BASE_FROM = `
     FROM newsletter_subscribers ns
     LEFT JOIN users u ON u.email = ns.email
     LEFT JOIN user_onboarding_profiles uop ON uop.user_id = u.id
     LEFT JOIN cities c ON c.id = COALESCE(uop.city_id, ns.city_id)`;

/**
 * Select ns + uop names separately; merge in JS so guest (ns) wins over profile and empty uop strings
 * cannot hide ns values (MySQL COALESCE('', ns) would return '').
 */
const NAME_PARTS_NS_UOP = `ns.first_name AS ns_first_name,
            ns.last_name AS ns_last_name,
            uop.first_name AS uop_first_name,
            uop.last_name AS uop_last_name`;

function mergeNewsletterSubscriberNames(row) {
  if (!row || typeof row !== "object") {
    return row;
  }
  const pick = (nsVal, uopVal) => {
    const a = nsVal != null && String(nsVal).trim() !== "" ? String(nsVal).trim() : "";
    const b = uopVal != null && String(uopVal).trim() !== "" ? String(uopVal).trim() : "";
    const merged = a || b;
    return merged === "" ? null : merged;
  };
  const hasParts =
    Object.prototype.hasOwnProperty.call(row, "ns_first_name") ||
    Object.prototype.hasOwnProperty.call(row, "uop_first_name");
  if (!hasParts) {
    return row;
  }
  const first_name = pick(row.ns_first_name, row.uop_first_name);
  const last_name = pick(row.ns_last_name, row.uop_last_name);
  const out = { ...row, first_name, last_name };
  delete out.ns_first_name;
  delete out.ns_last_name;
  delete out.uop_first_name;
  delete out.uop_last_name;
  return out;
}

/** Full row shape: guest names/interests on ns + user profile. */
const LIST_SUBSCRIBERS_SQL_FULL = `SELECT ns.id, ns.email, COALESCE(uop.city_id, ns.city_id) AS city_id, ns.is_active, ns.subscribed_at,
            c.name AS city_name, c.state AS city_state,
            ${NAME_PARTS_NS_UOP},
            uop.mobile_number, uop.interests_json,
            ns.interests_note,
            uop.wants_influencer, uop.wants_deal
     ${SUBSCRIBER_LIST_BASE_FROM}
     ORDER BY ns.subscribed_at DESC`;

/** If interests_note column missing only. */
const LIST_SUBSCRIBERS_SQL_NO_NOTE_COL = `SELECT ns.id, ns.email, COALESCE(uop.city_id, ns.city_id) AS city_id, ns.is_active, ns.subscribed_at,
            c.name AS city_name, c.state AS city_state,
            ${NAME_PARTS_NS_UOP},
            uop.mobile_number, uop.interests_json,
            NULL AS interests_note,
            uop.wants_influencer, uop.wants_deal
     ${SUBSCRIBER_LIST_BASE_FROM}
     ORDER BY ns.subscribed_at DESC`;

/** If ns.first_name / ns.last_name / interests_note not migrated yet (registered users only via uop). */
const LIST_SUBSCRIBERS_SQL_UOP_ONLY = `SELECT ns.id, ns.email, COALESCE(uop.city_id, ns.city_id) AS city_id, ns.is_active, ns.subscribed_at,
            c.name AS city_name, c.state AS city_state,
            NULL AS ns_first_name,
            NULL AS ns_last_name,
            NULLIF(TRIM(uop.first_name), '') AS uop_first_name,
            NULLIF(TRIM(uop.last_name), '') AS uop_last_name,
            uop.mobile_number, uop.interests_json,
            NULL AS interests_note,
            uop.wants_influencer, uop.wants_deal
     ${SUBSCRIBER_LIST_BASE_FROM}
     ORDER BY ns.subscribed_at DESC`;

async function querySubscriberListRows(sqlWithOrder, limit, offset) {
  const paginated = `${sqlWithOrder} LIMIT ? OFFSET ?`;
  const [rows] = await pool.query(paginated, [limit, offset]);
  return rows.map(mergeNewsletterSubscriberNames);
}

async function listSubscribersPaginated({ offset, limit }) {
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM newsletter_subscribers ns`);
  const tries = [LIST_SUBSCRIBERS_SQL_FULL, LIST_SUBSCRIBERS_SQL_NO_NOTE_COL, LIST_SUBSCRIBERS_SQL_UOP_ONLY];
  let lastErr;
  for (const sql of tries) {
    try {
      const rows = await querySubscriberListRows(sql, limit, offset);
      return { rows, total: Number(total) };
    } catch (err) {
      lastErr = err;
      if (!isMissingColumnError(err)) {
        throw err;
      }
    }
  }
  throw lastErr;
}

async function getAllSubscribersForExport() {
  const tries = [LIST_SUBSCRIBERS_SQL_FULL, LIST_SUBSCRIBERS_SQL_NO_NOTE_COL, LIST_SUBSCRIBERS_SQL_UOP_ONLY];
  let lastErr;
  for (const sql of tries) {
    try {
      const [rows] = await pool.query(sql);
      return rows.map(mergeNewsletterSubscriberNames);
    } catch (err) {
      lastErr = err;
      if (!isMissingColumnError(err)) {
        throw err;
      }
    }
  }
  throw lastErr;
}

async function syncSubscriberEmail({ oldEmail, newEmail }) {
  if (!oldEmail || !newEmail || String(oldEmail).toLowerCase() === String(newEmail).toLowerCase()) {
    return false;
  }
  const [result] = await pool.query(
    `UPDATE newsletter_subscribers
     SET email = ?
     WHERE email = ?`,
    [String(newEmail).toLowerCase(), String(oldEmail).toLowerCase()]
  );
  return result.affectedRows > 0;
}

async function deleteSubscriberByEmail(email) {
  if (!email) {
    return false;
  }
  const [result] = await pool.query(
    `DELETE FROM newsletter_subscribers
     WHERE email = ?`,
    [String(email).toLowerCase()]
  );
  return result.affectedRows > 0;
}

async function deleteSubscriberById(id) {
  const nid = Number(id);
  if (!Number.isFinite(nid) || nid <= 0) {
    return false;
  }
  const [result] = await pool.query(`DELETE FROM newsletter_subscribers WHERE id = ?`, [nid]);
  return result.affectedRows > 0;
}

async function getSubscriberSyncProfile({ email, fallbackCityId = null }) {
  const [rows] = await pool.query(
    `SELECT u.name AS user_name, u.email,
            uop.first_name, uop.last_name, uop.mobile_number, uop.city_id AS onboarding_city_id,
            c1.name AS onboarding_city_name,
            c2.name AS fallback_city_name
     FROM users u
     LEFT JOIN user_onboarding_profiles uop ON uop.user_id = u.id
     LEFT JOIN cities c1 ON c1.id = uop.city_id
     LEFT JOIN cities c2 ON c2.id = ?
     WHERE u.email = ?
     LIMIT 1`,
    [fallbackCityId, email]
  );
  return rows[0] || null;
}

async function cityExists(cityId) {
  const [rows] = await pool.query(`SELECT id FROM cities WHERE id = ? LIMIT 1`, [cityId]);
  return Boolean(rows[0]);
}

module.exports = {
  subscribeNewsletter,
  alignNewsletterRowsToCanonicalEmail,
  linkNewsletterSubscriberToUser,
  hasActiveSubscriptionForEmail,
  hasActiveSubscriptionForUserId,
  getFirstInactiveSubscriberIdForEmail,
  reactivateSubscriberById,
  getActiveSubscription,
  listSubscribersPaginated,
  getAllSubscribersForExport,
  syncSubscriberEmail,
  deleteSubscriberByEmail,
  deleteSubscriberById,
  getSubscriberSyncProfile,
  cityExists
};
