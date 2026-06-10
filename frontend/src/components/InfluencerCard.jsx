import { motion } from "framer-motion";
import { FiHeart, FiUser } from "react-icons/fi";
import { FaFacebookF } from "react-icons/fa";
import { Instagram, Youtube } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { influencerDetailPath } from "../utils/listingPaths";
import ListingCardImage from "./ListingCardImage";

/** Fixed height for the stats row so every card aligns in the carousel/grid. */
const REACH_STATS_ROW_CLASS = "h-[5.25rem]";

const PLATFORM_SLOTS = [
  {
    id: "instagram",
    urlKey: "instagramUrl",
    valueKey: "followers",
    label: "Instagram",
    sublabel: "Followers",
    Icon: Instagram,
    chipClass: "from-rose-500 via-pink-500 to-fuchsia-600",
    ringClass: "ring-rose-100/90",
    accentClass: "text-rose-600"
  },
  {
    id: "facebook",
    urlKey: "facebookUrl",
    valueKey: "facebookFollowers",
    label: "Facebook",
    sublabel: "Followers",
    Icon: FaFacebookF,
    iconLib: "fa",
    chipClass: "from-blue-600 to-blue-500",
    ringClass: "ring-blue-100/90",
    accentClass: "text-blue-600"
  },
  {
    id: "youtube",
    urlKey: "youtubeUrl",
    valueKey: "youtubeSubscribers",
    label: "YouTube",
    sublabel: "Subscribers",
    Icon: Youtube,
    chipClass: "from-red-600 to-red-500",
    ringClass: "ring-red-100/90",
    accentClass: "text-red-600"
  }
];

function buildSocialSlots(item) {
  return PLATFORM_SLOTS.map((platform) => {
    if (!String(item?.[platform.urlKey] || "").trim()) {
      return null;
    }
    return {
      ...platform,
      value: item[platform.valueKey]
    };
  });
}

function toDisplayNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  if (n === 0) return "0";
  try {
    return new Intl.NumberFormat("en", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: n >= 1000 ? 1 : 0
    }).format(n);
  } catch (_err) {
    if (n >= 1_000_000) return `${Math.round((n / 1_000_000) * 10) / 10}M`;
    if (n >= 1_000) return `${Math.round((n / 1_000) * 10) / 10}K`;
    return String(Math.round(n));
  }
}

function SocialStatTile({ stat }) {
  const { Icon, label, sublabel, value, chipClass, ringClass, accentClass } = stat;
  const isFa = stat.iconLib === "fa";

  return (
    <div
      className={`flex h-full min-w-0 flex-col items-center justify-center rounded-xl bg-white text-center shadow-sm ring-1 ${ringClass} px-0.5 py-1.5`}
    >
      <div className={`mb-1 grid h-7 w-7 shrink-0 place-content-center rounded-lg bg-gradient-to-br shadow-sm ${chipClass}`}>
        {isFa ? (
          <Icon className="h-3 w-3 text-white" />
        ) : (
          <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.25} />
        )}
      </div>
      <p className={`w-full truncate text-[8px] font-bold uppercase tracking-wide ${accentClass}`}>{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums leading-none text-slate-900">{toDisplayNumber(value)}</p>
      <p className="mt-0.5 w-full px-0.5 text-[8px] font-medium leading-tight text-slate-500">{sublabel}</p>
    </div>
  );
}

function SocialStatPlaceholder() {
  return (
    <div
      className="flex h-full min-w-0 flex-col items-center justify-center rounded-xl bg-slate-50/90 ring-1 ring-slate-100"
      aria-hidden
    >
      <div className="mb-1 h-7 w-7 rounded-lg bg-slate-100/90" />
      <span className="text-[10px] font-medium text-slate-300">—</span>
    </div>
  );
}

function InfluencerSocialStats({ item }) {
  const slots = buildSocialSlots(item);
  const hasAny = slots.some(Boolean);

  return (
    <div className="shrink-0 rounded-xl border border-slate-100/90 bg-gradient-to-br from-slate-50/90 via-white to-slate-50/50 p-2 ring-1 ring-slate-100">
      <p className="mb-1.5 px-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Audience reach</p>
      <div className={`grid grid-cols-3 gap-1.5 ${REACH_STATS_ROW_CLASS}`}>
        {hasAny ? (
          slots.map((stat, index) =>
            stat ? (
              <SocialStatTile key={stat.id} stat={stat} />
            ) : (
              <SocialStatPlaceholder key={`placeholder-${PLATFORM_SLOTS[index].id}`} />
            )
          )
        ) : (
          <div className="col-span-3 flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-2 text-center">
            <p className="text-[11px] font-medium leading-snug text-slate-400">Social reach not listed</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfluencerCard({ item, isFavorite = false, onToggleFavorite, onViewDetails, variant = "default" }) {
  const isLanding = variant === "landing";
  const navigate = useNavigate();
  const tags = Array.isArray(item?.tags) ? item.tags : [];

  const getTagStyles = (tag) => {
    const t = String(tag || "");
    if (t === "Trending") return "bg-amber-50 text-amber-800 border-amber-200";
    if (t === "Popular") return "bg-slate-50 text-slate-800 border-slate-200";
    if (t === "Rising") return "bg-emerald-50 text-emerald-800 border-emerald-200";
    if (t === "Top Creator") return "bg-brand-50 text-brand-800 border-brand-200";
    return "bg-slate-50 text-slate-800 border-slate-200";
  };

  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${
        isLanding ? "h-full w-full" : "h-full min-h-[19rem] sm:min-h-[20rem]"
      }`}
    >
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
        aria-label="Save influencer"
      >
        <FiHeart className={isFavorite ? "fill-current" : ""} />
      </button>

      <div
        className={`relative w-full shrink-0 overflow-hidden bg-slate-100 ${
          isLanding ? "h-44" : "h-40 sm:h-44"
        }`}
      >
        <ListingCardImage
          src={item.image}
          alt={item.name}
          emptyLabel="No profile image"
          placeholderClassName="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 text-slate-500"
        />
      </div>

      <div className={`flex flex-1 flex-col p-3 sm:p-4 ${isLanding ? "gap-1.5" : "gap-2"}`}>
        <div className="flex items-center justify-between gap-1.5">
          <span className="truncate rounded-full bg-gradient-to-r from-fuchsia-50 to-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fuchsia-800 sm:text-[11px]">
            {item.category}
          </span>
          <span className="truncate text-[10px] font-semibold text-slate-600 sm:text-xs">{item.city}</span>
        </div>

        <h3
          className={`font-bold leading-snug text-slate-900 ${
            isLanding ? "line-clamp-2 text-[15px]" : "line-clamp-2 text-sm sm:text-[15px]"
          }`}
        >
          {item.name}
        </h3>

        {tags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:text-[11px] ${getTagStyles(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex-1" aria-hidden />

        <div className={`mt-auto flex shrink-0 flex-col ${isLanding ? "gap-2 pt-1.5" : "gap-2.5 pt-2"}`}>
          <InfluencerSocialStats item={item} />

          <button
            type="button"
            className="w-full rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onViewDetails?.(item?.id);
              if (item?.id) {
                navigate(influencerDetailPath(item));
              }
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export default InfluencerCard;
