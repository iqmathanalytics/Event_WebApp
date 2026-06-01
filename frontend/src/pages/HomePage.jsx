import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
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
import LandingCarouselSlot from "../components/LandingCarouselSlot";
import HeroSlideshow from "../components/HeroSlideshow";
import HeroEventBadge from "../components/HeroEventBadge";
import LandingSplash from "../components/LandingSplash";
import { fetchFeaturedEvents } from "../services/eventService";
import { fetchDeals, fetchInfluencers, trackInfluencerClick } from "../services/listingService";
import useFavorites from "../hooks/useFavorites";
import useCityFilter from "../hooks/useCityFilter";
import { formatDateUS } from "../utils/format";
import { getEventSortDate } from "../utils/eventSchedule";
import { trackEventClick } from "../services/eventService";
import { pickHomeCarouselFromSorted, pickLandingSectionFromSorted } from "../utils/homeCarouselCuration";
import {
  enrichEventWithCountdown,
  isUpcomingEvent,
  sortEventsByDate
} from "../utils/eventPopularity";
import { DEFAULT_HERO_NARRATIVE } from "../utils/heroSlideCopy";
import { markHomeSplashConsumed, shouldShowHomeSplash } from "../utils/homeSplashPolicy";
import { useRouteContentReady } from "../context/RouteContentReadyContext";

function HomePage() {
  const navigate = useNavigate();
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
          const rawRows = response?.data || [];

          const enriched = sortEventsByDate(
            rawRows
              .filter(isUpcomingEvent)
              .map(enrichEventWithCountdown)
          );

          setTrendingEvents(pickHomeCarouselFromSorted(enriched, 6));
          setLandingEvents(pickLandingSectionFromSorted(enriched, { limit: 8 }));
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
        const curatedDeals = pickHomeCarouselSix(dealPool);
        setLiveDeals(curatedDeals);
        setLandingDeals(pickLandingSectionCards(dealPool, { limit: 8 }));
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

  const heroActionPill =
    "inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3.5 text-xs font-semibold leading-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:px-4 lg:h-9 lg:px-3.5 lg:text-xs";
  const heroActionGhost = `${heroActionPill} border border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20`;
  const heroActionPrimary = `${heroActionPill} border border-white/20 bg-brand-600 text-white shadow-sm hover:bg-brand-700 lg:bg-gradient-to-r lg:from-rose-500 lg:via-fuchsia-500 lg:to-indigo-500 lg:shadow-[0_12px_28px_rgba(244,63,94,0.18)] lg:ring-1 lg:ring-white/15 lg:hover:-translate-y-0.5`;

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
        <div className="grid grid-cols-1 items-center gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-stretch lg:gap-8">
          <div className="flex min-h-0 flex-col lg:h-full lg:pr-2">
            <div className="shrink-0 overflow-hidden">
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

            <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 sm:mt-4 lg:mt-4">
              <div className="relative min-h-0 flex-1 overflow-hidden overscroll-none">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={heroNarrative.subline}
                    initial={
                      heroCopyStaggerDone ? { opacity: 0 } : { opacity: 0, y: 12 }
                    }
                    animate={
                      landingRevealed
                        ? heroCopyStaggerDone
                          ? { opacity: 1 }
                          : { opacity: 1, y: 0 }
                        : heroCopyStaggerDone
                          ? { opacity: 0 }
                          : { opacity: 0, y: 12 }
                    }
                    exit={heroCopyStaggerDone ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    transition={{
                      delay:
                        landingRevealed && !heroCopyStaggerDone ? 0.4 : heroCopyStaggerDone ? 0.04 : 0,
                      duration: heroCopyStaggerDone ? 0.34 : 0.62,
                      ease: sleek
                    }}
                    style={{ willChange: "opacity" }}
                    className="line-clamp-4 max-w-xl text-xs leading-relaxed text-slate-200/95 sm:text-sm lg:text-[14px] lg:leading-[1.65]"
                  >
                    {heroNarrative.subline}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            <motion.div
              initial={false}
              animate={
                landingRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }
              }
              transition={{ duration: 0.65, delay: landingRevealed ? 0.48 : 0, ease: sleek }}
              className="mt-6 flex shrink-0 flex-wrap items-center gap-2 sm:mt-8 lg:mt-4 lg:flex-nowrap lg:gap-2"
            >
              {heroNarrative.detailPath && heroNarrative.variant ? (
                <HeroEventBadge variant={heroNarrative.variant} alignActions />
              ) : null}
              {heroNarrative.detailPath ? (
                <button
                  type="button"
                  onClick={() => {
                    trackEventClick(heroNarrative.detailPath.replace(/^\/events\//, "")).catch(() => {});
                    navigate(heroNarrative.detailPath);
                  }}
                  className={heroActionGhost}
                >
                  View details
                </button>
              ) : null}
              <Link to="/events" className={`group relative overflow-hidden ${heroActionPrimary}`}>
                <span className="pointer-events-none absolute inset-0 hidden opacity-0 transition duration-300 group-hover:opacity-100 lg:block">
                  <span className="absolute -left-1/4 top-0 h-full w-1/2 -skew-x-12 bg-white/20 blur-sm" />
                </span>
                <span className="relative">Explore Events</span>
              </Link>
              <Link to="/deals" className={`group relative overflow-hidden ${heroActionGhost}`}>
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

      <DiscoverySectionCarousel title={`Trending Events ${citySuffix}`} actionHref="/events" variant="landing-grid8">
        {loadingEvents
          ? Array.from({ length: 8 }).map((_, idx) => (
              <LandingCarouselSlot key={`event-skeleton-${idx}`} grid>
                <div className="min-h-[20rem] flex-1 animate-pulse rounded-3xl border border-slate-200 bg-white" />
              </LandingCarouselSlot>
            ))
          : landingEvents.map((item) => (
              <LandingCarouselSlot key={item.id} grid>
                <EventCard
                  variant="landing"
                  item={{
                    ...item,
                    id: item.id,
                    public_slug: item.public_slug,
                    title: item.title,
                    category: item.category_name || "General",
                    city: item.city_name || "City",
                    event_date: getEventSortDate(item) || item.event_date,
                    event_time: item.event_time,
                    date: formatDateUS(getEventSortDate(item) || item.event_date),
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
              </LandingCarouselSlot>
            ))}
      </DiscoverySectionCarousel>

      <DiscoverySectionCarousel title={`Popular Influencers ${citySuffix}`} actionHref="/influencers" variant="landing-grid8">
        {loadingInfluencers
          ? Array.from({ length: 8 }).map((_, idx) => (
              <LandingCarouselSlot key={`influencer-skeleton-${idx}`} grid>
                <div className="min-h-[20rem] flex-1 animate-pulse rounded-3xl border border-slate-200 bg-white" />
              </LandingCarouselSlot>
            ))
          : liveInfluencers.length > 0
            ? liveInfluencers.slice(0, 8).map((item) => {
                const socialLinks = parseInfluencerSocialLinks(item.social_links);
                return (
                <LandingCarouselSlot key={item.id} grid>
                  <InfluencerCard
                    variant="landing"
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
                    isFavorite={isFavorite("influencer", item.id)}
                    onViewDetails={(id) => trackInfluencerClick(id).catch(() => {})}
                    onToggleFavorite={() =>
                      toggleFavorite({
                        listingType: "influencer",
                        listingId: item.id
                      })
                    }
                  />
                </LandingCarouselSlot>
                );
              })
            : (
              <p className="min-w-full text-sm text-slate-500">No influencers available right now.</p>
            )}
      </DiscoverySectionCarousel>

      <DiscoverySectionCarousel title={`Top Deals ${citySuffix}`} actionHref="/deals" variant="landing-grid8">
        {loadingDeals
          ? Array.from({ length: 8 }).map((_, idx) => (
              <LandingCarouselSlot key={`deal-skeleton-${idx}`} grid>
                <div className="min-h-[20rem] flex-1 animate-pulse rounded-3xl border border-slate-200 bg-white" />
              </LandingCarouselSlot>
            ))
          : landingDeals.length > 0
            ? landingDeals.map((item) => (
                <LandingCarouselSlot key={item.id} grid>
                  <DealCard
                    variant="landing"
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
                    isFavorite={isFavorite("deal", item.id)}
                    onToggleFavorite={() =>
                      toggleFavorite({
                        listingType: "deal",
                        listingId: item.id
                      })
                    }
                  />
                </LandingCarouselSlot>
              ))
            : (
              <p className="min-w-full text-sm text-slate-500">No deals available right now.</p>
            )}
      </DiscoverySectionCarousel>

      </motion.div>
    </>
  );
}

export default HomePage;
