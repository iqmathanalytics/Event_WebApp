import { formatCurrency } from "../utils/format";
import { motion } from "framer-motion";
import { FiHeart } from "react-icons/fi";

function DealCard({ item, isFavorite = false, onToggleFavorite }) {
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
        aria-label="Save deal"
      >
        <FiHeart className={isFavorite ? "fill-current" : ""} />
      </button>
      <img
        src={item.image || "https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=1200"}
        alt={item.title}
        className="aspect-[4/3] w-full object-cover"
      />
      <div className="space-y-1.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            {item.discount}% OFF
          </span>
          <span className="truncate text-xs text-slate-500">{item.city}</span>
        </div>
        <h3 className="line-clamp-1 text-[15px] font-semibold text-slate-900">{item.title}</h3>
        <p className="text-sm text-slate-500">{item.city}</p>
        <p className="text-sm text-slate-500">
          <span className="line-through">{formatCurrency(item.originalPrice)}</span>{" "}
          <span className="font-semibold text-slate-800">{formatCurrency(item.price)}</span>
        </p>
      </div>
    </motion.article>
  );
}

export default DealCard;
