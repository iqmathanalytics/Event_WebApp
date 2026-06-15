import api from "./api";

export async function fetchOrganizerSeatingDesigner(eventId) {
  const { data } = await api.get(`/events/${eventId}/seating/designer`);
  return data;
}

export async function saveOrganizerSeatingConfig(eventId, payload) {
  const { data } = await api.put(`/events/${eventId}/seating`, payload);
  return data;
}

export async function fetchPublicSeatingChart(eventId) {
  const { data } = await api.get(`/events/${eventId}/seating/chart`);
  return data;
}

export async function releaseSeatsioHold(eventId, { eventKey, holdToken, labels }) {
  const { data } = await api.post(`/events/${eventId}/seating/release-hold`, {
    event_key: eventKey,
    hold_token: holdToken,
    labels
  });
  return data;
}
