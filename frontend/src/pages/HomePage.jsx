import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import EventCard from "../components/EventCard";
import InfluencerCard from "../components/InfluencerCard";
import {
  normalizeFacebookPageUrl,
  normalizeInstagramProfileUrl,
  normalizeYoutubeUrl,
  parseInfluencerSocialLinks
} from "../utils/influencerSocial";
import DealCard from "../components/DealCard";
import DiscoverySectionCarousel from "../components/DiscoverySectionCarousel";
import HeroSlideshow from "../components/HeroSlideshow";
import BrandHeroLogo from "../components/BrandHeroLogo";
import LandingSplash from "../components/LandingSplash";
import { fetchFeaturedEvents } from "../services/eventService";
import { fetchDeals, fetchInfluencers, trackInfluencerClick } from "../services/listingService";
import useFavorites from "../hooks/useFavorites";
import useCityFilter from "../hooks/useCityFilter";
import { formatDateUS } from "../utils/format";
import { pickHomeCarouselSix, pickLandingSectionCards } from "../utils/homeCarouselCuration";
import { DEFAULT_HERO_NARRATIVE } from "../utils/heroSlideCopy";
import { markHomeSplashConsumed, shouldShowHomeSplash } from "../utils/homeSplashPolicy";
import { useRouteContentReady } from "../context/RouteContentReadyContext";

function isYayDealEventRow(item) {
  return (
    item?.is_yay_deal_event === 1 ||
    item?.is_yay_deal_event === true ||
    String(item?.is_yay_deal_event || "") === "1"
  );
}

function isPremiumDealRow(item) {
  return item?.is_premium === 1 || item?.is_premium === true;
}

function HomePage() {
  const { setBrandLogoPhase, headerLogoRef, startLogoFlight, onSplashExitComplete } = useOutletContext() || {};
  const { selectedCity, selectedCityLabel } = useCityFilter();
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [landingEvents, setLandingEvents] = useState([]);
  const [liveInfluencers, setLiveInfluencers] = useState([]);
  const [liveDeals, setLiveDeals] = useState([]);
  const [landingDeals, setLandingDeals] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingInfluencers, setLoadingInfluencers] = useState(true);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const { isFavorite, toggleFavorite } = useFavorites();
  const [heroNarrative, setHeroNarrative] = useState(DEFAULT_HERO_NARRATIVE);
  const [heroCopyStaggerDone, setHeroCopyStaggerDone] = useState(false);
  const [showEntranceSplash] = useState(() => shouldShowHomeSplash());
  const [landingRevealed, setLandingRevealed] = useState(() => !showEntranceSplash);
  const onHeroNarrativeChange = useCallback((next) => {
    setHeroNarrative(next);
  }, []);
  const dataLoading = loadingEvents || loadingDeals || loadingInfluencers;
  const [homeLayoutPainted, setHomeLayoutPainted] = useState(false);
  useRouteContentReady(dataLoading);

  useEffect(() => {
    if (!showEntranceSplash) {
      setHomeLayoutPainted(true);
      return undefined;
    }
    if (dataLoading) {
      setHomeLayoutPainted(false);
      return undefined;
    }
    let cancelled = false;
    const r1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) {
          setHomeLayoutPainted(true);
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(r1);
    };
  }, [showEntranceSplash, dataLoading]);

  const splashBusy = showEntranceSplash && (dataLoading || !homeLayoutPainted);
  const onLandingRevealed = useCallback(() => {
    markHomeSplashConsumed();
    setLandingRevealed(true);
    setBrandLogoPhase?.("exit");
  }, [setBrandLogoPhase]);

  useEffect(() => {
    if (!setBrandLogoPhase) {
      return undefined;
    }
    if (showEntranceSplash) {
      setBrandLogoPhase("splash");
    } else {
      setBrandLogoPhase("ready");
    }
    return () => setBrandLogoPhase("ready");
  }, [showEntranceSplash, setBrandLogoPhase]);

  useEffect(() => {
    let active = true;

    async function loadTrendingEvents() {
      try {
        setLoadingEvents(true);
        let response = await fetchFeaturedEvents({
          city: selectedCity || undefined,
          limit: 60
        });
        const initialRows = response?.data || [];
        if (selectedCity && initialRows.length === 0) {
          response = await fetchFeaturedEvents({ limit: 60 });
          if (active) {
            setSelectedCity("");
          }
        }
        if (active) {
          const now = Date.now();
          const rawRows = response?.data || [];

          const enriched = rawRows
            .map((ev) => {
              const dateStr = String(ev.event_date || "").slice(0, 10);
              const timeStr = ev.event_time ? String(ev.event_time).slice(0, 5) : "00:00";
              const start = new Date(`${dateStr}T${timeStr}:00`);
              const diffMs = start.getTime() - now;

              let countdownLabel = null;
              if (diffMs > 0) {
                const totalMinutes = Math.floor(diffMs / (1000 * 60));
                const days = Math.floor(totalMinutes / (60 * 24));
                const hours = Math.floor((totalMinutes - days * 60 * 24) / 60);
                const minutes = totalMinutes - days * 60 * 24 - hours * 60;

                if (days > 0) countdownLabel = `${days}d ${hours}h`;
                else if (hours > 0) countdownLabel = `${hours}h ${minutes}m`;
                else countdownLabel = `${minutes}m`;
              }

              return {
                ...ev,
                countdownLabel
              };
            })
            .filter((ev) => ev.countdownLabel !== null);

          const curated = pickHomeCarouselSix(enriched, { isPremium: isYayDealEventRow });
          setTrendingEvents(curated);
          setLandingEvents(
            pickLandingSectionCards(enriched, {
              isPremium: isYayDealEventRow,
              maxStandard: 3,
              maxPremium: 2
            })
          );
        }
      } catch (_err) {
        if (active) {
          setTrendingEvents([]);
          setLandingEvents([]);
        }
      } finally {
        if (active) {
          setLoadingEvents(false);
        }
      }
    }

    loadTrendingEvents();
    return () => {
      active = false;
    };
  }, [selectedCity]);

  const citySuffix = selectedCity ? `in ${selectedCityLabel}` : "Near You";

  useEffect(() => {
    let active = true;
    async function loadInfluencersAndDeals() {
      try {
        setLoadingInfluencers(true);
        setLoadingDeals(true);
        let [influencerResponse, dealsResponse] = await Promise.all([
          fetchInfluencers({
            city: selectedCity || undefined,
            sort: "popularity"
          }),
          fetchDeals({
            city: selectedCity || undefined,
            sort: "popularity",
            only_active: "true"
          })
        ]);
        if (selectedCity) {
          const inflRows = influencerResponse?.data || [];
          const dealRows = dealsResponse?.data || [];
          if (inflRows.length === 0 && dealRows.length === 0) {
            [influencerResponse, dealsResponse] = await Promise.all([
              fetchInfluencers({ sort: "popularity" }),
              fetchDeals({ sort: "popularity", only_active: "true" })
            ]);
            if (active) {
              setSelectedCity("");
            }
          }
        }
        if (!active) {
          return;
        }
        setLiveInfluencers((influencerResponse?.data || []).slice(0, 12));
        const dealPool = (dealsResponse?.data || []).slice(0, 120);
        const curatedDeals = pickHomeCarouselSix(dealPool, { isPremium: isPremiumDealRow });
        setLiveDeals(curatedDeals);
        setLandingDeals(
          pickLandingSectionCards(dealPool, {
            isPremium: isPremiumDealRow,
            maxStandard: 3,
            maxPremium: 2
          })
        );
      } catch (_err) {
        if (active) {
          setLiveInfluencers([]);
          setLiveDeals([]);
          setLandingDeals([]);
        }
      } finally {
        if (active) {
          setLoadingInfluencers(false);
          setLoadingDeals(false);
        }
      }
    }
    loadInfluencersAndDeals();
    return () => {
      active = false;
    };
  }, [selectedCity]);

  const sleek = [0.25, 0.46, 0.45, 0.94];
  const landingHandoffEase = [0.19, 1, 0.22, 1];

  return (
    <>
      {showEntranceSplash ? (
        <LandingSplash
          busy={splashBusy}
          onRevealed={onLandingRevealed}
          onExitComplete={onSplashExitComplete}
          headerLogoRef={headerLogoRef}
          startLogoFlight={startLogoFlight}
        />
      ) : null}
      <motion.div
        className="space-y-10 pb-8"
        initial={false}
        animate={landingRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{
          opacity: { duration: 0.78, ease: landingHandoffEase },
          y: { duration: 0.78, ease: landingHandoffEase }
        }}
        aria-hidden={!landingRevealed}
        style={{ pointerEvents: landingRevealed ? "auto" : "none" }}
      >
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 px-4 py-6 text-white sm:px-8 sm:py-7 lg:px-10 lg:py-7">
        <div className="grid grid-cols-1 items-center gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:gap-8">
          <div className="space-y-4 lg:pr-2">
            <BrandHeroLogo className="hero-brand-logo-mobile-only" entranceActive={landingRevealed} />
            <div className="min-h-[3.25rem] sm:min-h-[4rem] lg:min-h-[4.75rem] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={heroNarrative.headline}
                  initial={{ opacity: 0, y: 16 }}
                  animate={
                    landingRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }
                  }
                  exit={{ opacity: 0, y: -8 }}
                  transition={{
                    delay: landingRevealed && !heroCopyStaggerDone ? 0.22 : 0,
                    duration: heroCopyStaggerDone ? 0.38 : 0.68,
                    ease: sleek
                  }}
                  style={{ willChange: "transform, opacity" }}
                  onAnimationComplete={() => {
                    if (landingRevealed) {
                      setHeroCopyStaggerDone(true);
                    }
                  }}
                  className="max-w-2xl bg-gradient-to-br from-white via-white to-slate-200/90 bg-clip-text text-xl font-bold leading-snug text-transparent sm:text-3xl lg:text-4xl"
                >
                  {heroNarrative.headline}
                </motion.h1>
              </AnimatePresence>
              {landingRevealed && !heroCopyStaggerDone ? (
                <motion.div
                  aria-hidden
                  className="mt-2 h-0.5 max-w-[4.5rem] rounded-full bg-gradient-to-r from-rose-400/0 via-white/70 to-fuchsia-400/0"
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: 0.42, duration: 0.55, ease: sleek }}
                  style={{ transformOrigin: "left center" }}
                />
              ) : null}
            </div>
            <div className="min-h-[2.75rem] sm:min-h-[3rem] lg:min-h-[3.25rem] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={heroNarrative.subline}
                  initial={{ opacity: 0, y: 12 }}
                  animate={
                    landingRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }
                  }
                  exit={{ opacity: 0, y: -6 }}
                  transition={{
                    delay:
                      landingRevealed && !heroCopyStaggerDone ? 0.4 : heroCopyStaggerDone ? 0.04 : 0,
                    duration: heroCopyStaggerDone ? 0.34 : 0.62,
                    ease: sleek
                  }}
                  style={{ willChange: "transform, opacity" }}
                  className="mt-0 max-w-xl text-xs text-slate-200/95 sm:text-sm lg:text-[14px] lg:leading-relaxed"
                >
                  {heroNarrative.subline}
                </motion.p>
              </AnimatePresence>
            </div>
            <motion.div
              initial={false}
              animate={
                landingRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }
              }
              transition={{ duration: 0.65, delay: landingRevealed ? 0.55 : 0, ease: sleek }}
              className="mt-4 flex flex-wrap items-center gap-2.5 sm:gap-3"
            >
              <Link
                to="/events"
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:px-5 sm:py-2.5 sm:text-sm lg:bg-gradient-to-r lg:from-rose-500 lg:via-fuchsia-500 lg:to-indigo-500 lg:px-5 lg:py-2.5 lg:text-sm lg:shadow-[0_16px_36px_rgba(244,63,94,0.2)] lg:ring-1 lg:ring-white/15 lg:hover:-translate-y-0.5 lg:hover:shadow-[0_22px_50px_rgba(99,102,241,0.26)]"
              >
                <span className="pointer-events-none absolute inset-0 hidden opacity-0 transition duration-300 group-hover:opacity-100 lg:block">
                  <span className="absolute -left-1/4 top-0 h-full w-1/2 -skew-x-12 bg-white/20 blur-sm" />
                </span>
                <span className="relative">Explore Events</span>
              </Link>
              <Link
                to="/deals"
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-white/30 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 sm:px-5 sm:py-2.5 sm:text-sm lg:border lg:border-white/25 lg:bg-white/10 lg:px-5 lg:py-2.5 lg:text-sm lg:shadow-[0_14px_32px_rgba(15,23,42,0.2)] lg:ring-1 lg:ring-white/10 lg:backdrop-blur lg:hover:-translate-y-0.5 lg:hover:bg-white/15 lg:hover:shadow-[0_20px_44px_rgba(15,23,42,0.26)]"
              >
                <span className="pointer-events-none absolute inset-0 hidden opacity-0 transition duration-300 group-hover:opacity-100 lg:block">
                  <span className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-400/15 to-indigo-400/20" />
                </span>
                <span className="relative">Explore Deals</span>
              </Link>
            </motion.div>
          </div>
          <HeroSlideshow
            featuredEvents={trendingEvents}
            onHeroNarrativeChange={onHeroNarrativeChange}
            gateReady={landingRevealed}
            narrativeHoldMs={900}
          />
        </div>
      </section>

      <DiscoverySectionCarousel title={`Trending Events ${citySuffix}`} actionHref="/events" variant="landing-grid3">
        {loadingEvents
          ? Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={`event-skeleton-${idx}`}
                className="h-[290px] min-w-[260px] max-w-[260px] snap-start animate-pulse rounded-3xl border border-slate-200 bg-white lg:min-w-[calc((100%-2rem)/3)] lg:max-w-[calc((100%-2rem)/3)]"
              />
            ))
          : landingEvents.map((item) => (
              <div
                key={item.id}
                className="min-w-[260px] max-w-[260px] snap-start lg:min-w-[calc((100%-2rem)/3)] lg:max-w-[calc((100%-2rem)/3)]"
              >
                <EventCard
                  item={{
                    id: item.id,
                    title: item.title,
                    category: item.category_name || "General",
                    city: item.city_name || "City",
                    date: formatDateUS(item.event_date),
                    time: item.event_time ? String(item.event_time).slice(0, 5) : "",
                    price: item.price,
                    image: item.image_url,
                    galleryImages: item.gallery_image_urls
                  }}
                  isYayDealEvent={
                    item.is_yay_deal_event === 1 ||
                    item.is_yay_deal_event === true ||
                    String(item.is_yay_deal_event || "") === "1"
                  }
                  showPremiumBadge
                  isFavorite={isFavorite("event", item.id)}
                  tags={item.tags || []}
                  countdownLabel={item.countdownLabel}
                  onToggleFavorite={() =>
                    toggleFavorite({
                      listingType: "event",
                      listingId: item.id
                    })
                  }
                />
              </div>
            ))}
      </DiscoverySectionCarousel>

      <DiscoverySectionCarousel title={`Popular Influencers ${citySuffix}`} actionHref="/influencers" variant="landing-grid3">
        {loadingInfluencers
          ? Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`influencer-skeleton-${idx}`}
                className="h-[290px] min-w-[260px] max-w-[260px] snap-start animate-pulse rounded-3xl border border-slate-200 bg-white lg:min-w-[calc((100%-2rem)/3)] lg:max-w-[calc((100%-2rem)/3)]"
              />
            ))
          : liveInfluencers.length > 0
            ? liveInfluencers.slice(0, 9).map((item) => {
                const socialLinks = parseInfluencerSocialLinks(item.social_links);
                return (
                <div
                  key={item.id}
                  className="min-w-[260px] max-w-[260px] snap-start lg:min-w-[calc((100%-2rem)/3)] lg:max-w-[calc((100%-2rem)/3)]"
                >
                  <InfluencerCard
                    item={{
                      id: item.id,
                      name: item.name,
                      category: item.category_name || "Lifestyle",
                      city: item.city_name || "City",
                      followers: item.followers_count || 0,
                      facebookFollowers: item.facebook_followers_count || 0,
                      youtubeSubscribers: item.youtube_subscribers_count || 0,
                      instagramUrl: normalizeInstagramProfileUrl(socialLinks.instagram),
                      facebookUrl: normalizeFacebookPageUrl(socialLinks.facebook),
                      youtubeUrl: normalizeYoutubeUrl(socialLinks.youtube),
                      tags: item.tags || [],
                      image: item.profile_image_url
                    }}
                    onViewDetails={(id) => trackInfluencerClick(id).catch(() => {})}
                  />
                </div>
                );
              })
            : (
              <p className="min-w-[260px] text-sm text-slate-500">No influencers available right now.</p>
            )}
      </DiscoverySectionCarousel>

      <DiscoverySectionCarousel title={`Top Deals ${citySuffix}`} actionHref="/deals" variant="landing-grid3">
        {loadingDeals
          ? Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={`deal-skeleton-${idx}`}
                className="h-[290px] min-w-[260px] max-w-[260px] snap-start animate-pulse rounded-3xl border border-slate-200 bg-white lg:min-w-[calc((100%-2rem)/3)] lg:max-w-[calc((100%-2rem)/3)]"
              />
            ))
          : liveDeals.length > 0
            ? landingDeals.map((item) => (
                <div
                  key={item.id}
                  className="min-w-[260px] max-w-[260px] snap-start lg:min-w-[calc((100%-2rem)/3)] lg:max-w-[calc((100%-2rem)/3)]"
                >
                  <DealCard
                    item={{
                      id: item.id,
                      title: item.title,
                      city: item.city_name || "City",
                      tags: item.tags || [],
                      discount: item.original_price
                        ? Math.max(0, Math.round(((item.original_price - item.discounted_price) / item.original_price) * 100))
                        : 0,
                      originalPrice: item.original_price || item.discounted_price || 0,
                      price: item.discounted_price || item.original_price || 0,
                      image: item.image_url,
                      dealInfo: item.terms_text || item.description || "",
                      offerType: item.offer_type,
                      offerMetaJson: item.offer_meta_json
                    }}
                    tags={item.tags || []}
                    isPremium={item.is_premium === 1 || item.is_premium === true}
                    showPremiumBadge
                  />
                </div>
              ))
            : (
              <p className="min-w-[260px] text-sm text-slate-500">No deals available right now.</p>
            )}
      </DiscoverySectionCarousel>

      </motion.div>
    </>
  );
}

export default HomePage;
