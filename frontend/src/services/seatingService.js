import api, { optionalAuthRequest } from "./api";

export async function fetchOrganizerSeatingDesigner(eventId) {
  const { data } = await api.get(`/events/${eventId}/seating/designer`);
  return data;
}

export async function saveOrganizerSeatingConfig(eventId, payload) {
  const { data } = await api.put(`/events/${eventId}/seating`, payload);
  return data;
}

/** Buyer chart + server-side hold session (chart uses session=none; holds via API). */
export async function fetchPublicSeatingChart(eventId, { holdToken } = {}) {
  const params = {};
  if (holdToken) {
    params.hold_token = holdToken;
  } else {
    params.session = "1";
  }
  const { data } = await api.get(`/events/${eventId}/seating/chart`, {
    params,
    timeout: 30000,
    ...optionalAuthRequest
  });
  return data;
}

export async function syncSeatsioHold(eventId, { eventKey, holdToken, add = [], remove = [] }) {
  const { data } = await api.post(`/events/${eventId}/seating/sync-hold`, {
    event_key: eventKey,
    hold_token: holdToken,
    add,
    remove
  });
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
