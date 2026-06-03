import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import useAuth from "../hooks/useAuth";
import { createFavorite, deleteFavorite, fetchFavorites } from "../services/favoriteService";

const FavoritesContext = createContext(null);

function makeFavoriteKey(listingType, listingId) {
  return `${listingType}:${listingId}`;
}

function redirectToAuthForFavorites() {
  if (typeof window === "undefined" || !window.location) {
    return;
  }
  const next = `${window.location.pathname || "/"}${window.location.search || ""}`;
  window.location.href = `/login?next=${encodeURIComponent(next)}`;
}

export function FavoritesProvider({ children }) {
  const { accessToken, invalidateSession } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadGenerationRef = useRef(0);

  const favoriteKeys = useMemo(
    () => new Set(favorites.map((item) => makeFavoriteKey(item.listing_type, item.listing_id))),
    [favorites]
  );

  const loadFavorites = useCallback(async () => {
    if (!accessToken) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;

    try {
      setLoading(true);
      const response = await fetchFavorites();
      if (loadGenerationRef.current !== generation) {
        return;
      }
      setFavorites(response?.data || []);
    } catch (err) {
      if (loadGenerationRef.current !== generation) {
        return;
      }
      setFavorites([]);
      if (err?.response?.status === 401) {
        invalidateSession();
      }
    } finally {
      if (loadGenerationRef.current === generation) {
        setLoading(false);
      }
    }
  }, [accessToken, invalidateSession]);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const isFavorite = useCallback(
    (listingType, listingId) =>
      favoriteKeys.has(
        makeFavoriteKey(String(listingType || "").toLowerCase(), Number(listingId))
      ),
    [favoriteKeys]
  );

  const toggleFavorite = useCallback(
    async ({ listingType, listingId }) => {
      if (!accessToken) {
        redirectToAuthForFavorites();
        return { requiresAuth: true };
      }
      const normalizedType = String(listingType || "").toLowerCase();
      const normalizedId = Number(listingId);
      if (!normalizedType || !Number.isFinite(normalizedId) || normalizedId <= 0) {
        return { requiresAuth: false };
      }
      try {
        const key = makeFavoriteKey(normalizedType, normalizedId);
        const exists = favoriteKeys.has(key);

        if (exists) {
          await deleteFavorite({
            listing_type: normalizedType,
            listing_id: normalizedId
          });
          setFavorites((prev) =>
            prev.filter(
              (item) =>
                !(
                  String(item.listing_type).toLowerCase() === normalizedType &&
                  Number(item.listing_id) === normalizedId
                )
            )
          );
        } else {
          await createFavorite({
            listing_type: normalizedType,
            listing_id: normalizedId
          });
          await loadFavorites();
        }

        return { requiresAuth: false };
      } catch (err) {
        if (err?.response?.status === 401) {
          invalidateSession();
          redirectToAuthForFavorites();
          return { requiresAuth: true };
        }
        throw err;
      }
    },
    [accessToken, favoriteKeys, invalidateSession, loadFavorites]
  );

  const value = useMemo(
    () => ({
      favorites,
      loading,
      loadFavorites,
      isFavorite,
      toggleFavorite
    }),
    [favorites, loading, loadFavorites, isFavorite, toggleFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export default function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}
