import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiHeart } from "react-icons/fi";
import { formatCurrency } from "../utils/format";

function EventCard({ item, isFavorite = false, onToggleFavorite }) {
  const dateTimeText = item.time ? `${item.date} • ${item.time}` : item.date;

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
        aria-label="Save event"
      >
        <FiHeart className={isFavorite ? "fill-current" : ""} />
      </button>
      <img
        src={item.image || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200"}
        alt={item.title}
        className="aspect-[4/3] w-full object-cover"
      />
      <div className="space-y-1.5 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 truncate">
            {item.category}
          </span>
          <span className="truncate text-xs text-slate-500">{item.city}</span>
        </div>
        <h3 className="line-clamp-1 text-[15px] font-semibold text-slate-900">{item.title}</h3>
        <p className="text-sm text-slate-500">{item.city}</p>
        <p className="text-sm text-slate-500">{dateTimeText}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-semibold text-slate-900">{formatCurrency(item.price)}</span>
          <Link
            to={`/events/${item.id}`}
            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            View Details
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export default EventCard;
