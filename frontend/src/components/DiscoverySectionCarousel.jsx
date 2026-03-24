import { useRef } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

function DiscoverySectionCarousel({ title, actionHref, actionLabel = "View all", children }) {
  const sliderRef = useRef(null);

  const scrollByAmount = (direction) => {
    const node = sliderRef.current;
    if (!node) {
      return;
    }
    const amount = Math.max(280, Math.round(node.clientWidth * 0.8));
    node.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 flex-1 truncate text-lg font-bold sm:text-xl lg:text-2xl">{title}</h2>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {actionHref ? (
            <Link to={actionHref} className="whitespace-nowrap text-xs font-semibold text-brand-600 sm:text-sm">
              {actionLabel}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => scrollByAmount(-1)}
            className="hidden h-8 w-8 place-content-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 sm:grid"
            aria-label={`Scroll ${title} left`}
          >
            <FiChevronLeft />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount(1)}
            className="hidden h-8 w-8 place-content-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 sm:grid"
            aria-label={`Scroll ${title} right`}
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      <div
        ref={sliderRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </motion.section>
  );
}

export default DiscoverySectionCarousel;
