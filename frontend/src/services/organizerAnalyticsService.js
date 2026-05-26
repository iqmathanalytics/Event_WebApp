import api from "./api";

export async function fetchOrganizerInsightsSummary() {
  const response = await api.get("/events/organizer/insights");
  return response.data;
}

export async function fetchOrganizerEventInsights(eventId, { hourlyDate } = {}) {
  const params = {};
  if (hourlyDate) {
    params.hourly_date = hourlyDate;
  }
  const response = await api.get(`/events/organizer/insights/${eventId}`, { params });
  return response.data;
}
