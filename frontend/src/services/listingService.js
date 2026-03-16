import api from "./api";

export async function fetchInfluencers(params = {}) {
  const response = await api.get("/influencers", { params });
  return response.data;
}

export async function fetchDeals(params = {}) {
  const response = await api.get("/deals", { params });
  return response.data;
}

export async function fetchServices(params = {}) {
  const response = await api.get("/services", { params });
  return response.data;
}
