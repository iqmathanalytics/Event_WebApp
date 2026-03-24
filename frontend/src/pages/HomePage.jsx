import { useEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import EventCard from "../components/EventCard";
import InfluencerCard from "../components/InfluencerCard";
import DealCard from "../components/DealCard";
import DiscoverySearchBar from "../components/DiscoverySearchBar";
import DiscoverySectionCarousel from "../components/DiscoverySectionCarousel";
import HeroSlideshow from "../components/HeroSlideshow";
import BrandHeroLogo from "../components/BrandHeroLogo";
import { fetchFeaturedEvents } from "../services/eventService";
import { fetchDeals, fetchInfluencers } from "../services/listingService";
import useFavorites from "../hooks/useFavorites";
import useCityFilter from "../hooks/useCityFilter";
import useAuth from "../hooks/useAuth";
import { formatDateUS } from "../utils/format";
import { pickHomeCarouselSix } from "../utils/homeCarouselCuration";

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
  const { setHomeSearchSummary, setIsHeroSearchVisible } = useOutletContext();
  const { selectedCity, selectedCityLabel } = useCityFilter();
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [liveInfluencers, setLiveInfluencers] = useState([]);
  const [liveDeals, setLiveDeals] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingInfluencers, setLoadingInfluencers] = useState(false);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [isSearchDocked, setIsSearchDocked] = useState(false);
  const heroSearchRef = useRef(null);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let active = true;

    async function loadTrendingEvents() {
      try {
        setLoadingEvents(true);
        const response = await fetchFeaturedEvents({
          city: selectedCity || undefined,
          limit: 60
        });
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
        }
      } catch (_err) {
        if (active) {
          setTrendingEvents([]);
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
        const [influencerResponse, dealsResponse] = await Promise.all([
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
        if (!active) {
          return;
        }
        setLiveInfluencers((influencerResponse?.data || []).slice(0, 12));
        const dealPool = (dealsResponse?.data || []).slice(0, 120);
        const curatedDeals = pickHomeCarouselSix(dealPool, { isPremium: isPremiumDealRow });
        setLiveDeals(curatedDeals);
      } catch (_err) {
        if (active) {
          setLiveInfluencers([]);
          setLiveDeals([]);
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

  useEffect(() => {
    const node = heroSearchRef.current;
    if (!node) {
      return undefined;
    }

    const headerOffset = 110;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const visible = entry.isIntersecting;
        setIsHeroSearchVisible(visible);
        setIsSearchDocked(!visible);
      },
      {
        root: null,
        threshold: 0.05,
        rootMargin: `-${headerOffset}px 0px 0px 0px`
      }
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      setIsHeroSearchVisible(true);
      setIsSearchDocked(false);
    };
  }, [setIsHeroSearchVisible]);

  return (
    <div className="space-y-10 pb-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 px-5 py-8 text-white sm:px-10 sm:py-10"
      >
        <div className="grid grid-cols-1 items-center gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
          <div className="space-y-6">
            <BrandHeroLogo className="hero-brand-logo-mobile-only" />
            <h1 className="max-w-2xl text-2xl font-bold leading-tight sm:text-4xl lg:text-6xl">
              Discover events, deals, and creators around you.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-200 sm:text-base">
              Explore trusted local experiences with one unified platform built for city life.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/events" className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold">
                Explore Events
              </Link>
              <Link to="/deals" className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold">
                Explore Deals
              </Link>
            </div>
          </div>
          <HeroSlideshow />
        </div>
        <motion.div
          id="home-hero-search-anchor"
          ref={heroSearchRef}
          className="relative z-40 mt-6"
          animate={{
            scale: isSearchDocked ? 0.92 : 1,
            y: isSearchDocked ? -14 : 0
          }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "center top", willChange: "transform" }}
        >
          <DiscoverySearchBar onCriteriaChange={setHomeSearchSummary} />
        </motion.div>
      </motion.section>

      <DiscoverySectionCarousel title={`Trending Events ${citySuffix}`} actionHref="/events">
        {loadingEvents
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={`event-skeleton-${idx}`}
                className="h-[290px] min-w-[260px] animate-pulse rounded-3xl border border-slate-200 bg-white"
              />
            ))
          : trendingEvents.map((item) => (
              <div key={item.id} className="min-w-[260px] max-w-[260px] snap-start">
                <EventCard
                  item={{
                    id: item.id,
                    title: item.title,
                    category: item.category_name || "General",
                    city: item.city_name || "City",
                    date: formatDateUS(item.event_date),
                    time: item.event_time ? String(item.event_time).slice(0, 5) : "",
                    price: item.price,
                    image: item.image_url
                  }}
                  isYayDealEvent={
                    item.is_yay_deal_event === 1 ||
                    item.is_yay_deal_event === true ||
                    String(item.is_yay_deal_event || "") === "1"
                  }
                  showPremiumBadge={isAuthenticated}
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

      <DiscoverySectionCarousel title={`Popular Influencers ${citySuffix}`} actionHref="/influencers">
        {loadingInfluencers
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={`influencer-skeleton-${idx}`}
                className="h-[290px] min-w-[260px] animate-pulse rounded-3xl border border-slate-200 bg-white"
              />
            ))
          : liveInfluencers.length > 0
            ? liveInfluencers.map((item) => (
                <div key={item.id} className="min-w-[260px] max-w-[260px] snap-start">
                  <InfluencerCard
                    item={{
                      id: item.id,
                      name: item.name,
                      category: item.category_name || "Lifestyle",
                      city: item.city_name || "City",
                      followers: item.followers_count || 0,
                      image: item.profile_image_url
                    }}
                  />
                </div>
              ))
            : (
              <p className="min-w-[260px] text-sm text-slate-500">No influencers available right now.</p>
            )}
      </DiscoverySectionCarousel>

      <DiscoverySectionCarousel title={`Top Deals ${citySuffix}`} actionHref="/deals">
        {loadingDeals
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={`deal-skeleton-${idx}`}
                className="h-[290px] min-w-[260px] animate-pulse rounded-3xl border border-slate-200 bg-white"
              />
            ))
          : liveDeals.length > 0
            ? liveDeals.map((item) => (
                <div key={item.id} className="min-w-[260px] max-w-[260px] snap-start">
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
                      offerType: item.offer_type,
                      offerMetaJson: item.offer_meta_json
                    }}
                    tags={item.tags || []}
                    isPremium={item.is_premium === 1 || item.is_premium === true}
                    showPremiumBadge={isAuthenticated}
                  />
                </div>
              ))
            : (
              <p className="min-w-[260px] text-sm text-slate-500">No deals available right now.</p>
            )}
      </DiscoverySectionCarousel>

    </div>
  );
}

export default HomePage;
