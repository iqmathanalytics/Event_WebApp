import api from "./api";

export async function submitContactMessage(payload) {
  const response = await api.post("/contact/", {
    name: payload.name,
    email: payload.email,
    subject: payload.subject,
    message: payload.message,
    ...(payload.city_id != null && payload.city_id !== ""
      ? { city_id: Number(payload.city_id) }
      : {})
  });
  return response.data;
}
