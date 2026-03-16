import api from "./api";

export async function fetchEvents(params = {}) {
  const response = await api.get("/events", { params });
  return response.data;
}

export async function fetchEventById(id) {
  const response = await api.get(`/events/${id}`);
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
