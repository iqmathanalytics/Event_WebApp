import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiHeart } from "react-icons/fi";
import { formatCurrency, formatDateUS, formatTime12Hour } from "../utils/format";
import { trackEventClick } from "../services/eventService";
import { trackEventListingClick } from "../utils/googleAnalytics";
import { eventDetailPath } from "../utils/listingPaths";
import { getEventSortDate } from "../utils/eventSchedule";
import useAuth from "../hooks/useAuth";
import ListingCardImage from "./ListingCardImage";
import PremiumLockOverlay from "./PremiumLockOverlay";
import HomeSpotlightChip from "./HomeSpotlightChip";
import { LandingTagList } from "./ListingTagIcon";
import { EXCLUSIVE_DEAL_EVENT_LABEL } from "../constants/brand";
import { resolveEventListPrice } from "../utils/eventTicketLevels";
import { isHomeFeaturedEvent } from "../utils/eventHomeFeatured";
import { HOME_CARD_SIZES } from "../utils/displayImage";

function EventCard({
  item,
  isFavorite = false,
  onToggleFavorite,
  tags = [],
  countdownLabel,
  isYayDealEvent = false,
  showPremiumBadge = false,
  variant = "default",
  priority = false
}) {
  const isLanding = variant === "landing";
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [premiumGateOpen, setPremiumGateOpen] = useState(false);
  const locked = Boolean(isYayDealEvent) && !isAuthenticated;
  const showBadge = Boolean(showPremiumBadge) && Boolean(isYayDealEvent);
  const sortDate = getEventSortDate(item) || item.display_date || item.event_date || item.date;
  const dateLabel = sortDate ? formatDateUS(sortDate) : "";
  const timeLabel = item.event_time
    ? formatTime12Hour(String(item.event_time).slice(0, 5))
    : item.time
      ? formatTime12Hour(item.time)
      : "";
  const dateTimeText = [dateLabel, timeLabel].filter(Boolean).join(" • ");
  const displayTags = Array.isArray(tags) ? tags : [];
  const dayMatch = countdownLabel?.match(/^(\d+)d$/);
  const daysLeftLabel = dayMatch
    ? `${dayMatch[1]} day${dayMatch[1] === "1" ? "" : "s"} left`
    : countdownLabel
      ? `${countdownLabel} left`
      : null;
  const fallbackGalleryImage = Array.isArray(item.galleryImages)
    ? item.galleryImages.map((url) => String(url || "").trim()).find(Boolean) || ""
    : "";
  const eventImage = String(item.image || "").trim() || fallbackGalleryImage;
  const listPrice = resolveEventListPrice(item);
  const homeFeatured = isHomeFeaturedEvent(item);

  const openEvent = (e) => {
    e?.preventDefault?.();
    if (locked) {
      setPremiumGateOpen(true);
      return;
    }
    if (!item?.id) {
      return;
    }
    trackEventListingClick({ eventId: item.id });
    trackEventClick(item.public_slug || item.id).catch(() => {});
    navigate(eventDetailPath(item));
  };

  const renderTag = (tag) => {
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
  };

  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm ${
        homeFeatured
          ? "border-amber-300/90 shadow-[0_10px_28px_rgba(245,158,11,0.18)] ring-1 ring-amber-200/80"
          : "border-slate-200"
      } ${isLanding ? "h-full w-full" : "h-full"}`}
    >
      {locked ? <PremiumLockOverlay open={premiumGateOpen} onClose={() => setPremiumGateOpen(false)} variant="event" /> : null}

      <button
        type="button"
        onClick={() => onToggleFavorite?.()}
        className={`absolute right-3 top-3 z-10 grid h-11 w-11 place-content-center rounded-full bg-white/95 text-sm shadow transition lg:h-9 lg:w-9 ${
          isFavorite ? "opacity-100 text-rose-600" : "opacity-100 text-slate-600 lg:opacity-0 lg:group-hover:opacity-100"
        }`}
        aria-label="Save event"
      >
        <FiHeart className={isFavorite ? "fill-current" : ""} />
      </button>
      <button
        type="button"
        onClick={openEvent}
        className={`relative w-full shrink-0 overflow-hidden bg-slate-100 text-left ${
          isLanding ? "aspect-[3/2] lg:aspect-[16/10]" : "aspect-[16/10]"
        } ${
          locked ? "cursor-default" : "cursor-pointer"
        }`}
        aria-label={`View ${item.title}`}
      >
        {showBadge ? (
          <div className="pointer-events-none absolute bottom-1.5 right-1.5 z-20 max-w-[4.5rem] rounded-md border border-amber-300/80 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-1 py-0.5 text-center shadow-md transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg sm:bottom-2 sm:right-2 sm:max-w-[5.25rem] sm:rounded-full sm:px-1.5">
            <span className="block text-[7px] font-bold uppercase leading-tight tracking-wide text-slate-900 sm:text-[8px]">
              {EXCLUSIVE_DEAL_EVENT_LABEL}
            </span>
          </div>
        ) : null}
        <ListingCardImage
          src={eventImage}
          alt={item.title}
          emptyLabel="No event image"
          priority={priority}
          sizes={isLanding ? HOME_CARD_SIZES : undefined}
        />
        {homeFeatured ? (
          <div className="pointer-events-none absolute left-2 top-2 z-20 sm:left-2.5 sm:top-2.5">
            <HomeSpotlightChip compact />
          </div>
        ) : null}
      </button>
      <div className={`flex flex-1 flex-col p-3 sm:p-4 ${isLanding ? "gap-2" : "gap-1.5 sm:gap-2"}`}>
        <div className="flex items-center justify-between gap-1.5">
          <span className="truncate rounded-full bg-gradient-to-r from-brand-50 to-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-800 sm:text-[11px]">
            {item.category}
          </span>
          <span className="truncate text-[10px] font-semibold text-slate-600 sm:text-xs">{item.city}</span>
        </div>
          <button
          type="button"
          onClick={openEvent}
          className={`text-left font-bold leading-snug text-slate-900 hover:text-brand-700 ${
            isLanding ? "line-clamp-2 text-lg lg:text-[15px]" : "line-clamp-2 text-sm sm:text-[15px]"
          }`}
        >
          {item.title}
        </button>
        {dateTimeText ? (
          <p className="text-[11px] font-semibold text-slate-600 sm:text-xs">{dateTimeText}</p>
        ) : null}

        {daysLeftLabel ? (
          <p className="text-xs font-bold text-rose-600">{daysLeftLabel}</p>
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
          <span className="text-xs font-bold text-slate-900 sm:text-sm">
            {listPrice != null ? `Tickets from ${formatCurrency(listPrice)}` : "See ticket options"}
          </span>
          {locked ? (
            <button
              type="button"
              className={`shrink-0 rounded-full bg-slate-900 font-bold text-white transition hover:bg-slate-700 ${
                isLanding
                  ? "inline-flex min-h-11 w-full items-center justify-center px-4 text-sm lg:min-h-0 lg:w-auto lg:px-3 lg:py-1.5 lg:text-xs"
                  : "inline-flex min-h-11 w-full items-center justify-center px-4 text-sm lg:min-h-0 lg:w-auto lg:px-3 lg:py-1.5 lg:text-xs"
              }`}
              onClick={() => setPremiumGateOpen(true)}
            >
              View Details
            </button>
          ) : (
            <button
              type="button"
              onClick={openEvent}
              className={`shrink-0 rounded-full bg-slate-900 font-bold text-white transition hover:bg-slate-700 ${
                isLanding
                  ? "inline-flex min-h-11 w-full items-center justify-center px-4 text-sm lg:min-h-0 lg:w-auto lg:px-3 lg:py-1.5 lg:text-xs"
                  : "inline-flex min-h-11 w-full items-center justify-center px-4 text-sm lg:min-h-0 lg:w-auto lg:px-3 lg:py-1.5 lg:text-xs"
              }`}
            >
              View Details
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default EventCard;
