const crypto = require("crypto");
const { pool } = require("../config/db");

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(String(rawToken || "").trim()).digest("hex");
}

async function createPasswordSetToken(userId, { expiresHours = 72 } = {}) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const hours = Math.max(1, Number(expiresHours) || 72);
  await pool.query(
    `INSERT INTO user_password_set_tokens (user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), NOW())`,
    [userId, tokenHash, hours]
  );
  return rawToken;
}

async function findValidPasswordSetToken(rawToken) {
  const tokenHash = hashToken(rawToken);
  const [rows] = await pool.query(
    `SELECT t.id,
            t.user_id,
            t.expires_at,
            t.used_at,
            u.email,
            u.name,
            u.auth_provider
     FROM user_password_set_tokens t
     INNER JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = ?
       AND t.used_at IS NULL
       AND t.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function markPasswordSetTokenUsed(tokenId) {
  await pool.query(`UPDATE user_password_set_tokens SET used_at = NOW() WHERE id = ?`, [tokenId]);
}

module.exports = {
  createPasswordSetToken,
  findValidPasswordSetToken,
  markPasswordSetTokenUsed
};
