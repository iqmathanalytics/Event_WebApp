import { useCallback, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Navigation, Pagination } from "swiper/modules";
import { buildHeroNarrativeFromSlide } from "../utils/heroSlideCopy";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

function isYayEvent(ev) {
  return ev?.is_yay_deal_event === 1 || ev?.is_yay_deal_event === true || String(ev?.is_yay_deal_event || "") === "1";
}

function HeroSlideOverlay({ variant = "featured" }) {
  const badgeLabel = variant === "yay" ? "Yay! Event" : "Featured Event";
  const badgeSubLabel = variant === "yay" ? "Members-only perks" : "Handpicked for you";
  const badgeClass =
    variant === "yay"
      ? "from-amber-400/90 via-rose-500/90 to-fuchsia-500/90"
      : "from-indigo-400/90 via-fuchsia-500/90 to-rose-500/90";

  return (
    <div className="absolute right-1.5 top-1.5 z-20 flex flex-col items-end gap-1 sm:right-3 sm:top-3 sm:gap-1.5 lg:right-4 lg:top-4 lg:gap-2">
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.92, rotate: -2 }}
        animate={{
          opacity: 1,
          y: [0, -2.5, 0],
          scale: 1,
          rotate: [0, 0.6, 0]
        }}
        transition={{
          opacity: { duration: 0.35, ease: "easeOut" },
          scale: { duration: 0.35, ease: "easeOut" },
          y: { duration: 3.2, ease: "easeInOut", repeat: Infinity },
          rotate: { duration: 4.2, ease: "easeInOut", repeat: Infinity }
        }}
        whileHover={{ rotate: [-1.2, 1.2, -0.8, 0.8, 0], transition: { duration: 0.55, ease: "easeInOut" } }}
        className="group relative overflow-hidden rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 backdrop-blur sm:rounded-2xl sm:px-3 sm:py-2 lg:rounded-3xl lg:px-4 lg:py-3"
      >
        <div className="pointer-events-none absolute inset-0 opacity-95">
          <div className={`absolute inset-0 bg-gradient-to-r ${badgeClass}`} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.35),transparent_55%)]" />
          <motion.div
            aria-hidden
            animate={{ x: ["-40%", "140%"] }}
            transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.4 }}
            className="absolute -left-1/2 top-0 h-full w-1/2 -skew-x-12 bg-white/25 blur-sm"
          />
          <motion.div
            aria-hidden
            animate={{ opacity: [0.25, 0.6, 0.25] }}
            transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
            className="absolute -inset-8 rounded-full bg-white/10 blur-2xl"
          />
        </div>
        <div className="relative">
          <p className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-white drop-shadow sm:text-[11px] lg:text-[13px]">
            {badgeLabel}
          </p>
          <p className="mt-0.5 hidden text-[8px] font-semibold text-white/90 drop-shadow-sm sm:block sm:text-[10px] lg:text-[11px]">
            {badgeSubLabel}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.06 }}
      >
        <Link
          to="/login"
          className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white/10 px-2 py-1 text-[9px] font-semibold text-white shadow-[0_10px_22px_rgba(0,0,0,0.28)] ring-1 ring-white/15 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15 hover:ring-white/25 sm:px-3 sm:py-2 sm:text-[11px] sm:shadow-[0_14px_32px_rgba(0,0,0,0.32)] lg:px-4 lg:py-2.5 lg:text-xs lg:shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
        >
          <span className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
            <span className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/0 to-white/10" />
          </span>
          <motion.span
            className="relative"
            animate={{ y: [0, -1, 0] }}
            transition={{ duration: 1.9, ease: "easeInOut", repeat: Infinity }}
          >
            Continue to unlock
          </motion.span>
        </Link>
      </motion.div>
    </div>
  );
}

function pushNarrative(swiper, slidesList, onHeroNarrativeChangeP) {
  if (!onHeroNarrativeChangeP || !slidesList.length || !swiper) {
    return;
  }
  const raw = slidesList[swiper.realIndex];
  if (raw) {
    onHeroNarrativeChangeP(buildHeroNarrativeFromSlide(raw));
  }
}

const slides = [
  {
    image:
      "https://plus.unsplash.com/premium_photo-1683129651802-1c7ba429a137?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    label: "Music Festival Night"
  },
  {
    image:
      "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    label: "Comedy Show"
  },
  {
    image:
      "https://images.unsplash.com/photo-1566808925909-1485ad6cddb3?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    label: "Food & Lifestyle Events"
  },
  {
    image:
      "https://images.unsplash.com/photo-1541445976433-f466f228a409?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    label: "City Fireworks Festival"
  },
  {
    image:
      "https://images.unsplash.com/photo-1522158637959-30385a09e0da?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    label: "Live Concert Crowd"
  },
  {
    image:
      "https://images.unsplash.com/photo-1561489396-888724a1543d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    label: "Professional Networking Event"
  }
];

const DEFAULT_NARRATIVE_HOLD_MS = 980;

function HeroSlideshow({
  featuredEvents = [],
  onHeroNarrativeChange = null,
  gateReady = true,
  narrativeHoldMs = DEFAULT_NARRATIVE_HOLD_MS
}) {
  const introHoldTimerRef = useRef(null);
  const featuredSlides = useMemo(
    () =>
      (featuredEvents || [])
        .filter((ev) => ev && ev.id != null)
        .slice(0, 6)
        .map((ev) => ({
          image: ev.image_url || slides[0].image,
          title: ev.title || "Featured Event",
          id: ev.id,
          variant: isYayEvent(ev) ? "yay" : "featured",
          countdownLabel: ev.countdownLabel ?? null
        })),
    [featuredEvents]
  );

  const fallbackSlides = useMemo(
    () => slides.map((s) => ({ image: s.image, title: s.label, variant: "featured", countdownLabel: null })),
    []
  );

  const effectiveSlides = useMemo(
    () => (featuredSlides.length ? featuredSlides : fallbackSlides),
    [featuredSlides, fallbackSlides]
  );

  const slideSignature = useMemo(() => effectiveSlides.map((s) => s.id ?? s.title).join("|"), [effectiveSlides]);

  const slideCount = effectiveSlides.length;
  const canLoop = slideCount > 1;
  const swiperRemountKey = `${gateReady ? "1" : "0"}-${slideSignature}`;

  const emitSlide = useCallback(
    (swiper) => {
      if (!gateReady) {
        return;
      }
      if (introHoldTimerRef.current != null) {
        window.clearTimeout(introHoldTimerRef.current);
        introHoldTimerRef.current = null;
      }
      pushNarrative(swiper, effectiveSlides, onHeroNarrativeChange);
    },
    [effectiveSlides, onHeroNarrativeChange, gateReady]
  );

  useEffect(() => {
    if (!onHeroNarrativeChange || !effectiveSlides.length || !gateReady) {
      return undefined;
    }
    if (introHoldTimerRef.current != null) {
      window.clearTimeout(introHoldTimerRef.current);
    }
    introHoldTimerRef.current = window.setTimeout(() => {
      introHoldTimerRef.current = null;
      onHeroNarrativeChange(buildHeroNarrativeFromSlide(effectiveSlides[0]));
    }, narrativeHoldMs);
    return () => {
      if (introHoldTimerRef.current != null) {
        window.clearTimeout(introHoldTimerRef.current);
        introHoldTimerRef.current = null;
      }
    };
  }, [slideSignature, effectiveSlides, onHeroNarrativeChange, gateReady, narrativeHoldMs]);

  return (
    <div className="hero-swiper overflow-hidden rounded-2xl border border-white/10 bg-slate-900/20 shadow-xl lg:rounded-3xl lg:shadow-2xl">
      {/* Mobile/tablet: fade autoplay — remount when gate opens so Autoplay starts reliably */}
      <Swiper
        key={`hero-m-${swiperRemountKey}`}
        modules={[Autoplay, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop={canLoop}
        speed={850}
        autoplay={
          gateReady
            ? {
                delay: 4000,
                disableOnInteraction: false,
                pauseOnMouseEnter: false,
                waitForTransition: true
              }
            : false
        }
        watchSlidesProgress
        className="block w-full lg:hidden"
        onSlideChange={emitSlide}
      >
        {effectiveSlides.map((slide, idx) => (
          <SwiperSlide key={`${slide.title}-${idx}`}>
            <article className="relative aspect-[16/10] w-full sm:aspect-[16/9]">
              <HeroSlideOverlay variant={slide.variant} />
              <img
                src={slide.image}
                alt={slide.title}
                loading="lazy"
                className="hero-slide-image h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 sm:p-4">
                <p className="text-xs font-semibold tracking-wide text-white drop-shadow sm:text-sm">{slide.title}</p>
              </div>
            </article>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Desktop: swipe + autoplay — remount when gate opens so Autoplay starts reliably */}
      <Swiper
        key={`hero-d-${swiperRemountKey}`}
        modules={[Autoplay, Navigation, Pagination]}
        loop={canLoop}
        speed={850}
        autoplay={
          gateReady
            ? {
                delay: 4200,
                disableOnInteraction: false,
                pauseOnMouseEnter: false,
                waitForTransition: true
              }
            : false
        }
        pagination={{ clickable: true, dynamicBullets: true }}
        navigation
        watchSlidesProgress
        className="hidden w-full lg:block"
        onSlideChange={emitSlide}
      >
        {effectiveSlides.map((slide, idx) => (
          <SwiperSlide key={`${slide.title}-${idx}`}>
            <article className="relative aspect-[16/9] w-full lg:aspect-[16/9] xl:aspect-[2/1]">
              <HeroSlideOverlay variant={slide.variant} />
              <img
                src={slide.image}
                alt={slide.title}
                loading="lazy"
                className="hero-slide-image h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 lg:p-5">
                <p className="text-sm font-semibold tracking-wide text-white drop-shadow lg:text-base">
                  {slide.title}
                </p>
              </div>
            </article>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

export default HeroSlideshow;
