import api from "./api";

export async function fetchEventVendorShares(eventId) {
  const response = await api.get(`/events/${eventId}/vendor-shares`);
  return response.data;
}

export async function createEventVendorShare(eventId, { email, vendor_code } = {}) {
  const body = { email };
  if (vendor_code) {
    body.vendor_code = vendor_code;
  }
  const response = await api.post(`/events/${eventId}/vendor-shares`, body);
  return response.data;
}

export async function revokeEventVendorShare(eventId, shareId) {
  const response = await api.delete(`/events/${eventId}/vendor-shares/${shareId}`);
  return response.data;
}

export async function acceptVendorInvite(token) {
  const response = await api.post("/events/vendor-invites/accept", { token });
  return response.data;
}

export async function fetchSharedVendorEvents() {
  const response = await api.get("/events/vendor/shared");
  return response.data;
}

export async function fetchOwnedVendorEvents() {
  const response = await api.get("/events/vendor/owned");
  return response.data;
}

export async function fetchVendorInsights(eventId, { shareId, vendorCode } = {}) {
  const params = {};
  if (shareId) {
    params.share_id = shareId;
  }
  if (vendorCode) {
    params.vendor_code = vendorCode;
  }
  const response = await api.get(`/events/vendor/insights/${eventId}`, { params, timeout: 60_000 });
  return response.data;
}

export async function fetchVendorBookings(eventId, { shareId, vendorCode } = {}) {
  const params = {};
  if (shareId) {
    params.share_id = shareId;
  }
  if (vendorCode) {
    params.vendor_code = vendorCode;
  }
  const response = await api.get(`/events/vendor/bookings/${eventId}`, { params, timeout: 60_000 });
  return response.data;
}

export async function recordVendorLinkHit(eventId, { vendor_code, session_key, path }) {
  const response = await api.post(`/events/${eventId}/vendor-hits`, {
    vendor_code,
    session_key,
    path
  });
  return response.data;
}
