import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatCurrency, formatDateUS } from "../utils/format";
import { motion } from "framer-motion";
import { FiHeart } from "react-icons/fi";
import useAuth from "../hooks/useAuth";
import { trackDealClick } from "../services/listingService";
import { dealDetailPath } from "../utils/listingPaths";
import ListingCardImage from "./ListingCardImage";
import { HOME_CARD_SIZES } from "../utils/displayImage";
import PremiumLockOverlay from "./PremiumLockOverlay";
import { LandingTagList } from "./ListingTagIcon";

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
  variant = "default",
  priority = false
}) {
  const isLanding = variant === "landing";
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [premiumGateOpen, setPremiumGateOpen] = useState(false);
  const locked = Boolean(isPremium) && !isAuthenticated;
  const showBadge = Boolean(showPremiumBadge) && Boolean(isPremium);
  const displayTags = Array.isArray(tags) ? tags : [];
  const hasPrice = Number(item.price) > 0 || Number(item.originalPrice) > 0;
  const hasPriceRange =
    Number(item.price) > 0 &&
    Number(item.originalPrice) > 0 &&
    Number(item.originalPrice) !== Number(item.price);
  const dealInfoText = String(item.dealInfo || "").trim();
  const offerChip = resolveOfferChip(item);
  const expiryLabel = item.expiryDate ? `Until ${formatDateUS(item.expiryDate)}` : "";
  const providerLabel = String(item.provider || "").trim();

  const openDeal = (e) => {
    e?.preventDefault?.();
    if (locked) {
      setPremiumGateOpen(true);
      return;
    }
    if (!item?.id && !item?.public_slug) {
      return;
    }
    const path = dealDetailPath(item);
    void trackDealClick?.(path.replace(/^\/deals\//, ""));
    navigate(path);
  };

  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${
        isLanding ? "h-full w-full" : "h-full"
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
        className={`absolute right-3 top-3 z-10 grid h-11 w-11 place-content-center rounded-full bg-white/95 text-sm shadow transition lg:h-9 lg:w-9 ${
          isFavorite ? "opacity-100 text-rose-600" : "opacity-100 text-slate-600 lg:opacity-0 lg:group-hover:opacity-100"
        }`}
        aria-label="Save deal"
      >
        <FiHeart className={isFavorite ? "fill-current" : ""} />
      </button>

      <button
        type="button"
        onClick={openDeal}
        className={`relative w-full shrink-0 overflow-hidden bg-slate-100 text-left ${
          isLanding ? "aspect-[3/2] lg:aspect-[16/10]" : "aspect-[16/10]"
        } ${locked ? "cursor-default" : "cursor-pointer"}`}
        aria-label={`View ${item.title}`}
      >
        {showBadge ? (
          <div className="pointer-events-none absolute bottom-1.5 right-1.5 z-20 max-w-[4.5rem] rounded-md border border-amber-300/80 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-1 py-0.5 text-center shadow-md transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg sm:bottom-2 sm:right-2 sm:max-w-[5.25rem] sm:rounded-full sm:px-1.5">
            <span className="block text-[7px] font-bold uppercase leading-tight tracking-wide text-slate-900 sm:text-[8px]">
              Premium deal
            </span>
          </div>
        ) : null}
        <ListingCardImage
          src={item.image}
          alt={item.title}
          emptyLabel="No deal image"
          priority={priority}
          sizes={isLanding ? HOME_CARD_SIZES : undefined}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent px-2.5 pb-2.5 pt-10">
          <span className="inline-flex max-w-full truncate rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm sm:text-[11px]">
            {offerChip}
          </span>
        </div>
      </button>

      <div className={`flex flex-1 flex-col p-3 sm:p-4 ${isLanding ? "gap-2" : "gap-1.5 sm:gap-2"}`}>
        <div className="flex items-center justify-between gap-1.5">
          <span className="truncate rounded-full bg-gradient-to-r from-brand-50 to-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-800 sm:text-[11px]">
            {item.category || "Offer"}
          </span>
          <span className="truncate text-[10px] font-semibold text-slate-600 sm:text-xs">{item.city}</span>
        </div>

        <button
          type="button"
          onClick={openDeal}
          className={`text-left font-bold leading-snug text-slate-900 hover:text-brand-700 ${
            isLanding ? "line-clamp-2 text-lg lg:text-[15px]" : "line-clamp-2 text-sm sm:text-[15px]"
          }`}
        >
          {item.title}
        </button>

        {providerLabel ? (
          <p className="truncate text-[11px] font-semibold text-slate-600 sm:text-xs">{providerLabel}</p>
        ) : null}

        {expiryLabel ? <p className="text-xs font-bold text-rose-600">{expiryLabel}</p> : null}

        {!hasPrice && dealInfoText ? (
          <p className={`font-medium text-slate-600 ${isLanding ? "line-clamp-2 text-[11px]" : "line-clamp-2 text-xs sm:text-sm"}`}>
            {dealInfoText}
          </p>
        ) : null}

        <LandingTagList
          tags={displayTags}
          classFor={(tag) =>
            `rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:text-[11px] ${renderTag(tag)}`
          }
        />

        <div className="flex-1" aria-hidden />

        <div
          className={`mt-auto flex shrink-0 gap-2 ${
            isLanding
              ? "flex-col items-stretch pt-1 lg:flex-row lg:items-center lg:justify-between lg:pt-2"
              : "flex-col items-stretch pt-1 lg:flex-row lg:items-center lg:justify-between"
          }`}
        >
          <span className="inline-flex flex-wrap items-baseline gap-x-1.5 text-xs font-bold text-slate-900 sm:text-sm">
            {hasPrice ? (
              <>
                {hasPriceRange ? (
                  <span className="font-semibold text-slate-400 line-through">
                    {formatCurrency(item.originalPrice)}
                  </span>
                ) : null}
                <span>From {formatCurrency(item.price || item.originalPrice)}</span>
              </>
            ) : (
              "Offer details"
            )}
          </span>
          <button
            type="button"
            onClick={openDeal}
            className={`shrink-0 rounded-full bg-slate-900 font-bold text-white transition hover:bg-slate-700 ${
              isLanding
                ? "inline-flex min-h-11 w-full items-center justify-center px-4 text-sm lg:min-h-0 lg:w-auto lg:px-3 lg:py-1.5 lg:text-xs"
                : "inline-flex min-h-11 w-full items-center justify-center px-4 text-sm lg:min-h-0 lg:w-auto lg:px-3 lg:py-1.5 lg:text-xs"
            }`}
          >
            View Details
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export default DealCard;
