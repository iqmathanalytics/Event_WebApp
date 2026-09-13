const crypto = require("crypto");
const { pool } = require("../config/db");

function newInviteToken() {
  return crypto.randomUUID();
}

/** Accepted + not revoked — grants analytics read access. */
async function findAcceptedShare(eventId, sharedWithUserId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT *
     FROM event_analytics_shares
     WHERE event_id = ?
       AND shared_with_user_id = ?
       AND revoked_at IS NULL
       AND COALESCE(status, 'accepted') = 'accepted'
     LIMIT 1`,
    [eventId, sharedWithUserId]
  );
  return rows[0] || null;
}

async function hasActiveAnalyticsShare(eventId, sharedWithUserId, conn) {
  const row = await findAcceptedShare(eventId, sharedWithUserId, conn);
  return Boolean(row);
}

async function listSharesForEvent(eventId, ownerUserId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT
       s.id,
       s.event_id,
       s.owner_user_id,
       s.shared_with_user_id,
       s.shared_with_email,
       s.status,
       s.invite_token,
       s.accepted_at,
       s.created_at,
       u.name AS shared_with_name,
       u.email AS shared_with_user_email
     FROM event_analytics_shares s
     LEFT JOIN users u ON u.id = s.shared_with_user_id
     WHERE s.event_id = ?
       AND s.owner_user_id = ?
       AND s.revoked_at IS NULL
     ORDER BY s.created_at DESC`,
    [eventId, ownerUserId]
  );
  return rows;
}

/** Accepted, non-revoked share recipient emails for booking notification CC. */
async function listAcceptedShareEmailsForEvent(eventId, ownerUserId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT
       COALESCE(NULLIF(TRIM(u.email), ''), NULLIF(TRIM(s.shared_with_email), '')) AS email
     FROM event_analytics_shares s
     LEFT JOIN users u ON u.id = s.shared_with_user_id
     WHERE s.event_id = ?
       AND s.owner_user_id = ?
       AND s.revoked_at IS NULL
       AND COALESCE(s.status, 'accepted') = 'accepted'`,
    [eventId, ownerUserId]
  );
  const seen = new Set();
  const emails = [];
  for (const row of rows) {
    const email = String(row.email || "").trim().toLowerCase();
    if (!email || seen.has(email)) {
      continue;
    }
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

/** Accepted shares only — pending invites stay off Shared with me until accepted. */
async function listSharedEventsForUser(sharedWithUserId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT
       s.id AS share_id,
       s.status,
       s.invite_token,
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
     FROM event_analytics_shares s
     INNER JOIN events e ON e.id = s.event_id
     INNER JOIN users owner ON owner.id = s.owner_user_id
     WHERE s.shared_with_user_id = ?
       AND s.revoked_at IS NULL
       AND COALESCE(s.status, 'accepted') = 'accepted'
     ORDER BY s.created_at DESC`,
    [sharedWithUserId]
  );
  return rows;
}

async function createShare(
  { eventId, ownerUserId, sharedWithUserId, sharedWithEmail, inviteToken },
  conn
) {
  const runner = conn || pool;
  const token = inviteToken || newInviteToken();
  const [existing] = await runner.query(
    `SELECT id, revoked_at, status, invite_token
     FROM event_analytics_shares
     WHERE event_id = ? AND shared_with_user_id = ?
     LIMIT 1`,
    [eventId, sharedWithUserId]
  );
  if (existing[0]) {
    if (existing[0].revoked_at == null && existing[0].status === "accepted") {
      return { id: existing[0].id, alreadyExists: true, status: "accepted" };
    }
    if (existing[0].revoked_at == null && existing[0].status === "pending") {
      const nextToken = existing[0].invite_token || token;
      if (!existing[0].invite_token) {
        await runner.query(`UPDATE event_analytics_shares SET invite_token = ? WHERE id = ?`, [
          nextToken,
          existing[0].id
        ]);
      }
      return {
        id: existing[0].id,
        alreadyExists: true,
        status: "pending",
        inviteToken: nextToken,
        resent: true
      };
    }
    await runner.query(
      `UPDATE event_analytics_shares
       SET revoked_at = NULL,
           owner_user_id = ?,
           shared_with_email = ?,
           status = 'pending',
           invite_token = ?,
           accepted_at = NULL,
           created_at = NOW()
       WHERE id = ?`,
      [ownerUserId, sharedWithEmail, token, existing[0].id]
    );
    return { id: existing[0].id, alreadyExists: false, status: "pending", inviteToken: token, reactivated: true };
  }

  const [result] = await runner.query(
    `INSERT INTO event_analytics_shares
      (event_id, owner_user_id, shared_with_user_id, shared_with_email, status, invite_token, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?, NOW())`,
    [eventId, ownerUserId, sharedWithUserId, sharedWithEmail, token]
  );
  return { id: result.insertId, alreadyExists: false, status: "pending", inviteToken: token };
}

async function findShareByIdForOwner(shareId, ownerUserId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT *
     FROM event_analytics_shares
     WHERE id = ? AND owner_user_id = ? AND revoked_at IS NULL
     LIMIT 1`,
    [shareId, ownerUserId]
  );
  return rows[0] || null;
}

async function findShareByInviteToken(inviteToken, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT *
     FROM event_analytics_shares
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
    `UPDATE event_analytics_shares
     SET status = 'accepted', accepted_at = NOW()
     WHERE id = ? AND revoked_at IS NULL`,
    [share.id]
  );
  return { ...share, status: "accepted", alreadyAccepted: false };
}

async function acceptShareById({ shareId, userId }, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT *
     FROM event_analytics_shares
     WHERE id = ? AND shared_with_user_id = ? AND revoked_at IS NULL
     LIMIT 1`,
    [shareId, userId]
  );
  const share = rows[0];
  if (!share) {
    return null;
  }
  if (share.status === "accepted") {
    return { ...share, alreadyAccepted: true };
  }
  await runner.query(
    `UPDATE event_analytics_shares
     SET status = 'accepted', accepted_at = NOW()
     WHERE id = ?`,
    [share.id]
  );
  return { ...share, status: "accepted", alreadyAccepted: false };
}

async function declineShareById({ shareId, userId }, conn) {
  const runner = conn || pool;
  const [result] = await runner.query(
    `UPDATE event_analytics_shares
     SET revoked_at = NOW()
     WHERE id = ? AND shared_with_user_id = ? AND revoked_at IS NULL`,
    [shareId, userId]
  );
  return result.affectedRows > 0;
}

async function revokeShare(shareId, ownerUserId, conn) {
  const runner = conn || pool;
  const [result] = await runner.query(
    `UPDATE event_analytics_shares
     SET revoked_at = NOW()
     WHERE id = ? AND owner_user_id = ? AND revoked_at IS NULL`,
    [shareId, ownerUserId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  newInviteToken,
  findAcceptedShare,
  hasActiveAnalyticsShare,
  listSharesForEvent,
  listAcceptedShareEmailsForEvent,
  listSharedEventsForUser,
  createShare,
  findShareByIdForOwner,
  findShareByInviteToken,
  acceptShareByToken,
  acceptShareById,
  declineShareById,
  revokeShare
};
