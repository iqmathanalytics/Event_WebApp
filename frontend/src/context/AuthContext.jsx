import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { invalidateNewsletterStatusCache } from "../services/newsletterService";
import { refreshAccessToken } from "../services/authService";
import { fetchMyProfile } from "../services/userService";

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
  const lastSessionRefreshAt = useRef(0);

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
    const existingUser = getStoredUser();
    let nextUser = payload?.user ?? null;
    const uid = payload?.userId ?? payload?.user?.id;
    if (nextUser && uid != null && nextUser.id == null) {
      const idNum = Number(uid);
      nextUser = { ...nextUser, id: Number.isFinite(idNum) ? idNum : uid };
    }
    if (nextUser && existingUser && String(existingUser.id) === String(nextUser.id)) {
      nextUser = {
        ...existingUser,
        ...nextUser,
        dealer_profile: nextUser.dealer_profile ?? existingUser.dealer_profile ?? null,
        onboarding: nextUser.onboarding ?? existingUser.onboarding ?? null
      };
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

  /** Clear stale tokens without logout overlay or login redirect (e.g. expired session on a public page). */
  const invalidateSession = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refreshSession = useCallback(async () => {
    if (!accessToken) {
      return;
    }
    const now = Date.now();
    if (now - lastSessionRefreshAt.current < 3000) {
      return;
    }
    lastSessionRefreshAt.current = now;

    const storedRefresh = refreshToken || localStorage.getItem("refreshToken");
    try {
      const profile = await fetchMyProfile({ optionalAuth: true });
      const fullUser = profile?.data;
      if (fullUser) {
        const storedRefresh = refreshToken || localStorage.getItem("refreshToken");
        if (storedRefresh) {
          try {
            const refreshed = await refreshAccessToken(storedRefresh);
            const payload = refreshed?.data;
            if (payload?.accessToken) {
              login({
                accessToken: payload.accessToken,
                refreshToken: payload.refreshToken || storedRefresh,
                user: fullUser
              });
              return;
            }
          } catch (_err) {
            /* use profile only */
          }
        }
        setUser((prev) => {
          const next = {
            ...(prev || getStoredUser() || {}),
            ...fullUser,
            dealer_profile: fullUser.dealer_profile ?? prev?.dealer_profile ?? null,
            onboarding: fullUser.onboarding ?? prev?.onboarding ?? null
          };
          localStorage.setItem("user", JSON.stringify(next));
          return next;
        });
      }
    } catch (_err) {
      /* ignore */
    }
  }, [accessToken, refreshToken]);

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshSession();
      }
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [accessToken, refreshSession]);

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
      canSellPlatformTickets: Boolean(user?.can_sell_platform_tickets) || user?.role === "admin",
      login,
      logout,
      refreshSession,
      invalidateSession,
      isLoggingOut
    }),
    [user, accessToken, refreshToken, isLoggingOut, refreshSession, invalidateSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
