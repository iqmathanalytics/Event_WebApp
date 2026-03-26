import api from "./api";

export async function loginUser(payload) {
  const response = await api.post("/auth/login/user", payload);
  return response.data;
}

export async function register(payload) {
  const response = await api.post("/auth/register", payload);
  return response.data;
}

export async function loginStaff(payload) {
  const response = await api.post("/auth/login/staff", payload);
  return response.data;
}

export async function refreshAccessToken(refreshToken) {
  const response = await api.post("/auth/refresh-token", { refreshToken });
  return response.data;
}

export async function loginWithGoogle(idToken) {
  const response = await api.post("/auth/google/login", { idToken });
  return response.data;
}

export async function registerWithGoogle(idToken) {
  const response = await api.post("/auth/google/register", { idToken });
  return response.data;
}
