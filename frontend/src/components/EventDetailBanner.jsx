import { useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { FiChevronLeft, FiChevronRight, FiImage } from "react-icons/fi";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Keyboard, Pagination } from "swiper/modules";
import { collectEventGalleryUrls } from "../utils/eventGallery";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

const AUTOPLAY_MS = 4200;
const FADE_MS = 850;

/**
 * Hero slideshow: automatic cross-fade, fraction counter, soft edge prev/next, respects reduced motion.
 */
export default function EventDetailBanner({ event, title, className = "", guestLocked = false }) {
  const reduceMotion = useReducedMotion();
  const swiperRef = useRef(null);
  const urls = useMemo(() => collectEventGalleryUrls(event), [event]);
  const multi = urls.length > 1;
  const hasImage = urls.length > 0;

  // Mobile / tablet: ~⅓ viewport (deal-style proportion); desktop: full immersive hero.
  const heroH =
    "h-[33vh] min-h-[168px] max-h-[400px] sm:h-[42vh] sm:max-h-[480px] sm:min-h-[220px] md:h-[50vh] md:max-h-[560px] lg:h-[75vh] lg:max-h-[920px] lg:min-h-[280px]";

  const swiperClass =
    "event-detail-hero-swiper group/hero h-full w-full " +
    "[&_.swiper-pagination-fraction]:bottom-3 [&_.swiper-pagination-fraction]:left-1/2 [&_.swiper-pagination-fraction]:right-auto [&_.swiper-pagination-fraction]:top-auto [&_.swiper-pagination-fraction]:w-auto [&_.swiper-pagination-fraction]:-translate-x-1/2 " +
    "[&_.swiper-pagination-fraction]:rounded-full [&_.swiper-pagination-fraction]:border [&_.swiper-pagination-fraction]:border-white/25 [&_.swiper-pagination-fraction]:bg-slate-950/55 [&_.swiper-pagination-fraction]:px-3.5 [&_.swiper-pagination-fraction]:py-1.5 " +
    "[&_.swiper-pagination-fraction]:text-[11px] [&_.swiper-pagination-fraction]:font-semibold [&_.swiper-pagination-fraction]:tracking-wide [&_.swiper-pagination-fraction]:tabular-nums [&_.swiper-pagination-fraction]:text-white/95 [&_.swiper-pagination-fraction]:backdrop-blur-md " +
    "[&_.swiper-pagination-fraction]:shadow-lg";

  const autoplayActive = multi && !reduceMotion;

  const baseSection = `relative w-full overflow-hidden rounded-2xl bg-slate-900 shadow-xl ring-1 ring-slate-900/10 lg:rounded-3xl ${heroH} ${className}`;

  const railBtn =
    "group absolute inset-y-0 z-20 flex items-center w-[4.25rem] touch-manipulation border-0 bg-transparent p-0 outline-none sm:w-28 " +
    "focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-0";

  const iconCls =
    "relative z-10 text-white/90 transition-[transform,opacity] duration-300 ease-out group-hover:text-white " +
    "size-9 stroke-[1.35] drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:size-10";

  return (
    <section className={baseSection} aria-label={multi ? "Event photos" : "Event cover photo"}>
      <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-1 ring-inset ring-white/10 lg:rounded-3xl" aria-hidden />
      {!hasImage ? (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(244,63,94,0.2),transparent_40%),radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.22),transparent_42%)]" />
          <div className="relative z-10 flex flex-col items-center gap-2 text-white/85">
            <div className="grid h-14 w-14 place-content-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
              <FiImage className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold">No event banner image</p>
          </div>
        </div>
      ) : multi ? (
        <>
          <Swiper
            className={swiperClass}
            modules={[Pagination, Autoplay, EffectFade, Keyboard]}
            onSwiper={(instance) => {
              swiperRef.current = instance;
            }}
            pagination={{
              clickable: true,
              type: "fraction"
            }}
            effect="fade"
            fadeEffect={{ crossFade: true }}
            speed={FADE_MS}
            loop={urls.length >= 2}
            grabCursor
            keyboard={{ enabled: true }}
            autoplay={
              autoplayActive
                ? {
                    delay: AUTOPLAY_MS,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: false,
                    waitForTransition: true
                  }
                : false
            }
            slidesPerView={1}
          >
            {urls.map((src, idx) => (
              <SwiperSlide key={`${src}-${idx}`} className="!h-full">
                <div className="relative h-full w-full">
                  <img
                    src={src}
                    alt={idx === 0 ? `${title} — cover` : `${title} — photo ${idx + 1}`}
                    className={`h-full w-full object-cover object-center motion-safe:transition-transform motion-safe:duration-[9000ms] motion-safe:ease-out motion-safe:group-hover/hero:scale-[1.025] ${guestLocked ? "blur-sm" : ""}`}
                    loading={idx === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/10 to-slate-950/25"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/55 to-transparent sm:h-28"
                    aria-hidden
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          <button
            type="button"
            className={`${railBtn} left-0 justify-center sm:justify-start sm:pl-5`}
            aria-label="Previous photo"
            onClick={() => swiperRef.current?.slidePrev()}
          >
            <span
              className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-slate-950/65 via-slate-950/18 to-transparent opacity-95 transition-opacity duration-500 sm:opacity-55 sm:group-hover:opacity-95 sm:group-focus-visible:opacity-95"
              aria-hidden
            />
            <FiChevronLeft className={`${iconCls} group-hover:-translate-x-0.5 sm:group-hover:-translate-x-1`} aria-hidden />
          </button>
          <button
            type="button"
            className={`${railBtn} right-0 justify-center sm:justify-end sm:pr-5`}
            aria-label="Next photo"
            onClick={() => swiperRef.current?.slideNext()}
          >
            <span
              className="pointer-events-none absolute inset-y-0 right-0 w-full bg-gradient-to-l from-slate-950/65 via-slate-950/18 to-transparent opacity-95 transition-opacity duration-500 sm:opacity-55 sm:group-hover:opacity-95 sm:group-focus-visible:opacity-95"
              aria-hidden
            />
            <FiChevronRight className={`${iconCls} group-hover:translate-x-0.5 sm:group-hover:translate-x-1`} aria-hidden />
          </button>
        </>
      ) : (
        <div className="relative h-full w-full overflow-hidden">
          <img
            src={urls[0]}
            alt={title}
            className={`h-full w-full object-cover object-center ${guestLocked ? "blur-sm" : ""}`}
            loading="eager"
            decoding="async"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/20"
            aria-hidden
          />
        </div>
      )}
    </section>
  );
}
