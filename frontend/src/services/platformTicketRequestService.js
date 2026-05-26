import api from "./api";

export async function fetchMyPlatformTicketAccessRequest() {
  const response = await api.get("/users/platform-ticket-access-request");
  return response.data;
}

export async function submitPlatformTicketAccessRequest(payload) {
  const response = await api.post("/users/platform-ticket-access-request", payload);
  return response.data;
}

export async function fetchAdminPlatformTicketAccessRequests(params = {}) {
  const response = await api.get("/admin/platform-ticket-access-requests", { params });
  return response.data;
}

export async function approveAdminPlatformTicketAccessRequest(id, { note } = {}) {
  const response = await api.patch(`/admin/platform-ticket-access-requests/${id}/approve`, { note });
  return response.data;
}

export async function rejectAdminPlatformTicketAccessRequest(id, { note } = {}) {
  const response = await api.patch(`/admin/platform-ticket-access-requests/${id}/reject`, { note });
  return response.data;
}
