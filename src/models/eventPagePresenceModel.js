const { pool } = require("../config/db");

const LIVE_WINDOW_SECONDS = 90;

function normalizeSessionKey(value) {
  return String(value || "").trim().slice(0, 64);
}

async function touchEventPagePresence({ eventId, sessionKey }, conn) {
  const runner = conn || pool;
  const session = normalizeSessionKey(sessionKey);
  const id = Number(eventId);
  if (!id || session.length < 8) {
    return { touched: false };
  }
  try {
    await runner.query(
      `INSERT INTO event_page_presence
        (event_id, session_key, last_seen_at, created_at)
       VALUES (?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE last_seen_at = NOW()`,
      [id, session]
    );
    return { touched: true };
  } catch (err) {
    if (err?.code === "ER_NO_SUCH_TABLE") {
      return { touched: false, missing_table: true };
    }
    throw err;
  }
}

async function getLiveEventPagePresence(eventId, { windowSeconds = LIVE_WINDOW_SECONDS } = {}, conn) {
  const runner = conn || pool;
  const id = Number(eventId);
  const window = Math.max(30, Math.min(Number(windowSeconds) || LIVE_WINDOW_SECONDS, 300));
  if (!id) {
    return { live_sessions: 0, live_hits: 0, window_seconds: window };
  }
  try {
    const [rows] = await runner.query(
      `SELECT COUNT(*) AS live_sessions
       FROM event_page_presence
       WHERE event_id = ?
         AND last_seen_at >= DATE_SUB(NOW(), INTERVAL ? SECOND)`,
      [id, window]
    );
    const live = Number(rows[0]?.live_sessions) || 0;
    return {
      live_sessions: live,
      live_hits: live,
      window_seconds: window
    };
  } catch (err) {
    if (err?.code === "ER_NO_SUCH_TABLE") {
      return { live_sessions: 0, live_hits: 0, window_seconds: window, missing_table: true };
    }
    throw err;
  }
}

module.exports = {
  LIVE_WINDOW_SECONDS,
  touchEventPagePresence,
  getLiveEventPagePresence
};
