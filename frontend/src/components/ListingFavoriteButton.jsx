import { FiHeart } from "react-icons/fi";
import useFavorites from "../hooks/useFavorites";

/**
 * Compact save control for listing detail cards (sits left of Share).
 */
export default function ListingFavoriteButton({ listingType, listingId, className = "" }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = isFavorite(listingType, listingId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggleFavorite({ listingType, listingId });
      }}
      className={`absolute top-4 z-[1] grid h-9 w-9 place-content-center rounded-full border border-slate-200/90 bg-white/95 text-slate-600 shadow-sm ring-1 ring-slate-900/[0.03] backdrop-blur-sm transition hover:border-slate-300 hover:bg-white hover:text-rose-600 sm:top-5 lg:top-6 ${
        saved ? "text-rose-600" : ""
      } ${className}`}
      aria-label={saved ? "Remove from favourites" : "Save to favourites"}
      aria-pressed={saved}
    >
      <FiHeart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
    </button>
  );
}
