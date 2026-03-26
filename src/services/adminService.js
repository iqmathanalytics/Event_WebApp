const { pool } = require("../config/db");
const ApiError = require("../utils/ApiError");
const { getDateRange, getMonthRange } = require("../utils/dateRange");
const bcrypt = require("bcryptjs");
const {
  findUserByEmail,
  createUser,
  findUserById,
  listAllUsers,
  listUsersByRole,
  listUsersByOrganizerEnabled,
  updateUserCapabilitiesById,
  deactivateUserById,
  activateUserById,
  deleteUserById
} = require("../models/userModel");
const { getPagination } = require("../utils/pagination");
const {
  listSubscribersPaginated,
  getAllSubscribersForExport,
  deleteSubscriberByEmail
} = require("../models/newsletterModel");
const { listMessagesPaginated, getAllMessagesForExport } = require("../models/contactModel");
const {
  syncMailchimpSubscriber,
  isMailchimpConfigured
} = require("../utils/emailIntegrations");
const {
  listAdminNotifications,
  countUnreadAdminNotifications,
  markAllAdminNotificationsRead,
  purgeReadNotificationsOlderThan,
  deleteAdminNotificationById
} = require("../models/adminModel");

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
  const influencerConditions = ["status = 'approved'"];
  const influencerValues = [];
  if (cityId) {
    influencerConditions.push("city_id = ?");
    influencerValues.push(cityId);
  }
  if (categoryId) {
    influencerConditions.push("category_id = ?");
    influencerValues.push(categoryId);
  }
  buildDateClause({
    dateStart,
    dateEnd,
    monthStart,
    monthEnd,
    column: "created_at",
    values: influencerValues,
    conditions: influencerConditions
  });
  const [[totalInfluencers]] = await pool.query(
    `SELECT COUNT(*) AS total_influencers FROM influencers WHERE ${influencerConditions.join(" AND ")}`,
    influencerValues
  );

  return {
    total_users: users.total_users,
    total_events: events.total_events,
    pending_events: pendingEvents.pending_events,
    active_deals: activeDeals.active_deals,
    total_influencers: totalInfluencers.total_influencers
  };
}

function resolveTable(type) {
  const mapping = {
    events: "events",
    deals: "deals",
    influencers: "influencers",
    dealers: "dealer_profiles"
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
     SET status = ?, review_note = ?, updated_at = NOW()
     WHERE id = ?`,
    [status, note || null, id]
  ).catch(async (err) => {
    if (err?.code !== "ER_BAD_FIELD_ERROR") {
      throw err;
    }
    return pool.query(
      `UPDATE ${table}
       SET status = ?, updated_at = NOW()
       WHERE id = ?`,
      [status, id]
    );
  });
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
      "one_of_a_kind_manual",
      "price_per_day",
      "is_yay_deal_event",
      "deal_event_discount_code"
    ],
    deals: ["title", "description", "city_id", "category_id", "original_price", "discounted_price", "expiry_date"],
    influencers: [
      "name",
      "bio",
      "city_id",
      "category_id",
      "contact_email",
      "profile_image_url",
      "social_links",
      "followers_count",
      "youtube_subscribers_count"
    ],
    dealers: [
      "name",
      "business_email",
      "business_mobile",
      "location_text",
      "city_id",
      "category_id",
      "bio",
      "website_or_social_link",
      "profile_image_url"
    ]
  };
  return mapping[type] || [];
}

async function editListing({ type, id, payload }) {
  const table = resolveTable(type);
  const allowedColumns = resolveEditableColumns(type);

  let normalizedPayload = payload;

  // Influencer social links are stored inside `social_links` (JSON column).
  // Admin UI edits `instagram`/`youtube`, so we map them into `social_links` here.
  if (type === "influencers" && (Object.prototype.hasOwnProperty.call(payload, "instagram") || Object.prototype.hasOwnProperty.call(payload, "youtube"))) {
    const hasInstagram = Object.prototype.hasOwnProperty.call(payload, "instagram");
    const hasYoutube = Object.prototype.hasOwnProperty.call(payload, "youtube");

    const [rows] = await pool.query(`SELECT social_links FROM influencers WHERE id = ? LIMIT 1`, [id]);
    const existingRaw = rows?.[0]?.social_links;

    let existingLinks = {};
    if (existingRaw && typeof existingRaw === "string") {
      try {
        existingLinks = JSON.parse(existingRaw) || {};
      } catch (_err) {
        existingLinks = {};
      }
    } else if (existingRaw && typeof existingRaw === "object") {
      existingLinks = existingRaw;
    }

    const instagramValue = hasInstagram ? payload.instagram : existingLinks.instagram || "";
    const youtubeValue = hasYoutube ? payload.youtube : existingLinks.youtube || "";

    normalizedPayload = {
      ...payload,
      social_links: JSON.stringify({
        instagram: String(instagramValue || "").trim(),
        youtube: String(youtubeValue || "").trim()
      })
    };

    // Remove keys not present as DB columns.
    delete normalizedPayload.instagram;
    delete normalizedPayload.youtube;
  }

  const entries = Object.entries(normalizedPayload).filter(
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
      if (key === "is_yay_deal_event") {
        return [key, value === true || value === 1 || String(value) === "1" ? 1 : 0];
      }
      if (key === "deal_event_discount_code") {
        return [key, value == null || value === "" ? null : String(value).trim()];
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
  const { userRole, organizerEnabled } = role === "organizer" ? { userRole: "user", organizerEnabled: true } : { userRole: "admin", organizerEnabled: false };

  const userId = await createUser({
    name,
    email,
    mobileNumber: mobile_number,
    passwordHash,
    role: userRole,
    organizerEnabled
  });

  return { userId };
}

async function fetchTeamUsers(role) {
  if (!["organizer", "admin"].includes(role)) {
    throw new ApiError(400, "Invalid role");
  }
  if (role === "admin") {
    return listUsersByRole("admin");
  }
  return listUsersByOrganizerEnabled();
}

async function fetchAllUsers() {
  return listAllUsers();
}

async function deactivateAccount(userId) {
  const updated = await deactivateUserById(userId);
  if (!updated) {
    throw new ApiError(404, "User not found");
  }
}

async function activateAccount(userId) {
  const updated = await activateUserById(userId);
  if (!updated) {
    throw new ApiError(404, "User not found");
  }
}

async function removeUserAccount(userId) {
  if (Number(userId) === 1) {
    throw new ApiError(400, "Master admin account cannot be deleted");
  }
  const target = await findUserById(userId);
  const deleted = await deleteUserById(userId);
  if (!deleted) {
    throw new ApiError(404, "User not found");
  }
  await deleteSubscriberByEmail(target?.email).catch(() => {});
}

async function updateTeamUserCapabilities({ userId, capabilities }) {
  const updated = await updateUserCapabilitiesById({
    id: userId,
    can_post_events: capabilities.can_post_events,
    can_create_influencer_profile: capabilities.can_create_influencer_profile,
    can_post_deals: capabilities.can_post_deals
  });
  if (!updated) {
    throw new ApiError(404, "User not found");
  }
}

async function listNewsletterSubscribers(query = {}) {
  const { page, limit, offset } = getPagination(query);
  const { rows, total } = await listSubscribersPaginated({ offset, limit });
  return { rows, total, page, limit };
}

async function getNewsletterSubscribersExportRows() {
  return getAllSubscribersForExport();
}

async function listContactMessages(query = {}) {
  const { page, limit, offset } = getPagination(query);
  const { rows, total } = await listMessagesPaginated({ offset, limit });
  return { rows, total, page, limit };
}

async function getContactMessagesExportRows() {
  return getAllMessagesForExport();
}

function splitNameFallback(fullName = "") {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.slice(0, -1).join(" ") || parts[0] || "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : ""
  };
}

async function syncNewsletterSubscribersToMailchimp() {
  const rows = await getAllSubscribersForExport();
  let synced = 0;
  let skipped = 0;
  let failed = 0;
  let skippedNoEmail = 0;
  const failures = [];

  if (!isMailchimpConfigured()) {
    return {
      total: rows.length,
      synced: 0,
      skipped: rows.length,
      skippedNoEmail: 0,
      skippedMailchimpNotConfigured: rows.length,
      failed: 0,
      failures: [],
      hint:
        "Mailchimp env vars are missing or empty on this server. In Render, set MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID, and MAILCHIMP_SERVER_PREFIX (e.g. us5 — only the datacenter prefix, not the full URL). Redeploy after saving."
    };
  }

  for (const row of rows) {
    const email = String(row.email || "").trim().toLowerCase();
    if (!email) {
      skipped += 1;
      skippedNoEmail += 1;
      continue;
    }

    let firstName = String(row.first_name || "").trim();
    let lastName = String(row.last_name || "").trim();
    if (!firstName && !lastName) {
      const split = splitNameFallback(String(row.user_name || ""));
      firstName = split.firstName;
      lastName = split.lastName;
    }
    const cityName = String(row.city_name || "").trim();
    const phoneNumber = String(row.mobile_number || "").trim();

    const result = await syncMailchimpSubscriber({
      email,
      firstName,
      lastName,
      cityName,
      phoneNumber
    });

    if (result?.synced) {
      synced += 1;
    } else if (result?.skipped) {
      skipped += 1;
    } else {
      failed += 1;
      failures.push({
        email,
        error: result?.error || "Unknown Mailchimp error"
      });
    }
  }

  const hint =
    skippedNoEmail > 0 && skippedNoEmail === skipped
      ? "All rows were skipped because subscriber email was empty (unexpected with user-linked export)."
      : undefined;

  return {
    total: rows.length,
    synced,
    skipped,
    skippedNoEmail,
    failed,
    failures: failures.slice(0, 20),
    ...(hint ? { hint } : {})
  };
}

async function getAdminNotifications({ adminId, limit = 25 }) {
  await purgeReadNotificationsOlderThan({ adminId, minutes: 5 });
  const [rows, unread] = await Promise.all([
    listAdminNotifications({ adminId, limit }),
    countUnreadAdminNotifications({ adminId })
  ]);
  const [[pendingEvents]] = await pool.query(
    "SELECT COUNT(*) AS total FROM events WHERE status = 'pending'"
  );
  const [[pendingDeals]] = await pool.query(
    "SELECT COUNT(*) AS total FROM deals WHERE status = 'pending'"
  );
  const [[pendingInfluencers]] = await pool.query(
    "SELECT COUNT(*) AS total FROM influencers WHERE status = 'pending'"
  );
  const [[pendingDealers]] = await pool.query(
    "SELECT COUNT(*) AS total FROM dealer_profiles WHERE status = 'pending'"
  );
  const [[newContacts]] = await pool.query(
    "SELECT COUNT(*) AS total FROM contact_messages WHERE status = 'new'"
  );

  const summary = [];
  if (Number(pendingEvents.total || 0) > 0) {
    summary.push({
      id: "summary-pending-events",
      type: "summary",
      entity_type: "events",
      entity_id: null,
      title: "Pending event approvals",
      message: `${pendingEvents.total} event submissions waiting for review`,
      is_read: 0,
      created_at: new Date().toISOString()
    });
  }
  if (Number(pendingDeals.total || 0) > 0) {
    summary.push({
      id: "summary-pending-deals",
      type: "summary",
      entity_type: "deals",
      entity_id: null,
      title: "Pending deal approvals",
      message: `${pendingDeals.total} deal submissions waiting for review`,
      is_read: 0,
      created_at: new Date().toISOString()
    });
  }
  if (Number(pendingInfluencers.total || 0) > 0) {
    summary.push({
      id: "summary-pending-influencers",
      type: "summary",
      entity_type: "influencers",
      entity_id: null,
      title: "Pending influencer approvals",
      message: `${pendingInfluencers.total} influencer profiles waiting for review`,
      is_read: 0,
      created_at: new Date().toISOString()
    });
  }
  if (Number(pendingDealers.total || 0) > 0) {
    summary.push({
      id: "summary-pending-dealers",
      type: "summary",
      entity_type: "dealers",
      entity_id: null,
      title: "Pending dealer approvals",
      message: `${pendingDealers.total} dealer profiles waiting for review`,
      is_read: 0,
      created_at: new Date().toISOString()
    });
  }
  if (Number(newContacts.total || 0) > 0) {
    summary.push({
      id: "summary-new-contacts",
      type: "summary",
      entity_type: "contact",
      entity_id: null,
      title: "New contact messages",
      message: `${newContacts.total} new contact requests need attention`,
      is_read: 0,
      created_at: new Date().toISOString()
    });
  }

  return { rows: [...summary, ...rows], unread: Number(unread || 0) };
}

async function markAdminNotificationsRead({ adminId }) {
  await markAllAdminNotificationsRead({ adminId });
  const unread = await countUnreadAdminNotifications({ adminId });
  return { unread: Number(unread || 0) };
}

async function deleteAdminNotification({ adminId, notificationId }) {
  const deleted = await deleteAdminNotificationById({ adminId, notificationId });
  if (!deleted) {
    throw new ApiError(404, "Notification not found");
  }
  const unread = await countUnreadAdminNotifications({ adminId });
  return { unread: Number(unread || 0) };
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
  fetchAllUsers,
  updateTeamUserCapabilities,
  deactivateAccount,
  activateAccount,
  removeUserAccount,
  listNewsletterSubscribers,
  getNewsletterSubscribersExportRows,
  listContactMessages,
  getContactMessagesExportRows,
  syncNewsletterSubscribersToMailchimp,
  getAdminNotifications,
  markAdminNotificationsRead,
  deleteAdminNotification
};
