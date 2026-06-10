import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function optimizeHeroImageUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) {
    return raw;
  }
  try {
    const parsed = new URL(raw);
    if (parsed.hostname.includes("unsplash.com") || parsed.hostname.includes("plus.unsplash.com")) {
      parsed.searchParams.set("w", "960");
      parsed.searchParams.set("q", "75");
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("fit", "crop");
    }
    return parsed.toString();
  } catch {
    return raw;
  }
}

const slides = [
  {
    image: optimizeHeroImageUrl(
      "https://plus.unsplash.com/premium_photo-1683129651802-1c7ba429a137?q=80&w=1170&auto=format&fit=crop"
    ),
    label: "Music Festival Night"
  },
  {
    image: optimizeHeroImageUrl(
      "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=1170&auto=format&fit=crop"
    ),
    label: "Comedy Show"
  },
  {
    image: optimizeHeroImageUrl(
      "https://images.unsplash.com/photo-1566808925909-1485ad6cddb3?q=80&w=1170&auto=format&fit=crop"
    ),
    label: "Food & Lifestyle Events"
  },
  {
    image: optimizeHeroImageUrl(
      "https://images.unsplash.com/photo-1541445976433-f466f228a409?q=80&w=1170&auto=format&fit=crop"
    ),
    label: "City Fireworks Festival"
  },
  {
    image: optimizeHeroImageUrl(
      "https://images.unsplash.com/photo-1522158637959-30385a09e0da?q=80&w=1170&auto=format&fit=crop"
    ),
    label: "Live Concert Crowd"
  },
  {
    image: optimizeHeroImageUrl(
      "https://images.unsplash.com/photo-1561489396-888724a1543d?q=80&w=1170&auto=format&fit=crop"
    ),
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

function HeroSlideImage({ slide, shouldLoad, isFirst }) {
  if (!shouldLoad) {
    return <div className="hero-slide-image h-full w-full bg-slate-800/90" aria-hidden />;
  }
  return (
    <img
      src={slide.image}
      alt={slide.title}
      loading={isFirst ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={isFirst ? "high" : "low"}
      className="hero-slide-image h-full w-full object-cover"
    />
  );
}

function HeroSlideshow({
  featuredEvents = [],
  onHeroNarrativeChange = null,
  gateReady = true,
  narrativeHoldMs = DEFAULT_NARRATIVE_HOLD_MS
}) {
  const navigate = useNavigate();
  const introHoldTimerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (event) => setIsDesktop(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const featuredSlides = useMemo(
    () =>
      (featuredEvents || [])
        .filter((ev) => ev && ev.id != null)
        .slice(0, 6)
        .map((ev) => ({
          image: optimizeHeroImageUrl(ev.image_url || slides[0].image),
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
  const swiperRemountKey = `${gateReady ? "1" : "0"}-${isDesktop ? "d" : "m"}-${slideSignature}`;

  const shouldLoadSlide = useCallback(
    (idx) => {
      if (slideCount <= 1) {
        return true;
      }
      const prev = (activeIndex - 1 + slideCount) % slideCount;
      const next = (activeIndex + 1) % slideCount;
      return idx === activeIndex || idx === prev || idx === next;
    },
    [activeIndex, slideCount]
  );

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
      setActiveIndex(swiper.realIndex);
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

  const renderSlideBody = (slide, idx) => (
    <>
      <HeroSlideImage slide={slide} shouldLoad={shouldLoadSlide(idx)} isFirst={idx === 0} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
    </>
  );

  const mobileSwiper = (
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
            <div className="relative aspect-[16/10] w-full sm:aspect-[16/9]">{renderSlideBody(slide, idx)}</div>
          </HeroSlideFrame>
        </SwiperSlide>
      ))}
    </Swiper>
  );

  const desktopSwiper = (
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
            <div className="relative aspect-[16/9] w-full lg:aspect-[16/9] xl:aspect-[2/1]">{renderSlideBody(slide, idx)}</div>
          </HeroSlideFrame>
        </SwiperSlide>
      ))}
    </Swiper>
  );

  return (
    <div className="hero-swiper overflow-hidden rounded-2xl border border-white/10 bg-slate-900/20 shadow-xl lg:rounded-3xl lg:shadow-2xl">
      {isDesktop ? desktopSwiper : mobileSwiper}
    </div>
  );
}

export default HeroSlideshow;
