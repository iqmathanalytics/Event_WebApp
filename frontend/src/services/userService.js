import api from "./api";

export async function enableOrganizer() {
  const response = await api.post("/users/enable-organizer");
  return response.data;
}

export async function fetchMyProfile() {
  const response = await api.get("/users/me");
  return response.data;
}

export async function updateMyProfile(payload) {
  const response = await api.patch("/users/me", payload);
  return response.data;
}

