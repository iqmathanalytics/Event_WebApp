import api, { postKeepalive } from "./api";
import { encodePublicListingParam } from "../utils/listingPaths";

export async function fetchEvents(params = {}) {
  const response = await api.get("/events", { params });
  return response.data;
}

export async function fetchFeaturedEvents(params = {}) {
  const response = await api.get("/events/featured", { params });
  return response.data;
}

export async function fetchEventById(slugOrId) {
  const response = await api.get(`/events/${encodePublicListingParam(slugOrId)}`);
  return response.data;
}

export async function fetchMyEvents() {
  const response = await api.get("/events/my-events");
  return response.data;
}

export async function createEvent(payload) {
  const response = await api.post("/events", payload);
  return response.data;
}

export async function updateEvent(id, payload) {
  const response = await api.put(`/events/${id}`, payload);
  return response.data;
}

export async function deleteEvent(id) {
  const response = await api.delete(`/events/${id}`);
  return response.data;
}

export function trackEventClick(slugOrId, payload = {}) {
  const path = `/events/${encodePublicListingParam(slugOrId)}/track-click`;
  return postKeepalive(path, payload).catch(() => ({ success: false }));
}

export function trackEventView(slugOrId, payload = {}) {
  const path = `/events/${encodePublicListingParam(slugOrId)}/track-view`;
  return postKeepalive(path, payload).catch(() => ({ success: false }));
}
