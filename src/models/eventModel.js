const { pool } = require("../config/db");
const { normalizeDateList } = require("../utils/eventSchedule");

function parseHighlights(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function normalizeEventRow(row) {
  if (!row) {
    return row;
  }
  return {
    ...row,
    event_highlights: parseHighlights(row.event_highlights),
    event_dates: normalizeDateList(
      (() => {
        if (!row.event_dates_json) {
          return [];
        }
        try {
          const parsed = JSON.parse(row.event_dates_json);
          return Array.isArray(parsed) ? parsed : [];
        } catch (_err) {
          return String(row.event_dates_json)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        }
      })()
    )
  };
}

async function createEvent(payload) {
  const {
    title,
    description,
    event_date,
    schedule_type,
    event_start_date,
    event_end_date,
    event_dates,
    event_time,
    venue,
    venue_name,
    venue_address,
    google_maps_link,
    city_id,
    category_id,
    organizer_id,
    ticket_link,
    image_url,
    price,
    duration_hours,
    age_limit,
    languages,
    genres,
    event_highlights,
    price_per_day
  } = payload;

  const highlightsValue = Array.isArray(event_highlights)
    ? JSON.stringify(event_highlights)
    : event_highlights || null;
  const normalizedEventDates = normalizeDateList(event_dates || []);
  const eventDatesValue = normalizedEventDates.length ? JSON.stringify(normalizedEventDates) : null;
  const scheduleType = schedule_type || "single";
  const perDayPrice = price_per_day !== undefined ? price_per_day : price;

  const [result] = await pool.query(
    `INSERT INTO events
      (title, description, event_date, schedule_type, event_start_date, event_end_date, event_dates_json, event_time, venue, city_id, category_id,
       venue_name, venue_address, google_maps_link, organizer_id, ticket_link,
       image_url, price, duration_hours, age_limit, languages, genres, event_highlights,
       status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
    [
      title,
      description || null,
      event_date,
      scheduleType,
      event_start_date || null,
      event_end_date || null,
      eventDatesValue,
      event_time || null,
      venue,
      city_id,
      category_id,
      venue_name || venue,
      venue_address || null,
      google_maps_link || null,
      organizer_id,
      ticket_link || null,
      image_url || null,
      perDayPrice || 0,
      duration_hours || null,
      age_limit || null,
      languages || null,
      genres || null,
      highlightsValue
    ]
  );

  return result.insertId;
}

async function updateEventStatus({ eventId, status, adminId, reviewNote }) {
  const [result] = await pool.query(
    `UPDATE events
     SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_note = ?, updated_at = NOW()
     WHERE id = ?`,
    [status, adminId, reviewNote || null, eventId]
  );
  return result.affectedRows > 0;
}

async function findEventById(id) {
  const [rows] = await pool.query("SELECT * FROM events WHERE id = ? LIMIT 1", [id]);
  return normalizeEventRow(rows[0] || null);
}

async function findPublicEventById(id) {
  const [rows] = await pool.query(
    `SELECT e.*, c.name AS city_name, cat.name AS category_name, u.name AS organizer_name
     FROM events e
     LEFT JOIN cities c ON c.id = e.city_id
     LEFT JOIN categories cat ON cat.id = e.category_id
     LEFT JOIN users u ON u.id = e.organizer_id
     WHERE e.id = ? AND e.status = 'approved'
     LIMIT 1`,
    [id]
  );
  return normalizeEventRow(rows[0] || null);
}

async function listEventsByOrganizer(organizerId) {
  const [rows] = await pool.query(
    `SELECT e.*, c.name AS city_name, cat.name AS category_name
     FROM events e
     LEFT JOIN cities c ON c.id = e.city_id
     LEFT JOIN categories cat ON cat.id = e.category_id
     WHERE e.organizer_id = ?
     ORDER BY e.created_at DESC`,
    [organizerId]
  );
  return rows.map(normalizeEventRow);
}

async function updateEventByOrganizer({ eventId, organizerId, updates }) {
  const allowed = [
    "title",
    "description",
    "event_date",
    "schedule_type",
    "event_start_date",
    "event_end_date",
    "event_dates",
    "event_time",
    "venue",
    "venue_name",
    "venue_address",
    "google_maps_link",
    "city_id",
    "category_id",
    "ticket_link",
    "image_url",
    "price",
    "price_per_day",
    "duration_hours",
    "age_limit",
    "languages",
    "genres",
    "event_highlights"
  ];

  const entries = Object.entries(updates)
    .filter(([key, value]) => allowed.includes(key) && value !== undefined)
    .map(([key, value]) => {
      if (key === "event_highlights" && Array.isArray(value)) {
        return [key, JSON.stringify(value)];
      }
      if (key === "event_dates" && Array.isArray(value)) {
        return ["event_dates_json", JSON.stringify(normalizeDateList(value))];
      }
      if (key === "price_per_day") {
        return ["price", value];
      }
      return [key, value];
    });

  if (!entries.length) {
    return false;
  }

  const setClause = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value);
  const [result] = await pool.query(
    `UPDATE events
     SET ${setClause}, updated_at = NOW(), status = 'pending'
     WHERE id = ? AND organizer_id = ?`,
    [...values, eventId, organizerId]
  );
  return result.affectedRows > 0;
}

async function deleteEventByOrganizer({ eventId, organizerId }) {
  const [result] = await pool.query(
    `DELETE FROM events
     WHERE id = ? AND organizer_id = ?`,
    [eventId, organizerId]
  );
  return result.affectedRows > 0;
}

async function listEvents({ filters, pagination }) {
  const conditions = [];
  const whereValues = [];
  const selectValues = [];

  if (filters.status) {
    conditions.push("e.status = ?");
    whereValues.push(filters.status);
  }
  if (filters.cityId) {
    conditions.push("e.city_id = ?");
    whereValues.push(filters.cityId);
  }
  if (filters.categoryId) {
    conditions.push("e.category_id = ?");
    whereValues.push(filters.categoryId);
  }
  if (filters.q) {
    conditions.push("(e.title LIKE ? OR e.description LIKE ?)");
    whereValues.push(`%${filters.q}%`, `%${filters.q}%`);
  }
  if (filters.date) {
    conditions.push(
      `(
        (e.schedule_type = 'range' AND e.event_start_date <= ? AND e.event_end_date >= ?)
        OR (e.schedule_type = 'multiple' AND JSON_CONTAINS(COALESCE(e.event_dates_json, '[]'), JSON_QUOTE(?)))
        OR ((e.schedule_type = 'single' OR e.schedule_type IS NULL) AND e.event_date = ?)
      )`
    );
    whereValues.push(filters.date, filters.date, filters.date, filters.date);
  }
  if (filters.time) {
    conditions.push("COALESCE(e.event_time, '00:00:00') >= ?");
    whereValues.push(filters.time.length === 5 ? `${filters.time}:00` : filters.time);
  }
  if (filters.monthStart && filters.monthEnd) {
    conditions.push("e.event_date >= ? AND e.event_date < ?");
    whereValues.push(filters.monthStart, filters.monthEnd);
  }
  if (filters.priceMin !== null) {
    conditions.push("e.price >= ?");
    whereValues.push(filters.priceMin);
  }
  if (filters.priceMax !== null) {
    conditions.push("e.price <= ?");
    whereValues.push(filters.priceMax);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
  let orderBy = "e.created_at DESC";

  if (filters.sortBy === "price") {
    orderBy = `e.price ${sortOrder}`;
  } else if (filters.sortBy === "popularity") {
    orderBy = `e.popularity_score ${sortOrder}`;
  } else if (filters.sortBy === "newest") {
    orderBy = "e.created_at DESC";
  } else if (filters.sortBy === "relevance" && filters.q) {
    orderBy = "relevance_score DESC, e.popularity_score DESC";
  }

  let relevanceSelect = "0 AS relevance_score";
  if (filters.q) {
    relevanceSelect = `
      ((CASE WHEN e.title LIKE ? THEN 3 ELSE 0 END) +
       (CASE WHEN e.description LIKE ? THEN 2 ELSE 0 END)) AS relevance_score
    `;
    selectValues.push(`%${filters.q}%`, `%${filters.q}%`);
  }

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM events e
     ${whereClause}`,
    whereValues
  );

  const [rows] = await pool.query(
    `SELECT e.*, c.name AS city_name, cat.name AS category_name, ${relevanceSelect}
     FROM events e
     LEFT JOIN cities c ON c.id = e.city_id
     LEFT JOIN categories cat ON cat.id = e.category_id
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...selectValues, ...whereValues, pagination.limit, pagination.offset]
  );

  return { total: countRows[0].total, rows: rows.map(normalizeEventRow) };
}

module.exports = {
  createEvent,
  updateEventStatus,
  findEventById,
  findPublicEventById,
  listEvents,
  listEventsByOrganizer,
  updateEventByOrganizer,
  deleteEventByOrganizer
};
