import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiHeart } from "react-icons/fi";
import { formatCurrency } from "../utils/format";
import { trackEventClick } from "../services/eventService";
import useAuth from "../hooks/useAuth";
import PremiumLockOverlay from "./PremiumLockOverlay";

function EventCard({
  item,
  isFavorite = false,
  onToggleFavorite,
  tags = [],
  countdownLabel,
  isYayDealEvent = false,
  showPremiumBadge = false
}) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [premiumGateOpen, setPremiumGateOpen] = useState(false);
  const locked = Boolean(isYayDealEvent) && !isAuthenticated;
  const showBadge = Boolean(showPremiumBadge) && Boolean(isYayDealEvent);
  const dateTimeText = item.time ? `${item.date} • ${item.time}` : item.date;
  const visibleTags = tags.slice(0, 2);
  const overflowTags = tags.slice(2);

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
      className="group relative flex h-full min-h-[22.5rem] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      {showBadge ? (
        <div className="pointer-events-none absolute right-3 top-3 z-20 max-w-[6.75rem] rounded-lg border border-amber-300/80 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-2 py-1.5 text-center shadow-lg transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-xl sm:max-w-[8rem] sm:rounded-full sm:px-2.5 sm:py-1">
          <span className="block text-[9px] font-bold uppercase leading-tight tracking-wide text-slate-900 sm:text-[10px]">
            Yay! Deal Event
          </span>
        </div>
      ) : null}

      {locked ? <PremiumLockOverlay open={premiumGateOpen} onClose={() => setPremiumGateOpen(false)} variant="event" /> : null}

      <button
        type="button"
        onClick={() => onToggleFavorite?.()}
        className={`absolute z-10 grid h-9 w-9 place-content-center rounded-full bg-white/95 text-sm shadow transition ${
          showBadge ? "left-3 top-3" : "right-3 top-3"
        } ${
          isFavorite ? "opacity-100 text-rose-600" : "opacity-100 text-slate-600 md:opacity-0 md:group-hover:opacity-100"
        }`}
        aria-label="Save event"
      >
        <FiHeart className={isFavorite ? "fill-current" : ""} />
      </button>
      <img
        src={item.image || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200"}
        alt={item.title}
        loading="lazy"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
        className="aspect-[4/3] w-full object-cover"
      />
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 truncate">
            {item.category}
          </span>
          <span className="truncate text-xs text-slate-500">{item.city}</span>
        </div>
        <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 sm:text-[15px]">{item.title}</h3>
        <p className="text-xs text-slate-500 sm:text-sm">{item.city}</p>
        <p className="text-xs text-slate-500 sm:text-sm">{dateTimeText}</p>

        {countdownLabel ? (
          <p className="text-xs font-semibold text-rose-600">{countdownLabel} left</p>
        ) : null}

        <div className="mt-auto pt-1">
          {visibleTags?.length ? (
            <div className="relative flex flex-wrap items-center gap-2">
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${renderTag(tag)}`}
                >
                  {tag}
                </span>
              ))}
              {overflowTags.length ? (
                <span className="relative group/tag">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 transition-colors group-hover/tag:border-slate-300 group-hover/tag:bg-slate-100">
                    +{overflowTags.length} more
                  </span>
                  <span className="pointer-events-none absolute bottom-[120%] left-1/2 z-10 hidden w-max max-w-[220px] -translate-x-1/2 flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 text-[10px] shadow-lg backdrop-blur-sm group-hover/tag:flex">
                    {overflowTags.map((tag) => (
                      <span key={`overflow-${tag}`} className={`rounded-full border px-1.5 py-0.5 font-semibold ${renderTag(tag)}`}>
                        {tag}
                      </span>
                    ))}
                  </span>
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-semibold text-slate-900 sm:text-sm">{formatCurrency(item.price)}</span>
          {locked ? (
            <button
              type="button"
              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
              onClick={() => setPremiumGateOpen(true)}
            >
              View Details
            </button>
          ) : (
            <Link
              to={`/events/${item.id}`}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
              onClick={(e) => {
                e.preventDefault();
                void trackEventClick?.(item.id);
                navigate(`/events/${item.id}`);
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

export default EventCard;
