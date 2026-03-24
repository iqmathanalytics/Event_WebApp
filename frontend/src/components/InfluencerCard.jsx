import { motion } from "framer-motion";
import { FiHeart } from "react-icons/fi";

function InfluencerCard({ item, isFavorite = false, onToggleFavorite }) {
  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group relative flex h-full min-h-[22.5rem] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <button
        type="button"
        onClick={() => onToggleFavorite?.()}
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
        <p className="text-xs text-slate-500 sm:text-sm">{item.city}</p>
        <p className="mt-auto pt-1 text-xs text-slate-500 sm:text-sm">{item.followers} followers</p>
      </div>
    </motion.article>
  );
}

export default InfluencerCard;
