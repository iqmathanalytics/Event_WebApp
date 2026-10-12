import { FiHeart } from "react-icons/fi";
import useFavorites from "../hooks/useFavorites";

/**
 * Compact save control for listing detail cards (sits left of Share).
 */
export default function ListingFavoriteButton({
  listingType,
  listingId,
  className = "",
  embedded = false,
  label = "",
}) {
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
      className={`z-[1] inline-flex h-11 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-900/[0.03] backdrop-blur-sm transition hover:border-slate-300 hover:bg-white hover:text-rose-600 ${
        label ? "gap-1.5 px-2.5 lg:h-9 lg:w-9 lg:gap-0 lg:px-0" : "w-11 lg:h-9 lg:w-9"
      } ${
        embedded
          ? "relative shrink-0"
          : "absolute top-4 sm:top-5 lg:top-6"
      } ${saved ? "text-rose-600" : ""} ${className}`}
      aria-label={saved ? "Remove from favourites" : "Save to favourites"}
      aria-pressed={saved}
    >
      <FiHeart className={`event-action-glyph h-4 w-4 shrink-0 ${saved ? "fill-current" : ""}`} />
      {label ? <span className="event-action-label whitespace-nowrap lg:hidden">{label}</span> : null}
    </button>
  );
}
