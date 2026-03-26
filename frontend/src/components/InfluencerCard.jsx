import { motion } from "framer-motion";
import { FiHeart } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

function InfluencerCard({ item, isFavorite = false, onToggleFavorite, onViewDetails }) {
  const navigate = useNavigate();
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  const visibleTags = tags.slice(0, 2);
  const overflowTags = tags.slice(2);

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
      className="group relative flex h-full min-h-[22.5rem] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
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
      <img
        src={item.image || "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200"}
        alt={item.name}
        loading="lazy"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
        className="aspect-[4/3] w-full object-cover"
      />
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {item.category}
          </span>
          <span className="truncate text-xs text-slate-500">{item.city}</span>
        </div>
        <h3 className="line-clamp-1 text-sm font-semibold text-slate-900 sm:text-[15px]">{item.name}</h3>
        {tags.length ? (
          <div className="mt-1 flex flex-wrap gap-2">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getTagStyles(tag)}`}
              >
                {tag}
              </span>
            ))}
            {overflowTags.length ? (
              <span className="relative group/tag">
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 transition-colors group-hover/tag:border-slate-300 group-hover/tag:bg-slate-100">
                  +{overflowTags.length}
                </span>
                <span className="pointer-events-none absolute bottom-[120%] left-1/2 z-10 hidden w-max max-w-[220px] -translate-x-1/2 flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white/95 p-1.5 text-[10px] shadow-lg backdrop-blur-sm group-hover/tag:flex">
                  {overflowTags.map((t) => (
                    <span key={`overflow-${t}`} className={`rounded-full border px-1.5 py-0.5 font-semibold ${getTagStyles(t)}`}>
                      {t}
                    </span>
                  ))}
                </span>
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="mt-auto flex flex-col gap-1">
          <p className="text-xs text-slate-500 sm:text-sm">
            {toDisplayNumber(item.followers)} Instagram followers
          </p>
          <p className="text-xs text-slate-500 sm:text-sm">
            {toDisplayNumber(item.youtubeSubscribers)} YouTube subscribers
          </p>
          <div className="pt-2">
            <button
              type="button"
              className="w-full rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onViewDetails?.(item?.id);
                if (item?.id) {
                  navigate(`/influencers/${item.id}`);
                }
              }}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
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
    // Fallback for older runtimes.
    if (n >= 1_000_000) return `${Math.round((n / 1_000_000) * 10) / 10}M`;
    if (n >= 1_000) return `${Math.round((n / 1_000) * 10) / 10}K`;
    return String(Math.round(n));
  }
}

export default InfluencerCard;
