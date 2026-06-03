import api, { optionalAuthRequest } from "./api";

export async function createFavorite(payload) {
  const response = await api.post("/favorites", payload, optionalAuthRequest);
  return response.data;
}

export async function fetchFavorites(params = {}) {
  const response = await api.get("/favorites", { ...optionalAuthRequest, params });
  return response.data;
}

export async function deleteFavorite(payload) {
  const response = await api.delete("/favorites", { ...optionalAuthRequest, data: payload });
  return response.data;
}
