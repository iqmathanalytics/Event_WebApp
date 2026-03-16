import api from "./api";

export async function createFavorite(payload) {
  const response = await api.post("/favorites", payload);
  return response.data;
}

export async function fetchFavorites(params = {}) {
  const response = await api.get("/favorites", { params });
  return response.data;
}

export async function deleteFavorite(payload) {
  const response = await api.delete("/favorites", { data: payload });
  return response.data;
}
