import { motion } from "framer-motion";
import { FiHeart } from "react-icons/fi";

function InfluencerCard({ item, isFavorite = false, onToggleFavorite }) {
  return (
    <motion.article
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
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
        className="aspect-[4/3] w-full object-cover"
      />
      <div className="space-y-1.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {item.category}
          </span>
          <span className="truncate text-xs text-slate-500">{item.city}</span>
        </div>
        <h3 className="line-clamp-1 text-[15px] font-semibold text-slate-900">{item.name}</h3>
        <p className="text-sm text-slate-500">{item.city}</p>
        <p className="text-sm text-slate-500">{item.followers} followers</p>
      </div>
    </motion.article>
  );
}

export default InfluencerCard;
