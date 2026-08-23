import api, { optionalAuthRequest } from "./api";

export async function lookupCheckInTicket(code) {
  const response = await api.get(
    "/public/check-in/verify",
    {
      params: { code: String(code || "").trim() },
      timeout: 8000,
      ...optionalAuthRequest
    }
  );
  return response.data;
}

export async function checkInTicket(code) {
  const response = await api.post(
    "/public/check-in",
    { code: String(code || "").trim() },
    {
      timeout: 8000,
      ...optionalAuthRequest
    }
  );
  return response.data;
}
