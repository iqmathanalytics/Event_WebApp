import api from "./api";

export async function fetchOrganizerCoupons() {
  const response = await api.get("/bookings/coupons");
  return response.data;
}

export async function createOrganizerCoupon(payload) {
  const response = await api.post("/bookings/coupons", payload);
  return response.data;
}

export async function updateOrganizerCoupon(id, payload) {
  const response = await api.patch(`/bookings/coupons/${id}`, payload);
  return response.data;
}

export async function deactivateOrganizerCoupon(id) {
  const response = await api.post(`/bookings/coupons/${id}/deactivate`);
  return response.data;
}

export async function activateOrganizerCoupon(id) {
  const response = await api.post(`/bookings/coupons/${id}/activate`);
  return response.data;
}

export async function deleteOrganizerCoupon(id) {
  const response = await api.delete(`/bookings/coupons/${id}`);
  return response.data;
}

export function clientTimezoneOffsetMinutes() {
  return new Date().getTimezoneOffset();
}

export async function validateEventCoupon(payload) {
  const response = await api.post("/bookings/validate-coupon", {
    ...payload,
    timezone_offset: clientTimezoneOffsetMinutes()
  });
  return response.data;
}

export async function resumeEventCouponHold({ event_id, hold_token }) {
  const response = await api.post("/bookings/resume-coupon-hold", {
    event_id,
    hold_token,
    timezone_offset: clientTimezoneOffsetMinutes()
  });
  return response.data;
}

export async function releaseEventCouponHold({ event_id, hold_token }) {
  const response = await api.post("/bookings/release-coupon-hold", {
    event_id,
    hold_token
  });
  return response.data;
}
