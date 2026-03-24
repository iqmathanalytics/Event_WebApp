import api from "./api";

export async function subscribeNewsletter({ city_id }) {
  const response = await api.post("/newsletter/subscribe", {
    ...(city_id != null && city_id !== "" ? { city_id: Number(city_id) } : {})
  });
  return response.data;
}

export async function fetchMyNewsletterStatus(city_id) {
  const response = await api.get("/newsletter/me/status", {
    params: city_id ? { city_id: String(city_id) } : {}
  });
  return response.data;
}
