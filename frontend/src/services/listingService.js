import api, { postKeepalive } from "./api";
import { encodePublicListingParam } from "../utils/listingPaths";

export async function fetchInfluencers(params = {}) {
  const response = await api.get("/influencers", { params });
  return response.data;
}

export async function fetchDeals(params = {}) {
  const response = await api.get("/deals", { params });
  return response.data;
}

export async function fetchDealById(slugOrId) {
  const response = await api.get(`/deals/${encodePublicListingParam(slugOrId)}`);
  return response.data;
}

export function trackDealClick(slugOrId) {
  const path = `/deals/${encodePublicListingParam(slugOrId)}/track-click`;
  return postKeepalive(path).catch(() => ({ success: false }));
}

export function trackDealView(slugOrId) {
  const path = `/deals/${encodePublicListingParam(slugOrId)}/track-view`;
  return postKeepalive(path).catch(() => ({ success: false }));
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

export async function fetchInfluencerDetails(slugOrId) {
  const response = await api.get(`/influencers/${encodePublicListingParam(slugOrId)}/details`);
  return response.data;
}

export async function fetchInfluencerMedia(slugOrId) {
  const response = await api.get(`/influencers/${encodePublicListingParam(slugOrId)}/media`);
  return response.data;
}

export async function uploadInfluencerMedia(id, imageUrls) {
  const response = await api.post(`/influencers/${id}/media`, {
    image_urls: imageUrls
  });
  return response.data;
}

export function trackInfluencerView(slugOrId) {
  const path = `/influencers/${encodePublicListingParam(slugOrId)}/track-view`;
  return postKeepalive(path).catch(() => ({ success: false }));
}

export function trackInfluencerClick(slugOrId) {
  const path = `/influencers/${encodePublicListingParam(slugOrId)}/track-click`;
  return postKeepalive(path).catch(() => ({ success: false }));
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
