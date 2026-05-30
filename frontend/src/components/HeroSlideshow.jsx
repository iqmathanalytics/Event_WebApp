import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Navigation, Pagination } from "swiper/modules";
import { buildHeroNarrativeFromSlide } from "../utils/heroSlideCopy";
import { eventDetailPath } from "../utils/listingPaths";
import { trackEventClick } from "../services/eventService";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

function isYayEvent(ev) {
  return ev?.is_yay_deal_event === 1 || ev?.is_yay_deal_event === true || String(ev?.is_yay_deal_event || "") === "1";
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

function HeroSlideFrame({ slide, onOpen, children }) {
  if (slide.detailPath) {
    return (
      <button
        type="button"
        onClick={() => onOpen(slide)}
        className="relative block w-full cursor-pointer text-left"
        aria-label={`View ${slide.title}`}
      >
        {children}
      </button>
    );
  }
  return <article className="relative w-full">{children}</article>;
}

function HeroSlideshow({
  featuredEvents = [],
  onHeroNarrativeChange = null,
  gateReady = true,
  narrativeHoldMs = DEFAULT_NARRATIVE_HOLD_MS
}) {
  const navigate = useNavigate();
  const introHoldTimerRef = useRef(null);
  const featuredSlides = useMemo(
    () =>
      (featuredEvents || [])
        .filter((ev) => ev && ev.id != null)
        .slice(0, 6)
        .map((ev) => ({
          image: ev.image_url || slides[0].image,
          title: ev.title || "Featured Event",
          description: ev.description || "",
          id: ev.id,
          public_slug: ev.public_slug,
          detailPath: eventDetailPath(ev),
          variant: isYayEvent(ev) ? "yay" : "featured",
          countdownLabel: ev.countdownLabel ?? null
        })),
    [featuredEvents]
  );

  const fallbackSlides = useMemo(
    () => slides.map((s) => ({ image: s.image, title: s.label, variant: "featured", countdownLabel: null, detailPath: null })),
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

  const openSlide = useCallback(
    (slide) => {
      if (!slide?.detailPath) {
        return;
      }
      if (slide.id) {
        trackEventClick(slide.public_slug || slide.id).catch(() => {});
      }
      navigate(slide.detailPath);
    },
    [navigate]
  );

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

  const renderSlideBody = (slide) => (
    <>
      <img src={slide.image} alt={slide.title} loading="lazy" className="hero-slide-image h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
    </>
  );

  return (
    <div className="hero-swiper overflow-hidden rounded-2xl border border-white/10 bg-slate-900/20 shadow-xl lg:rounded-3xl lg:shadow-2xl">
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
            <HeroSlideFrame slide={slide} onOpen={openSlide}>
              <div className="relative aspect-[16/10] w-full sm:aspect-[16/9]">{renderSlideBody(slide)}</div>
            </HeroSlideFrame>
          </SwiperSlide>
        ))}
      </Swiper>

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
            <HeroSlideFrame slide={slide} onOpen={openSlide}>
              <div className="relative aspect-[16/9] w-full lg:aspect-[16/9] xl:aspect-[2/1]">{renderSlideBody(slide)}</div>
            </HeroSlideFrame>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

export default HeroSlideshow;
