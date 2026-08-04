import api from "./api";

const insightsRequest = { timeout: 90_000 };

export async function fetchOrganizerInsightsSummary() {
  const response = await api.get("/events/organizer/insights", insightsRequest);
  return response.data;
}

export async function fetchOrganizerEventInsights(eventId, { hourlyDate } = {}) {
  const params = {};
  if (hourlyDate) {
    params.hourly_date = hourlyDate;
  }
  const response = await api.get(`/events/organizer/insights/${eventId}`, {
    ...insightsRequest,
    params
  });
  return response.data;
}

export async function fetchSharedOrganizerInsights() {
  const response = await api.get("/events/organizer/shared-insights", insightsRequest);
  return response.data;
}

export async function fetchEventAnalyticsShares(eventId) {
  const response = await api.get(`/events/${eventId}/analytics-shares`);
  return response.data;
}

export async function createEventAnalyticsShare(eventId, email) {
  const response = await api.post(`/events/${eventId}/analytics-shares`, { email });
  return response.data;
}

export async function revokeEventAnalyticsShare(eventId, shareId) {
  const response = await api.delete(`/events/${eventId}/analytics-shares/${shareId}`);
  return response.data;
}

export async function acceptAnalyticsInvite(token) {
  const response = await api.post("/events/organizer/analytics-invites/accept", { token });
  return response.data;
}
