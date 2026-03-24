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
    (listingType, listingId) => favoriteKeys.has(makeFavoriteKey(listingType, listingId)),
    [favoriteKeys]
  );

  const toggleFavorite = useCallback(
    async ({ listingType, listingId }) => {
      if (!isAuthenticated) {
        redirectToAuthForFavorites();
        return { requiresAuth: true };
      }
      try {
        const key = makeFavoriteKey(listingType, listingId);
        const exists = favoriteKeys.has(key);

        if (exists) {
          await deleteFavorite({
            listing_type: listingType,
            listing_id: listingId
          });
          setFavorites((prev) =>
            prev.filter(
              (item) => !(item.listing_type === listingType && Number(item.listing_id) === Number(listingId))
            )
          );
        } else {
          await createFavorite({
            listing_type: listingType,
            listing_id: listingId
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
