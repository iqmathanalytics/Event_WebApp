import axios from "axios";

const defaultBaseURL = import.meta.env.PROD
  ? "https://city-events-lifestyle-hub-api.onrender.com/api/v1"
  : "http://localhost:5000/api/v1";
const baseURL = import.meta.env.VITE_API_BASE_URL || defaultBaseURL;
const api = axios.create({
  baseURL,
  timeout: 15000
});
const refreshClient = axios.create({
  baseURL,
  timeout: 15000
});
let refreshPromise = null;

function redirectToLogin() {
  if (typeof window === "undefined" || !window.location) {
    return;
  }
  const isStaffArea = window.location.pathname.startsWith("/organizer") || window.location.pathname.startsWith("/admin");
  const loginPath = isStaffArea ? "/staff-login" : "/login";
  if (window.location.pathname !== loginPath) {
    window.location.href = loginPath;
  }
}

function clearAuthStorage() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;
    const requestUrl = originalRequest?.url || "";
    const isAuthRequest =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh-token");

    if (status === 401 && !isAuthRequest && originalRequest && !originalRequest.__isRetryRequest) {
      const storedRefreshToken = localStorage.getItem("refreshToken");
      if (!storedRefreshToken) {
        clearAuthStorage();
        redirectToLogin();
        return Promise.reject(error);
      }

      try {
        if (!refreshPromise) {
          refreshPromise = refreshClient
            .post("/auth/refresh-token", { refreshToken: storedRefreshToken })
            .then((response) => response?.data?.data)
            .finally(() => {
              refreshPromise = null;
            });
        }

        const refreshedAuth = await refreshPromise;
        if (!refreshedAuth?.accessToken || !refreshedAuth?.refreshToken || !refreshedAuth?.user) {
          throw new Error("Invalid refresh response");
        }

        localStorage.setItem("accessToken", refreshedAuth.accessToken);
        localStorage.setItem("refreshToken", refreshedAuth.refreshToken);
        localStorage.setItem("user", JSON.stringify(refreshedAuth.user));

        originalRequest.__isRetryRequest = true;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${refreshedAuth.accessToken}`;
        return api(originalRequest);
      } catch (_refreshErr) {
        clearAuthStorage();
        redirectToLogin();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
