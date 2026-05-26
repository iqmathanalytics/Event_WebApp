import { useCallback, useEffect, useMemo, useState } from "react";
import useAuth from "./useAuth";
import { createFavorite, deleteFavorite, fetchFavorites } from "../services/favoriteService";

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

function useFavorites() {
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  const favoriteKeys = useMemo(
    () => new Set(favorites.map((item) => makeFavoriteKey(item.listing_type, item.listing_id))),
    [favorites]
  );

  const loadFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setFavorites([]);
      return;
    }
    try {
      setLoading(true);
      const response = await fetchFavorites();
      setFavorites(response?.data || []);
    } catch (_err) {
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const isFavorite = useCallback(
    (listingType, listingId) =>
      favoriteKeys.has(
        makeFavoriteKey(String(listingType || "").toLowerCase(), Number(listingId))
      ),
    [favoriteKeys]
  );

  const toggleFavorite = useCallback(
    async ({ listingType, listingId }) => {
      if (!isAuthenticated) {
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
          redirectToAuthForFavorites();
          return { requiresAuth: true };
        }
        throw err;
      }
    },
    [favoriteKeys, isAuthenticated, loadFavorites]
  );

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return {
    favorites,
    loading,
    loadFavorites,
    isFavorite,
    toggleFavorite
  };
}

export default useFavorites;
