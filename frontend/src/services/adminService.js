import api from "./api";

export async function fetchAdminAnalytics(params = {}) {
  const response = await api.get("/admin/analytics/counts", { params });
  return response.data;
}

export async function fetchAdminListings(params = {}) {
  const response = await api.get("/admin/listings", { params });
  return response.data;
}

/**
 * Load one listing row for admin modals. Uses GET /admin/listings?type=&id= so it works
 * on hosts that have not deployed GET /admin/listings/:type/:id yet.
 */
export async function fetchAdminListingById(type, id) {
  const want = String(id);
  try {
    const byId = await api.get(`/admin/listings/${type}/${want}`);
    const row = byId.data?.data;
    if (row != null && String(row.id) === want) {
      return { success: byId.data?.success !== false, data: row };
    }
  } catch (err) {
    if (err?.response?.status !== 404) {
      /* try list fallback below */
    }
  }
  const response = await api.get("/admin/listings", {
    params: { type, id: want }
  });
  const body = response.data;
  const raw = body?.data;
  const rows = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];
  const row = rows.find((r) => r != null && String(r.id) === want) ?? null;
  return { success: body?.success !== false, data: row };
}

export async function updateAdminListingStatus({ type, id, status, note }) {
  const response = await api.patch(`/admin/listings/${type}/${id}/status`, {
    status,
    note
  });
  return response.data;
}

export async function updateAdminEventListed({ id, is_listed }) {
  const response = await api.patch(`/admin/listings/events/${id}/listed`, { is_listed });
  return response.data;
}

export async function editAdminListing({ type, id, payload }) {
  const response = await api.patch(`/admin/listings/${type}/${id}`, payload);
  return response.data;
}

export async function deleteAdminListing({ type, id }) {
  const response = await api.delete(`/admin/listings/${type}/${id}`);
  return response.data;
}

export async function createTeamUser(payload) {
  const response = await api.post("/admin/team/users", payload);
  return response.data;
}

export async function fetchTeamUsers(role) {
  const response = await api.get("/admin/team/users", {
    params: { role }
  });
  return response.data;
}

export async function fetchAdminUsers() {
  const response = await api.get("/admin/users");
  return response.data;
}

export async function deactivateTeamUser(id) {
  const response = await api.patch(`/admin/team/users/${id}/deactivate`);
  return response.data;
}

export async function activateTeamUser(id) {
  const response = await api.patch(`/admin/team/users/${id}/activate`);
  return response.data;
}

export async function deleteAdminUser(id) {
  const response = await api.delete(`/admin/users/${id}`);
  return response.data;
}

export async function updateTeamUserCapabilities(id, payload) {
  const response = await api.patch(`/admin/team/users/${id}/capabilities`, payload);
  return response.data;
}

export async function fetchAdminEventInsights(eventId, { hourlyDate } = {}) {
  const params = {};
  if (hourlyDate) {
    params.hourly_date = hourlyDate;
  }
  const response = await api.get(`/admin/events/${eventId}/insights`, { params });
  return response.data;
}

export async function fetchAdminBookings(params = {}) {
  const response = await api.get("/admin/bookings", { params });
  return response.data;
}

export async function exportAdminBookings(params = {}) {
  const format = params.format || "csv";
  const response = await api.get("/admin/bookings/export", {
    params,
    responseType: "blob"
  });
  return { blob: response.data, format };
}

export async function fetchAdminNewsletterSubscribers(params = {}) {
  const response = await api.get("/admin/newsletter/subscribers", { params });
  return response.data;
}

export async function exportAdminNewsletterSubscribers(params = {}) {
  const format = params.format || "csv";
  const response = await api.get("/admin/newsletter/subscribers/export", {
    params: { ...params, format },
    responseType: "blob"
  });
  return { blob: response.data, format };
}

export async function syncAdminNewsletterSubscribersToMailchimp() {
  const response = await api.post("/admin/newsletter/subscribers/sync-mailchimp");
  return response.data;
}

export async function deleteAdminNewsletterSubscriber(id) {
  const response = await api.delete(`/admin/newsletter/subscribers/${id}`);
  return response.data;
}

export async function fetchAdminContactMessages(params = {}) {
  const response = await api.get("/admin/contact/messages", { params });
  return response.data;
}

export async function exportAdminContactMessages(params = {}) {
  const format = params.format || "csv";
  const response = await api.get("/admin/contact/messages/export", {
    params: { ...params, format },
    responseType: "blob"
  });
  return { blob: response.data, format };
}

export async function fetchAdminNotifications(params = {}) {
  const response = await api.get("/admin/notifications", { params });
  return response.data;
}

export async function markAdminNotificationsRead() {
  const response = await api.patch("/admin/notifications/read");
  return response.data;
}

export async function deleteAdminNotification(id) {
  const response = await api.delete(`/admin/notifications/${id}`);
  return response.data;
}
