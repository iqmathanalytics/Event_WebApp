import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { FiChevronLeft, FiChevronRight, FiImage } from "react-icons/fi";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Keyboard, Pagination } from "swiper/modules";
import ListingDetailBannerImage from "./ListingDetailBannerImage";
import EventDetailBannerVideoSlide from "./EventDetailBannerVideoSlide";
import { LISTING_DETAIL_BANNER_HEIGHT, LISTING_DETAIL_BANNER_SHELL } from "../constants/listingBannerLayout";
import { collectEventBannerSlides } from "../utils/eventGallery";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

const AUTOPLAY_MS = 4200;
const FADE_MS = 850;

/**
 * Hero slideshow: images + promo videos, automatic cross-fade, fraction counter, soft edge prev/next.
 */
export default function EventDetailBanner({
  event,
  title,
  className = "",
  guestLocked = false,
  promoVideos = null,
  videoGuestLocked = false
}) {
  const reduceMotion = useReducedMotion();
  const swiperRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const slides = useMemo(
    () => collectEventBannerSlides(event, { promoVideos: promoVideos ?? undefined }),
    [event, promoVideos]
  );
  const multi = slides.length > 1;
  const hasSlides = slides.length > 0;

  const swiperClass =
    "event-detail-hero-swiper group/hero h-full w-full " +
    "[&_.swiper-pagination-fraction]:bottom-3 [&_.swiper-pagination-fraction]:left-1/2 [&_.swiper-pagination-fraction]:right-auto [&_.swiper-pagination-fraction]:top-auto [&_.swiper-pagination-fraction]:w-auto [&_.swiper-pagination-fraction]:-translate-x-1/2 " +
    "[&_.swiper-pagination-fraction]:rounded-full [&_.swiper-pagination-fraction]:border [&_.swiper-pagination-fraction]:border-white/25 [&_.swiper-pagination-fraction]:bg-slate-950/55 [&_.swiper-pagination-fraction]:px-3.5 [&_.swiper-pagination-fraction]:py-1.5 " +
    "[&_.swiper-pagination-fraction]:text-[11px] [&_.swiper-pagination-fraction]:font-semibold [&_.swiper-pagination-fraction]:tracking-wide [&_.swiper-pagination-fraction]:tabular-nums [&_.swiper-pagination-fraction]:text-white/95 [&_.swiper-pagination-fraction]:backdrop-blur-md " +
    "[&_.swiper-pagination-fraction]:shadow-lg";

  const autoplayActive = multi && !reduceMotion;

  const baseSection = `${LISTING_DETAIL_BANNER_SHELL} ${className}`;

  const railBtn =
    "group absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 touch-manipulation items-center justify-center rounded-full border-0 bg-slate-950/55 p-0 outline-none backdrop-blur-sm " +
    "transition hover:bg-slate-950/75 focus-visible:ring-2 focus-visible:ring-white/45 focus-visible:ring-offset-0 sm:h-12 sm:w-12";

  const iconCls =
    "relative z-10 text-white/90 transition-[transform,opacity] duration-300 ease-out group-hover:text-white " +
    "size-9 stroke-[1.35] drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] sm:size-10";

  const handleSlideChange = (swiper) => {
    setActiveIndex(swiper.realIndex);
  };

  const handleVideoPlayStart = () => {
    setVideoPlaying(true);
  };

  const handleVideoPlayStop = () => {
    setVideoPlaying(false);
  };

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper?.autoplay) {
      return;
    }
    if (videoPlaying) {
      swiper.autoplay.stop();
    } else if (autoplayActive) {
      swiper.autoplay.start();
    }
  }, [videoPlaying, autoplayActive]);

  const ariaLabel = multi ? "Event photos and promo videos" : slides[0]?.type === "video" ? "Event promo video" : "Event cover photo";

  return (
    <section className={baseSection} aria-label={ariaLabel}>
      <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-1 ring-inset ring-white/10 lg:rounded-3xl" aria-hidden />
      {!hasSlides ? (
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
              handleSlideChange(instance);
            }}
            onSlideChange={handleSlideChange}
            pagination={{
              clickable: true,
              type: "fraction"
            }}
            effect="fade"
            fadeEffect={{ crossFade: true }}
            speed={FADE_MS}
            loop={slides.length >= 2}
            grabCursor={!videoPlaying}
            allowTouchMove={!videoPlaying}
            keyboard={{ enabled: !videoPlaying }}
            autoplay={
              autoplayActive && !videoPlaying
                ? {
                    delay: AUTOPLAY_MS,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                    waitForTransition: true,
                    stopOnLastSlide: false
                  }
                : false
            }
            slidesPerView={1}
          >
            {slides.map((slide, idx) => (
              <SwiperSlide key={slide.type === "image" ? slide.src : slide.watchUrl} className="!h-full">
                {slide.type === "image" ? (
                  <ListingDetailBannerImage
                    src={slide.src}
                    alt={idx === 0 ? `${title} — cover` : `${title} — photo ${idx + 1}`}
                    guestLocked={guestLocked}
                    eager={idx === 0}
                  />
                ) : (
                  <EventDetailBannerVideoSlide
                    watchUrl={slide.watchUrl}
                    embedUrl={slide.embedUrl}
                    thumbnail={slide.thumbnail}
                    title={title}
                    slideIndex={idx}
                    active={activeIndex === idx}
                    guestLocked={videoGuestLocked}
                    onPlayStart={handleVideoPlayStart}
                    onPlayStop={handleVideoPlayStop}
                  />
                )}
              </SwiperSlide>
            ))}
          </Swiper>

          <button
            type="button"
            className={`${railBtn} left-3 sm:left-5`}
            aria-label="Previous slide"
            onClick={() => swiperRef.current?.slidePrev()}
          >
            <FiChevronLeft className={`${iconCls} group-hover:-translate-x-0.5`} aria-hidden />
          </button>
          <button
            type="button"
            className={`${railBtn} right-3 sm:right-5`}
            aria-label="Next slide"
            onClick={() => swiperRef.current?.slideNext()}
          >
            <FiChevronRight className={`${iconCls} group-hover:translate-x-0.5`} aria-hidden />
          </button>
        </>
      ) : slides[0].type === "image" ? (
        <ListingDetailBannerImage src={slides[0].src} alt={title} guestLocked={guestLocked} eager />
      ) : (
        <EventDetailBannerVideoSlide
          watchUrl={slides[0].watchUrl}
          embedUrl={slides[0].embedUrl}
          thumbnail={slides[0].thumbnail}
          title={title}
          slideIndex={0}
          active
          guestLocked={videoGuestLocked}
          onPlayStart={handleVideoPlayStart}
          onPlayStop={handleVideoPlayStop}
        />
      )}
    </section>
  );
}

export { LISTING_DETAIL_BANNER_HEIGHT };
