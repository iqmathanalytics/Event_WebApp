import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import EventCard from "../components/EventCard";
import EventFilterBar from "../components/EventFilterBar";
import Pagination from "../components/Pagination";
import { fetchEvents } from "../services/eventService";
import useFavorites from "../hooks/useFavorites";
import useCityFilter from "../hooks/useCityFilter";

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
    priceMax: searchParams.get("price_max") || "",
    sortBy: searchParams.get("sort") || "popularity"
  };
  const [query, setQuery] = useState(initialFilters.query);
  const [city, setCity] = useState(initialFilters.city);
  const [category, setCategory] = useState(initialFilters.category);
  const [date, setDate] = useState(initialFilters.date);
  const [time, setTime] = useState(initialFilters.time);
  const [priceMin, setPriceMin] = useState(initialFilters.priceMin);
  const [priceMax, setPriceMax] = useState(initialFilters.priceMax);
  const [sortBy, setSortBy] = useState(initialFilters.sortBy);
  const [appliedFilters, setAppliedFilters] = useState({
    ...initialFilters
  });
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const canApply =
    query !== appliedFilters.query ||
    city !== appliedFilters.city ||
    category !== appliedFilters.category ||
    date !== appliedFilters.date ||
    time !== appliedFilters.time ||
    priceMin !== appliedFilters.priceMin ||
    priceMax !== appliedFilters.priceMax ||
    sortBy !== appliedFilters.sortBy;

  const applyFilters = () => {
    setAppliedFilters({
      query,
      city,
      category,
      date,
      time,
      priceMin,
      priceMax,
      sortBy
    });
    setPage(1);
  };

  const setCityWithGlobal = (value) => {
    setCity(value);
    setSelectedCity(value);
  };

  const resetFilters = () => {
    setQuery("");
    setCityWithGlobal("");
    setCategory("");
    setDate("");
    setTime("");
    setPriceMin("");
    setPriceMax("");
    setSortBy("popularity");
    setAppliedFilters({
      query: "",
      city: "",
      category: "",
      date: "",
      time: "",
      priceMin: "",
      priceMax: "",
      sortBy: "popularity"
    });
    setPage(1);
  };

  useEffect(() => {
    setCity(selectedCity || "");
    setAppliedFilters((prev) => ({
      ...prev,
      city: selectedCity || ""
    }));
    setPage(1);
  }, [selectedCity]);

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      try {
        setLoading(true);
        const response = await fetchEvents({
          q: appliedFilters.query || undefined,
          city: appliedFilters.city || undefined,
          category: appliedFilters.category || undefined,
          date: appliedFilters.date || undefined,
          time: appliedFilters.time || undefined,
          price_min: appliedFilters.priceMin || undefined,
          price_max: appliedFilters.priceMax || undefined,
          sort: appliedFilters.sortBy,
          page,
          limit: 6
        });

        if (!active) {
          return;
        }

        const payload = response?.data || {};
        setEvents(payload.rows || []);
        setTotalPages(Math.max(1, Math.ceil((payload.total || 0) / (payload.limit || 6))));
      } catch (_err) {
        if (active) {
          setEvents([]);
          setTotalPages(1);
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
  }, [appliedFilters, page]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold sm:text-4xl">Events</h1>
        <p className="text-sm text-slate-600">Explore verified city events with smart filters, clear pricing, and real-time availability.</p>
      </div>

      <EventFilterBar
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
        sortBy={sortBy}
        setSortBy={setSortBy}
        onApply={applyFilters}
        onReset={resetFilters}
        canApply={canApply}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={`events-skeleton-${idx}`}
                className="h-[320px] animate-pulse rounded-3xl border border-slate-200 bg-white"
              />
            ))
          : null}
        {!loading && events.length === 0 ? <p className="text-sm text-slate-500">No events match your current filters.</p> : null}
        {!loading
          ? events.map((item) => (
              <EventCard
                key={item.id}
                item={{
                  id: item.id,
                  title: item.title,
                  category: item.category_name || "General",
                  city: item.city_name || "City",
                  date: item.event_date,
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
            ))
          : null}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </motion.div>
  );
}

export default EventsPage;
