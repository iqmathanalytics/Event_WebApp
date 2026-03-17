import { useEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import EventCard from "../components/EventCard";
import InfluencerCard from "../components/InfluencerCard";
import DealCard from "../components/DealCard";
import ServiceCard from "../components/ServiceCard";
import DiscoverySearchBar from "../components/DiscoverySearchBar";
import DiscoverySectionCarousel from "../components/DiscoverySectionCarousel";
import HeroSlideshow from "../components/HeroSlideshow";
import { fetchEvents } from "../services/eventService";
import { deals, influencers, services } from "../utils/mockData";
import useFavorites from "../hooks/useFavorites";
import useCityFilter from "../hooks/useCityFilter";
import { formatDateUS } from "../utils/format";

function HomePage() {
  const { setHomeSearchSummary, setIsHeroSearchVisible } = useOutletContext();
  const { selectedCity, selectedCityLabel } = useCityFilter();
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [isSearchDocked, setIsSearchDocked] = useState(false);
  const heroSearchRef = useRef(null);
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    let active = true;

    async function loadTrendingEvents() {
      try {
        setLoadingEvents(true);
        const response = await fetchEvents({
          city: selectedCity || undefined,
          sort: "newest",
          page: 1,
          limit: 6
        });
        if (active) {
          let rows = response?.data?.rows || [];
          if (selectedCity && rows.length === 0) {
            const fallback = await fetchEvents({
              sort: "newest",
              page: 1,
              limit: 6
            });
            rows = fallback?.data?.rows || [];
          }
          setTrendingEvents(rows);
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
  const filteredInfluencers = selectedCity
    ? influencers.filter((item) => item.city === selectedCityLabel)
    : influencers;
  const filteredDeals = selectedCity ? deals.filter((item) => item.city === selectedCityLabel) : deals;
  const filteredServices = selectedCity
    ? services.filter((item) => item.city === selectedCityLabel)
    : services;

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
            <p className="mb-1 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
              City Events & Lifestyle Hub
            </p>
            <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Discover events, deals, creators, and services around you.
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
          ? Array.from({ length: 4 }).map((_, idx) => (
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
                  isFavorite={isFavorite("event", item.id)}
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
        {filteredInfluencers.map((item) => (
          <div key={item.id} className="min-w-[260px] max-w-[260px] snap-start">
            <InfluencerCard item={item} />
          </div>
        ))}
      </DiscoverySectionCarousel>

      <DiscoverySectionCarousel title={`Top Deals ${citySuffix}`} actionHref="/deals">
        {filteredDeals.map((item) => (
          <div key={item.id} className="min-w-[260px] max-w-[260px] snap-start">
            <DealCard item={item} />
          </div>
        ))}
      </DiscoverySectionCarousel>

      <DiscoverySectionCarousel title={`Beauty Services ${citySuffix}`} actionHref="/services">
        {filteredServices.map((item) => (
          <div key={item.id} className="min-w-[260px] max-w-[260px] snap-start">
            <ServiceCard item={item} />
          </div>
        ))}
      </DiscoverySectionCarousel>
    </div>
  );
}

export default HomePage;
