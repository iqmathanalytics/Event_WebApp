import api from "./api";

export async function fetchInfluencers(params = {}) {
  const response = await api.get("/influencers", { params });
  return response.data;
}

export async function fetchDeals(params = {}) {
  const response = await api.get("/deals", { params });
  return response.data;
}

export async function fetchDealById(id) {
  const response = await api.get(`/deals/${id}`);
  return response.data;
}

export async function trackDealClick(dealId) {
  const response = await api.post(`/deals/${dealId}/track-click`);
  return response.data;
}

export async function trackDealView(dealId) {
  const response = await api.post(`/deals/${dealId}/track-view`);
  return response.data;
}

export async function fetchServices(params = {}) {
  const response = await api.get("/services", { params });
  return response.data;
}

export async function createInfluencerProfile(payload) {
  const response = await api.post("/influencers", payload);
  return response.data;
}

export async function fetchMyInfluencerSubmissions() {
  const response = await api.get("/influencers/my-submissions");
  return response.data;
}

export async function updateInfluencerProfile(id, payload) {
  const response = await api.put(`/influencers/${id}`, payload);
  return response.data;
}

export async function fetchInfluencerDetails(id) {
  const response = await api.get(`/influencers/${id}/details`);
  return response.data;
}

export async function fetchInfluencerMedia(id) {
  const response = await api.get(`/influencers/${id}/media`);
  return response.data;
}

export async function uploadInfluencerMedia(id, imageUrls) {
  const response = await api.post(`/influencers/${id}/media`, {
    image_urls: imageUrls
  });
  return response.data;
}

export async function trackInfluencerView(id) {
  const response = await api.post(`/influencers/${id}/track-view`);
  return response.data;
}

export async function trackInfluencerClick(id) {
  const response = await api.post(`/influencers/${id}/track-click`);
  return response.data;
}

export async function createDeal(payload) {
  const response = await api.post("/deals", payload);
  return response.data;
}

export async function fetchMyDealSubmissions() {
  const response = await api.get("/deals/my-submissions");
  return response.data;
}

export async function updateDealSubmission(id, payload) {
  const response = await api.put(`/deals/${id}`, payload);
  return response.data;
}
