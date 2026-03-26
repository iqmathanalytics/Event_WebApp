import { createContext, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";

const AuthContext = createContext(null);

function getStoredUser() {
  const raw = localStorage.getItem("user");
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [accessToken, setAccessToken] = useState(localStorage.getItem("accessToken"));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem("refreshToken"));

  useEffect(() => {
    if (accessToken) {
      localStorage.setItem("accessToken", accessToken);
    } else {
      localStorage.removeItem("accessToken");
    }
  }, [accessToken]);

  useEffect(() => {
    if (refreshToken) {
      localStorage.setItem("refreshToken", refreshToken);
    } else {
      localStorage.removeItem("refreshToken");
    }
  }, [refreshToken]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  const login = (payload) => {
    if (payload?.accessToken) {
      localStorage.setItem("accessToken", payload.accessToken);
    }
    if (payload?.refreshToken) {
      localStorage.setItem("refreshToken", payload.refreshToken);
    } else {
      localStorage.removeItem("refreshToken");
    }
    if (payload?.user) {
      localStorage.setItem("user", JSON.stringify(payload.user));
    }
    flushSync(() => {
      setAccessToken(payload.accessToken ?? null);
      setRefreshToken(payload.refreshToken || null);
      setUser(payload.user ?? null);
    });
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    flushSync(() => {
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    });
  };

  const value = useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(accessToken && user),
      isAdmin: user?.role === "admin",
      isOrganizer: Boolean(user?.organizer_enabled) || user?.role === "organizer",
      isUser: user?.role === "user",
      canPostEvents: Boolean(user?.can_post_events),
      canCreateInfluencerProfile: Boolean(user?.can_create_influencer_profile),
      canPostDeals: Boolean(user?.can_post_deals),
      login,
      logout
    }),
    [user, accessToken, refreshToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
