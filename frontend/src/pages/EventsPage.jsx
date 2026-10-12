import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import EventCard from "../components/EventCard";
import EventFilterBar from "../components/EventFilterBar";
import ListingEmptyState from "../components/ListingEmptyState";
import { fetchEvents } from "../services/eventService";
import useFavorites from "../hooks/useFavorites";
import useCityFilter from "../hooks/useCityFilter";
import { formatDateUS } from "../utils/format";
import { getEventSortDate } from "../utils/eventSchedule";
import { sortEventsByDate } from "../utils/eventPopularity";
import { sortEventsWithHomeFeaturedFirst } from "../utils/eventHomeFeatured";
import { useRouteContentReady } from "../context/RouteContentReadyContext";

/** Single-page events feed — API allows up to 100 per request. */
const EVENTS_FEED_LIMIT = 100;
const EVENTS_SKELETON_COUNT = 9;

function EventsPage() {
  const [searchParams] = useSearchParams();
  const { selectedCity, setSelectedCity } = useCityFilter();
  const initialFilters = {
    query: searchParams.get("q") || "",
    city: selectedCity || searchParams.get("city") || "",
    category: searchParams.get("category") || "",
    date: searchParams.get("date") || "",
    time: searchParams.get("time") || "",
    priceMin: searchParams.get("price_min") || "",
    priceMax: searchParams.get("price_max") || ""
  };
  const [query, setQuery] = useState(initialFilters.query);
  const [city, setCity] = useState(initialFilters.city);
  const [category, setCategory] = useState(initialFilters.category);
  const [date, setDate] = useState(initialFilters.date);
  const [priceMin, setPriceMin] = useState(initialFilters.priceMin);
  const [priceMax, setPriceMax] = useState(initialFilters.priceMax);
  const [debouncedQuery, setDebouncedQuery] = useState(initialFilters.query);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isFavorite, toggleFavorite } = useFavorites();
  useRouteContentReady(loading);

  const setCityWithGlobal = (value) => {
    setCity(value);
    setSelectedCity(value);
  };

  const clearFilters = () => {
    setQuery("");
    setDebouncedQuery("");
    setCategory("");
    setDate("");
    setPriceMin("");
    setPriceMax("");
  };

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query), 350);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    setCity(selectedCity || "");
  }, [selectedCity]);

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      try {
        setLoading(true);
        const requestParams = {
          q: debouncedQuery || undefined,
          city: city || undefined,
          category: category || undefined,
          sort: "event_date",
          page: 1,
          limit: EVENTS_FEED_LIMIT
        };
        const response = await fetchEvents(requestParams);

        if (!active) {
          return;
        }

        let payload = response?.data || {};
        const hasOnlyCityFilter = Boolean(city) && !debouncedQuery && !category;

        if (hasOnlyCityFilter && (!payload.rows || payload.rows.length === 0)) {
          const fallbackResponse = await fetchEvents({
            ...requestParams,
            city: undefined
          });
          payload = fallbackResponse?.data || {};
          setCity("");
          setSelectedCity("");
        }

        const rows = payload.rows || [];
        setEvents(sortEventsWithHomeFeaturedFirst(sortEventsByDate(rows, "asc")));
      } catch (_error) {
        if (active) {
          setEvents([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadEvents();
    return () => {
      active = false;
    };
  }, [debouncedQuery, city, category, setSelectedCity]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 lg:space-y-6">
      <div className="space-y-1.5 lg:space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">Events</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
          Explore verified city events with smart filters, clear pricing, and real-time availability.
        </p>
      </div>

      <EventFilterBar
        compact
        query={query}
        setQuery={setQuery}
        city={city}
        setCity={setCityWithGlobal}
        category={category}
        setCategory={setCategory}
        date={date}
        setDate={setDate}
        priceMin={priceMin}
        setPriceMin={setPriceMin}
        priceMax={priceMax}
        setPriceMax={setPriceMax}
        showSort={false}
      />

      <div className="listing-cards-grid">
        {loading
          ? Array.from({ length: EVENTS_SKELETON_COUNT }).map((_, idx) => (
              <div
                key={`events-skeleton-${idx}`}
                className="h-[280px] animate-pulse rounded-3xl border border-slate-200 bg-white"
              />
            ))
          : null}
        {!loading && events.length === 0 ? (
          <ListingEmptyState message="No events match your current filters." actionLabel="Clear filters" onAction={clearFilters} />
        ) : null}
        {!loading
          ? events.map((item, idx) => (
              <EventCard
                key={item.id}
                priority={idx === 0}
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
                tags={item.tags || []}
                isFavorite={isFavorite("event", item.id)}
                onToggleFavorite={() =>
                  toggleFavorite({
                    listingType: "event",
                    listingId: item.id
                  })
                }
              />
            ))
          : null}
      </div>
    </motion.div>
  );
}

export default EventsPage;
