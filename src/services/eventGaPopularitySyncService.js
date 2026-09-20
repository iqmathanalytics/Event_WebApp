const { pool } = require("../config/db");
const googleAnalytics = require("./googleAnalyticsService");

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
const GA_ID_BATCH = 200;

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) {
    out.push(list.slice(i, i + size));
  }
  return out;
}

async function listApprovedEventIds() {
  const [rows] = await pool.query(
    `SELECT id
     FROM events
     WHERE status = 'approved'
       AND is_listed = 1
     ORDER BY id ASC`
  );
  return (rows || []).map((row) => Number(row.id)).filter((id) => Number.isFinite(id) && id > 0);
}

async function persistPageViewMaps(ids, map7, map30) {
  for (const id of ids) {
    const views7d = Number(map7[String(id)] || 0);
    const views30d = Number(map30[String(id)] || 0);
    await pool.query(
      `UPDATE events
       SET ga_page_views_7d = ?,
           ga_page_views_30d = ?,
           popularity_score = ?,
           ga_page_views_synced_at = NOW()
       WHERE id = ?`,
      [views7d, views30d, views30d, id]
    );
  }
}

async function refreshStoredEventGaPageViews() {
  if (!googleAnalytics.isConfigured()) {
    return { updated: 0, skipped: true };
  }
  const ids = await listApprovedEventIds();
  if (!ids.length) {
    return { updated: 0, skipped: false };
  }

  let updated = 0;
  for (const batch of chunk(ids, GA_ID_BATCH)) {
    const [map30, map7] = await Promise.all([
      googleAnalytics.getEventPageViewsMap(batch.map(String), 30),
      googleAnalytics.getEventPageViewsMap(batch.map(String), 7)
    ]);
    await persistPageViewMaps(batch, map7, map30);
    updated += batch.length;
  }
  return { updated, skipped: false };
}

function startEventGaPopularitySyncJob() {
  if (global.__eventGaPopularitySyncJobStarted) {
    return;
  }
  global.__eventGaPopularitySyncJobStarted = true;

  if (!googleAnalytics.isConfigured()) {
    return;
  }

  const intervalMs = Number(process.env.GA_EVENT_VIEWS_REFRESH_MS || DEFAULT_INTERVAL_MS);
  const delayMs = Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : DEFAULT_INTERVAL_MS;

  const run = async () => {
    try {
      const result = await refreshStoredEventGaPageViews();
      if (result?.updated) {
        // eslint-disable-next-line no-console
        console.log(`[ga-popularity] synced page views for ${result.updated} events`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[ga-popularity] sync failed:", err?.message || err);
    }
  };

  setTimeout(() => {
    void run();
    setInterval(() => {
      void run();
    }, delayMs);
  }, 15 * 1000);
}

module.exports = {
  refreshStoredEventGaPageViews,
  startEventGaPopularitySyncJob
};
