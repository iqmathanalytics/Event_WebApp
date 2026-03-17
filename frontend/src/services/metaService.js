import api from "./api";

export async function fetchCities(params = {}) {
  const response = await api.get("/meta/cities", { params });
  return response.data;
}
