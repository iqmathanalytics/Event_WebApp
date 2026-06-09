import { ensureAccessTokenFresh } from "../services/api";

function tokenExpired(token) {
  if (!token) {
    return true;
  }
  try {
    const part = token.split(".")[1];
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return !json.exp || json.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export async function bootstrapAuthSession() {
  const hasSession = Boolean(localStorage.getItem("accessToken") || localStorage.getItem("refreshToken"));
  if (!hasSession) {
    return { ok: true, accessToken: null, refreshToken: null, user: null };
  }
  try {
    const storedAccess = localStorage.getItem("accessToken");
    const accessToken = await ensureAccessTokenFresh({
      force: tokenExpired(storedAccess)
    });
    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      user = null;
    }
    return {
      ok: Boolean(accessToken),
      accessToken,
      refreshToken: localStorage.getItem("refreshToken"),
      user
    };
  } catch {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    return { ok: false, accessToken: null, refreshToken: null, user: null };
  }
}
