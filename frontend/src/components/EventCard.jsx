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
import { EXCLUSIVE_DEAL_EVENT_LABEL } from "../constants/brand";
import { resolveEventListPrice } from "../utils/eventTicketLevels";

function EventCard({
  item,
  isFavorite = false,
  onToggleFavorite,
  tags = [],
  countdownLabel,
  isYayDealEvent = false,
  showPremiumBadge = false,
  variant = "default"
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
      className={`group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${
        isLanding ? "h-full w-full" : "h-full min-h-[19rem] sm:min-h-[20rem]"
      }`}
    >
      {locked ? <PremiumLockOverlay open={premiumGateOpen} onClose={() => setPremiumGateOpen(false)} variant="event" /> : null}

      <button
        type="button"
        onClick={() => onToggleFavorite?.()}
        className={`absolute right-3 top-3 z-10 grid h-9 w-9 place-content-center rounded-full bg-white/95 text-sm shadow transition ${
          isFavorite ? "opacity-100 text-rose-600" : "opacity-100 text-slate-600 md:opacity-0 md:group-hover:opacity-100"
        }`}
        aria-label="Save event"
      >
        <FiHeart className={isFavorite ? "fill-current" : ""} />
      </button>
      <button
        type="button"
        onClick={openEvent}
        className={`relative w-full shrink-0 overflow-hidden bg-slate-100 text-left ${
          isLanding ? "h-44" : "h-40 sm:h-44"
        } ${locked ? "cursor-default" : "cursor-pointer"}`}
        aria-label={`View ${item.title}`}
      >
        {showBadge ? (
          <div className="pointer-events-none absolute bottom-2 right-2 z-20 max-w-[5.75rem] rounded-lg border border-amber-300/80 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-1.5 py-1 text-center shadow-lg transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-xl sm:bottom-3 sm:right-3 sm:max-w-[7rem] sm:rounded-full sm:px-2 sm:py-1">
            <span className="block text-[8px] font-bold uppercase leading-tight tracking-wide text-slate-900 sm:text-[9px]">
              {EXCLUSIVE_DEAL_EVENT_LABEL}
            </span>
          </div>
        ) : null}
        <ListingCardImage src={eventImage} alt={item.title} emptyLabel="No event image" />
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
            isLanding ? "line-clamp-2 text-[15px]" : "line-clamp-2 text-sm sm:text-[15px]"
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
            {listPrice != null ? `Tickets from ${formatCurrency(listPrice)}` : "See ticket options"}
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
            <button
              type="button"
              onClick={openEvent}
              className="shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-700"
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
