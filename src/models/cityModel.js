const { pool } = require("../config/db");

async function ensureCitySyncMetaTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS city_sync_meta (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      last_synced_at DATETIME NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  );
  await pool.query("INSERT IGNORE INTO city_sync_meta (id, last_synced_at) VALUES (1, NULL)");
}

async function getCitySyncMeta() {
  await ensureCitySyncMetaTable();
  const [rows] = await pool.query("SELECT id, last_synced_at FROM city_sync_meta WHERE id = 1 LIMIT 1");
  return rows[0] || { id: 1, last_synced_at: null };
}

async function updateCitySyncMeta(date = new Date()) {
  await ensureCitySyncMetaTable();
  await pool.query("UPDATE city_sync_meta SET last_synced_at = ? WHERE id = 1", [date]);
}

async function upsertCities(cities) {
  if (!cities.length) {
    return 0;
  }
  const chunkSize = 300;
  let affected = 0;

  for (let index = 0; index < cities.length; index += chunkSize) {
    const chunk = cities.slice(index, index + chunkSize);
    const placeholders = chunk.map(() => "(?, ?, ?, 1)").join(", ");
    const values = chunk.flatMap((item) => [item.name, item.state, item.slug]);
    const [result] = await pool.query(
      `INSERT INTO cities (name, state, slug, is_active)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         state = VALUES(state),
         is_active = 1`,
      values
    );
    affected += result.affectedRows || 0;
  }

  return affected;
}

async function listActiveCities({ q = "", limit = 5000 }) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 5000, 10000));
  const query = String(q || "").trim();
  if (query) {
    const [rows] = await pool.query(
      `SELECT id, name, state
       FROM cities
       WHERE is_active = 1 AND name LIKE ?
       ORDER BY name ASC, state ASC
       LIMIT ?`,
      [`%${query}%`, safeLimit]
    );
    return rows;
  }

  const [rows] = await pool.query(
    `SELECT id, name, state
     FROM cities
     WHERE is_active = 1
     ORDER BY name ASC, state ASC
     LIMIT ?`,
    [safeLimit]
  );
  return rows;
}

module.exports = {
  getCitySyncMeta,
  updateCitySyncMeta,
  upsertCities,
  listActiveCities
};
