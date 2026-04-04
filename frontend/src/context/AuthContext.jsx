import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { invalidateNewsletterStatusCache } from "../services/newsletterService";

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

const LOGOUT_CLEAR_MS = 260;
const LOGOUT_OVERLAY_HOLD_MS = 520;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());
  const [accessToken, setAccessToken] = useState(localStorage.getItem("accessToken"));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem("refreshToken"));
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutOnceRef = useRef(false);

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
    let nextUser = payload?.user ?? null;
    const uid = payload?.userId ?? payload?.user?.id;
    if (nextUser && uid != null && nextUser.id == null) {
      const idNum = Number(uid);
      nextUser = { ...nextUser, id: Number.isFinite(idNum) ? idNum : uid };
    }
    if (nextUser) {
      localStorage.setItem("user", JSON.stringify(nextUser));
    }
    invalidateNewsletterStatusCache();
    flushSync(() => {
      setAccessToken(payload.accessToken ?? null);
      setRefreshToken(payload.refreshToken || null);
      setUser(nextUser);
    });
  };

  const clearSession = useCallback(() => {
    invalidateNewsletterStatusCache();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    flushSync(() => {
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    });
  }, []);

  const logout = useCallback(() => {
    if (logoutOnceRef.current) {
      return;
    }
    logoutOnceRef.current = true;
    setIsLoggingOut(true);
    window.setTimeout(() => {
      clearSession();
    }, LOGOUT_CLEAR_MS);
    window.setTimeout(() => {
      setIsLoggingOut(false);
      logoutOnceRef.current = false;
    }, LOGOUT_CLEAR_MS + LOGOUT_OVERLAY_HOLD_MS);
  }, [clearSession]);

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
      logout,
      isLoggingOut
    }),
    [user, accessToken, refreshToken, isLoggingOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
