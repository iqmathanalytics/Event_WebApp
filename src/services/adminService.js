const { pool } = require("../config/db");
const ApiError = require("../utils/ApiError");
const { getDateRange, getMonthRange } = require("../utils/dateRange");
const bcrypt = require("bcryptjs");
const { findUserByEmail, createUser, listUsersByRole, deactivateUserById } = require("../models/userModel");

async function getModerationQueue() {
  const [rows] = await pool.query(
    `SELECT id, title, city_id, category_id, organizer_id, status, created_at
     FROM events
     WHERE status = 'pending'
     ORDER BY created_at ASC`
  );
  return rows;
}

function buildDateClause({ dateStart, dateEnd, monthStart, monthEnd, column, values, conditions }) {
  if (dateStart && dateEnd) {
    conditions.push(`${column} >= ? AND ${column} < ?`);
    values.push(dateStart, dateEnd);
    return;
  }
  if (monthStart && monthEnd) {
    conditions.push(`${column} >= ? AND ${column} < ?`);
    values.push(monthStart, monthEnd);
  }
}

async function getAnalytics(filters = {}) {
  const { dateStart, dateEnd } = getDateRange(filters.date || null);
  const { monthStart, monthEnd } = getMonthRange(filters.month || null);
  const cityId = filters.city ? Number(filters.city) : null;
  const categoryId = filters.category ? Number(filters.category) : null;

  const userConditions = [];
  const userValues = [];
  buildDateClause({
    dateStart,
    dateEnd,
    monthStart,
    monthEnd,
    column: "created_at",
    values: userValues,
    conditions: userConditions
  });
  const userWhere = userConditions.length ? `WHERE ${userConditions.join(" AND ")}` : "";
  const [[users]] = await pool.query(`SELECT COUNT(*) AS total_users FROM users ${userWhere}`, userValues);

  const eventConditions = [];
  const eventValues = [];
  if (cityId) {
    eventConditions.push("city_id = ?");
    eventValues.push(cityId);
  }
  if (categoryId) {
    eventConditions.push("category_id = ?");
    eventValues.push(categoryId);
  }
  buildDateClause({
    dateStart,
    dateEnd,
    monthStart,
    monthEnd,
    column: "created_at",
    values: eventValues,
    conditions: eventConditions
  });
  const eventWhere = eventConditions.length ? `WHERE ${eventConditions.join(" AND ")}` : "";

  const [[events]] = await pool.query(`SELECT COUNT(*) AS total_events FROM events ${eventWhere}`, eventValues);
  const [[pendingEvents]] = await pool.query(
    `SELECT COUNT(*) AS pending_events FROM events ${eventWhere ? `${eventWhere} AND` : "WHERE"} status = 'pending'`,
    eventValues
  );

  const dealConditions = ["status = 'approved'", "expiry_date >= CURDATE()"];
  const dealValues = [];
  if (cityId) {
    dealConditions.push("city_id = ?");
    dealValues.push(cityId);
  }
  if (categoryId) {
    dealConditions.push("category_id = ?");
    dealValues.push(categoryId);
  }
  buildDateClause({
    dateStart,
    dateEnd,
    monthStart,
    monthEnd,
    column: "created_at",
    values: dealValues,
    conditions: dealConditions
  });
  const [[activeDeals]] = await pool.query(
    `SELECT COUNT(*) AS active_deals FROM deals WHERE ${dealConditions.join(" AND ")}`,
    dealValues
  );

  return {
    total_users: users.total_users,
    total_events: events.total_events,
    pending_events: pendingEvents.pending_events,
    active_deals: activeDeals.active_deals
  };
}

function resolveTable(type) {
  const mapping = {
    events: "events",
    deals: "deals",
    influencers: "influencers",
    services: "services"
  };
  const table = mapping[type];
  if (!table) {
    throw new ApiError(400, "Invalid listing type");
  }
  return table;
}

async function listListings({ type, status, city, category, date, month }) {
  const table = resolveTable(type);
  const { dateStart, dateEnd } = getDateRange(date || null);
  const { monthStart, monthEnd } = getMonthRange(month || null);
  const values = [];
  const conditions = [];
  if (status) {
    conditions.push("t.status = ?");
    values.push(status);
  }
  if (city) {
    conditions.push("t.city_id = ?");
    values.push(Number(city));
  }
  if (category) {
    conditions.push("t.category_id = ?");
    values.push(Number(category));
  }
  if (table === "events" && date) {
    conditions.push("t.event_date = ?");
    values.push(date);
  } else if (table === "deals" && date) {
    conditions.push("t.expiry_date = ?");
    values.push(date);
  } else if (dateStart && dateEnd) {
    conditions.push("t.created_at >= ? AND t.created_at < ?");
    values.push(dateStart, dateEnd);
  }
  if (table === "events" && monthStart && monthEnd) {
    conditions.push("t.event_date >= ? AND t.event_date < ?");
    values.push(monthStart, monthEnd);
  } else if (table === "deals" && monthStart && monthEnd) {
    conditions.push("t.expiry_date >= ? AND t.expiry_date < ?");
    values.push(monthStart, monthEnd);
  } else if (monthStart && monthEnd) {
    conditions.push("t.created_at >= ? AND t.created_at < ?");
    values.push(monthStart, monthEnd);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT t.*, c.name AS city_name, cat.name AS category_name
     FROM ${table} t
     LEFT JOIN cities c ON c.id = t.city_id
     LEFT JOIN categories cat ON cat.id = t.category_id
     ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT 500`,
    values
  );
  return rows;
}

async function updateListingStatus({ type, id, status, note, adminId }) {
  const table = resolveTable(type);
  if (table === "events") {
    const [result] = await pool.query(
      `UPDATE events
       SET status = ?, reviewed_by = ?, reviewed_at = NOW(), review_note = ?, updated_at = NOW()
       WHERE id = ?`,
      [status, adminId, note || null, id]
    );
    return result.affectedRows > 0;
  }

  const [result] = await pool.query(
    `UPDATE ${table}
     SET status = ?, updated_at = NOW()
     WHERE id = ?`,
    [status, id]
  );
  return result.affectedRows > 0;
}

function resolveEditableColumns(type) {
  const mapping = {
    events: [
      "title",
      "description",
      "city_id",
      "category_id",
      "price",
      "event_date",
      "event_time",
      "schedule_type",
      "event_start_date",
      "event_end_date",
      "event_dates",
      "venue",
      "venue_name",
      "venue_address",
      "google_maps_link",
      "ticket_link",
      "image_url",
      "duration_hours",
      "age_limit",
      "languages",
      "genres",
      "event_highlights",
      "price_per_day"
    ],
    deals: ["title", "description", "city_id", "category_id", "original_price", "discounted_price", "expiry_date"],
    influencers: ["name", "bio", "city_id", "category_id"],
    services: ["title", "description", "city_id", "category_id", "price_min", "price_max"]
  };
  return mapping[type] || [];
}

async function editListing({ type, id, payload }) {
  const table = resolveTable(type);
  const allowedColumns = resolveEditableColumns(type);
  const entries = Object.entries(payload).filter(
    ([key, value]) => allowedColumns.includes(key) && value !== undefined
  );

  if (!entries.length) {
    throw new ApiError(400, "No editable fields provided");
  }

  const mappedEntries = entries.map(([key, value]) => {
    if (table === "events") {
      if (key === "event_dates" && Array.isArray(value)) {
        return ["event_dates_json", JSON.stringify(value)];
      }
      if (key === "event_highlights" && Array.isArray(value)) {
        return ["event_highlights", JSON.stringify(value)];
      }
      if (key === "price_per_day") {
        return ["price", value];
      }
    }
    return [key, value];
  });

  const setClause = mappedEntries.map(([key]) => `${key} = ?`).join(", ");
  const values = mappedEntries.map(([, value]) => value);

  const [result] = await pool.query(
    `UPDATE ${table}
     SET ${setClause}, updated_at = NOW()
     WHERE id = ?`,
    [...values, id]
  );
  return result.affectedRows > 0;
}

async function deleteListing({ type, id }) {
  const table = resolveTable(type);
  const [result] = await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

async function createStaffUser({ name, email, mobile_number, password, role }) {
  if (!["organizer", "admin"].includes(role)) {
    throw new ApiError(400, "Invalid staff role");
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    throw new ApiError(409, "Email already in use");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = await createUser({
    name,
    email,
    mobileNumber: mobile_number,
    passwordHash,
    role
  });

  return { userId };
}

async function fetchTeamUsers(role) {
  if (!["organizer", "admin"].includes(role)) {
    throw new ApiError(400, "Invalid role");
  }
  return listUsersByRole(role);
}

async function deactivateAccount(userId) {
  const updated = await deactivateUserById(userId);
  if (!updated) {
    throw new ApiError(404, "User not found");
  }
}

module.exports = {
  getModerationQueue,
  getAnalytics,
  listListings,
  updateListingStatus,
  editListing,
  deleteListing,
  createStaffUser,
  fetchTeamUsers,
  deactivateAccount
};
