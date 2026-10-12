import { useRef } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";

function DiscoverySectionCarousel({ title, actionHref, actionLabel = "View all", variant = "carousel", children }) {
  const sliderRef = useRef(null);
  const reduceMotion = useReducedMotion();

  const scrollByAmount = (direction) => {
    const node = sliderRef.current;
    if (!node) {
      return;
    }
    const base =
      variant === "landing-grid3" || variant === "landing-grid4"
        ? node.clientWidth
        : Math.round(node.clientWidth * 0.8);
    const amount = Math.max(280, base);
    node.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  const isGrid3 = variant === "landing-grid3";
  const isGrid4 = variant === "landing-grid4";
  const isGrid8 = variant === "landing-grid8";
  const isLandingGrid = isGrid3 || isGrid4;
  const isStaticGrid = isGrid8;

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: "some" }}
      transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }}
      className="space-y-3.5 lg:space-y-4"
    >
      <div className="flex items-end justify-between gap-2 lg:items-center">
        <h2
          className={
            isStaticGrid
              ? "min-w-0 flex-1 text-[1.15rem] font-bold leading-tight tracking-tight lg:truncate lg:text-2xl lg:tracking-normal"
              : "min-w-0 flex-1 truncate text-lg font-bold sm:text-xl lg:text-2xl"
          }
        >
          {title}
        </h2>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {actionHref ? (
            <Link
              to={actionHref}
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-2.5 text-sm font-semibold text-brand-600 transition active:scale-[0.98] lg:min-h-0 lg:rounded-none lg:px-0"
            >
              {actionLabel}
            </Link>
          ) : null}
          {isLandingGrid ? (
            <>
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
            </>
          ) : null}
        </div>
      </div>

      <div
        ref={isStaticGrid ? null : sliderRef}
        className={
          isStaticGrid
            ? "grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-4"
            : isLandingGrid
              ? "flex items-stretch snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        }
      >
        {children}
      </div>
    </motion.section>
  );
}

export default DiscoverySectionCarousel;
