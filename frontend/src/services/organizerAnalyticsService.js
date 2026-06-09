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
