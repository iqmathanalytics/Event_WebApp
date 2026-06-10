import { useState } from "react";
import { formatCurrency } from "../utils/format";
import { motion } from "framer-motion";
import { FiHeart } from "react-icons/fi";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { trackDealClick } from "../services/listingService";
import { dealDetailPath } from "../utils/listingPaths";
import ListingCardImage from "./ListingCardImage";
import PremiumLockOverlay from "./PremiumLockOverlay";

function resolveOfferChip(item) {
  let meta = {};
  if (item.offerMetaJson) {
    try {
      meta = JSON.parse(item.offerMetaJson);
    } catch (_err) {
      meta = {};
    }
  }
  const type = item.offerType || "";
  if (type === "percentage_off" && meta.offer_value) {
    return `${meta.offer_value}% OFF`;
  }
  if (type === "flat_off" && meta.offer_value) {
    return `${formatCurrency(Number(meta.offer_value))} OFF`;
  }
  if (type === "bogo" && meta.buy_qty && meta.get_qty) {
    return `Buy ${meta.buy_qty} Get ${meta.get_qty}`;
  }
  if (type === "bundle_price" && meta.offer_value) {
    return `Bundle ${formatCurrency(Number(meta.offer_value))}`;
  }
  if (type === "free_item" && meta.free_item_name) {
    return `Free ${meta.free_item_name}`;
  }
  if (type === "custom" && meta.custom_offer_text) {
    return meta.custom_offer_text;
  }
  if (item.discount > 0) {
    return `${item.discount}% OFF`;
  }
  return "Special Offer";
}

function renderTag(tag) {
  if (tag === "Hot Selling") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (tag === "Trending") {
    return "bg-indigo-50 text-indigo-700 border-indigo-200";
  }
  if (tag === "One of a Kind") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function DealCard({
  item,
  isFavorite = false,
  onToggleFavorite,
  isPremium = false,
  showPremiumBadge = false,
  tags = [],
  variant = "default"
}) {
  const isLanding = variant === "landing";
  const { isAuthenticated } = useAuth();
  const [premiumGateOpen, setPremiumGateOpen] = useState(false);
  const locked = Boolean(isPremium) && !isAuthenticated;
  const showBadge = Boolean(showPremiumBadge) && Boolean(isPremium);
  const displayTags = Array.isArray(tags) ? tags : [];
  const hasPrice = Number(item.price) > 0 || Number(item.originalPrice) > 0;
  const hasPriceRange = Number(item.price) > 0 && Number(item.originalPrice) > 0 && Number(item.originalPrice) !== Number(item.price);
  const dealInfoText = String(item.dealInfo || "").trim();
  const offerChip = resolveOfferChip(item);

  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${
        isLanding ? "h-full w-full" : "h-full min-h-[19rem] sm:min-h-[20rem]"
      }`}
    >
      {locked ? <PremiumLockOverlay open={premiumGateOpen} onClose={() => setPremiumGateOpen(false)} variant="deal" /> : null}

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite?.();
        }}
        className={`absolute right-3 top-3 z-10 grid h-9 w-9 place-content-center rounded-full bg-white/95 text-sm shadow transition ${
          isFavorite ? "opacity-100 text-rose-600" : "opacity-100 text-slate-600 md:opacity-0 md:group-hover:opacity-100"
        }`}
        aria-label="Save deal"
      >
        <FiHeart className={isFavorite ? "fill-current" : ""} />
      </button>
      <div
        className={`relative w-full shrink-0 overflow-hidden bg-slate-100 ${
          isLanding ? "h-44" : "h-40 sm:h-44"
        }`}
      >
        {showBadge ? (
          <div className="pointer-events-none absolute bottom-2 right-2 z-20 max-w-[5.75rem] rounded-lg border border-amber-300/80 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-1.5 py-1 text-center shadow-lg transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-xl sm:bottom-3 sm:right-3 sm:max-w-[7rem] sm:rounded-full sm:px-2 sm:py-1">
            <span className="block text-[8px] font-bold uppercase leading-tight tracking-wide text-slate-900 sm:text-[9px]">
              Premium deal
            </span>
          </div>
        ) : null}
        <ListingCardImage src={item.image} alt={item.title} emptyLabel="No deal image" />
      </div>
      <div className={`flex flex-1 flex-col p-3 sm:p-4 ${isLanding ? "gap-2" : "gap-1.5 sm:gap-2"}`}>
        <div className="flex items-start justify-between gap-1.5">
          <h3
            className={`min-w-0 flex-1 font-bold leading-snug text-slate-900 ${
              isLanding ? "line-clamp-2 text-[15px]" : "line-clamp-2 text-sm sm:text-[15px]"
            }`}
          >
            {item.title}
          </h3>
          <span className="shrink-0 truncate text-[10px] font-semibold text-slate-600 sm:text-xs">{item.city}</span>
        </div>

        <p className="inline-flex w-fit rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200">
          {offerChip}
        </p>

        {hasPrice ? (
          <p className="text-[11px] font-semibold text-slate-600 sm:text-xs">
            {hasPriceRange ? <span className="line-through text-slate-400">{formatCurrency(item.originalPrice)}</span> : null}{" "}
            <span className="font-bold text-slate-900">{formatCurrency(item.price || item.originalPrice)}</span>
          </p>
        ) : (
          <p className={`font-medium text-slate-600 ${isLanding ? "line-clamp-2 text-[11px]" : "line-clamp-2 text-xs sm:text-sm"}`}>
            {dealInfoText || "Contact provider for pricing"}
          </p>
        )}

        {displayTags.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {displayTags.map((tag) => (
              <span
                key={tag}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:text-[11px] ${renderTag(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex-1" aria-hidden />

        <div className={`mt-auto flex shrink-0 items-center justify-between gap-2 ${isLanding ? "pt-2" : "pt-1"}`}>
          <span className="text-xs font-bold text-slate-900 sm:text-sm">
            {hasPrice ? `From ${formatCurrency(item.price || item.originalPrice)}` : "Offer details"}
          </span>
          {locked ? (
            <button
              type="button"
              className="shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-700"
              onClick={() => setPremiumGateOpen(true)}
            >
              View Details
            </button>
          ) : (
            <Link
              to={dealDetailPath(item)}
              className="shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-700"
              onClick={() => {
                const path = dealDetailPath(item);
                void trackDealClick?.(path.replace(/^\/deals\//, ""));
              }}
            >
              View Details
            </Link>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default DealCard;
