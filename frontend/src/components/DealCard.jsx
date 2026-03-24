import { formatCurrency } from "../utils/format";
import { motion } from "framer-motion";
import { FiHeart } from "react-icons/fi";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { trackDealClick } from "../services/listingService";

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

function DealCard({ item, isFavorite = false, onToggleFavorite, isPremium = false, showPremiumBadge = false, tags = [] }) {
  const { isAuthenticated } = useAuth();
  const locked = Boolean(isPremium) && !isAuthenticated;
  const showBadge = Boolean(showPremiumBadge) && Boolean(isPremium) && isAuthenticated;
  const offerChip = resolveOfferChip(item);
  const visibleTags = tags.slice(0, 2);
  const overflowTags = tags.slice(2);

  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group relative flex h-full min-h-[22.5rem] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      {locked ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-white/30 backdrop-blur-sm"
          aria-hidden="true"
        />
      ) : null}

      {showBadge ? (
        <div className="pointer-events-none absolute right-3 top-3 z-20 rounded-full border border-amber-300/70 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-900 shadow-lg transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-xl">
          Premium
        </div>
      ) : null}

      {locked ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4">
          <div className="w-full rounded-2xl bg-slate-900/80 p-4 text-center text-white shadow-lg">
            <p className="text-sm font-semibold">Premium deal</p>
            <p className="mt-1 text-xs text-white/80">Login to unlock full details and saving.</p>
            <a
              href="/login"
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
            >
              Login to Unlock
            </a>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onToggleFavorite?.()}
        className={`absolute z-10 grid h-9 w-9 place-content-center rounded-full bg-white/95 text-sm shadow transition ${
          showBadge ? "left-3 top-3" : "right-3 top-3"
        } ${
          isFavorite ? "opacity-100 text-rose-600" : "opacity-100 text-slate-600 md:opacity-0 md:group-hover:opacity-100"
        }`}
        aria-label="Save deal"
      >
        <FiHeart className={isFavorite ? "fill-current" : ""} />
      </button>
      <img
        src={item.image || "https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=1200"}
        alt={item.title}
        loading="lazy"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
        className={`aspect-[4/3] w-full object-cover ${locked ? "blur-sm scale-105" : ""}`}
      />
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            {offerChip}
          </span>
          <span className="truncate text-xs text-slate-500">{item.city}</span>
        </div>
        <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 sm:text-[15px]">{item.title}</h3>
        <p className="text-xs text-slate-500 sm:text-sm">{item.city}</p>
        <p className="text-xs text-slate-500 sm:text-sm">
          <span className="line-through">{formatCurrency(item.originalPrice)}</span>{" "}
          <span className="font-semibold text-slate-800">{formatCurrency(item.price)}</span>
        </p>

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
                <span className="relative">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 transition-colors group-hover:border-slate-300 group-hover:bg-slate-100">
                    +{overflowTags.length} more
                  </span>
                  <span className="pointer-events-none absolute bottom-[120%] left-1/2 z-10 hidden w-max max-w-[220px] -translate-x-1/2 flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 text-[10px] shadow-lg backdrop-blur-sm group-hover:flex">
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
          <Link
            to={`/deals/${item.id}`}
            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
            onClick={() => {
              void trackDealClick?.(item.id);
            }}
          >
            View Details
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export default DealCard;
