import { formatCurrency } from "../utils/format";
import { motion } from "framer-motion";
import { FiHeart } from "react-icons/fi";

function ServiceCard({ item, isFavorite = false, onToggleFavorite }) {
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
        aria-label="Save service"
      >
        <FiHeart className={isFavorite ? "fill-current" : ""} />
      </button>
      <img
        src={item.image || "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200"}
        alt={item.title}
        className="aspect-[4/3] w-full object-cover"
      />
      <div className="space-y-1.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
            {item.category}
          </span>
          <span className="truncate text-xs text-slate-500">{item.city}</span>
        </div>
        <h3 className="line-clamp-1 text-[15px] font-semibold text-slate-900">{item.title}</h3>
        <p className="text-sm text-slate-500">{item.city}</p>
        <p className="text-sm text-slate-500">From {formatCurrency(item.price)}</p>
      </div>
    </motion.article>
  );
}

export default ServiceCard;
