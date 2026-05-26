import api from "./api";

export async function createBooking(payload) {
  const response = await api.post("/bookings", payload);
  return response.data;
}

/** Free or sub-minimum total — no Stripe. */
export async function createBookingCheckout(payload) {
  const response = await api.post("/bookings/checkout", payload);
  return response.data;
}

export async function createBookingPaymentIntent(payload) {
  const response = await api.post("/bookings/payment-intent", payload);
  return response.data;
}

export async function confirmBookingPayment(payment_intent_id) {
  const response = await api.post("/bookings/confirm-payment", { payment_intent_id });
  return response.data;
}

export async function fetchMyBookings() {
  const response = await api.get("/users/my-bookings");
  return response.data;
}

export async function fetchOrganizerBookings(params = {}) {
  const response = await api.get("/bookings/organizer", { params });
  return response.data;
}

export async function exportOrganizerBookings(params = {}) {
  const format = params.format || "csv";
  const response = await api.get("/bookings/organizer/export", {
    params,
    responseType: "blob"
  });
  return { blob: response.data, format };
}

export async function fetchAdminBookings(params = {}) {
  const response = await api.get("/admin/bookings", { params });
  return response.data;
}

export async function exportAdminBookings(params = {}) {
  const format = params.format || "csv";
  const response = await api.get("/admin/bookings/export", {
    params,
    responseType: "blob"
  });
  return { blob: response.data, format };
}
