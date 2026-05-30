/** TiDB/MySQL JSON column helpers — always CAST on write, parse flexibly on read. */

const JSON_EVENT_COLUMNS = new Set(["promo_video_urls", "gallery_image_urls"]);

function sqlAssignFragment(column) {
  return JSON_EVENT_COLUMNS.has(column) ? `${column} = CAST(? AS JSON)` : `${column} = ?`;
}

function toJsonDbString(value) {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch (_err) {
      return JSON.stringify([trimmed]);
    }
  }
  return JSON.stringify(value);
}

function parseJsonColumn(value) {
  if (value == null || value === "") {
    return null;
  }
  if (Buffer.isBuffer(value)) {
    return parseJsonColumn(value.toString("utf8"));
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "object") {
    return value;
  }
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_err) {
      return value;
    }
  }
  return null;
}

module.exports = {
  JSON_EVENT_COLUMNS,
  sqlAssignFragment,
  toJsonDbString,
  parseJsonColumn
};
