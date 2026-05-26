import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import EventCard from "../components/EventCard";
import EventFilterBar from "../components/EventFilterBar";
import Pagination from "../components/Pagination";
import { LISTING_PAGE_SIZE } from "../constants/listingPagination";
import { fetchEvents } from "../services/eventService";
import useFavorites from "../hooks/useFavorites";
import useCityFilter from "../hooks/useCityFilter";
import useAuth from "../hooks/useAuth";
import { enableOrganizer } from "../services/userService";
import { refreshAccessToken } from "../services/authService";
import { formatDateUS } from "../utils/format";
import { useRouteContentReady } from "../context/RouteContentReadyContext";
import { FiAlertCircle, FiCheckCircle, FiClock, FiInfo } from "react-icons/fi";
import { CalendarDays, MousePointerClick, Sparkles, Ticket } from "lucide-react";

function OrganizerReadyRibbon() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative mt-3 flex gap-3 overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/95 via-white to-teal-50/50 px-3 py-3 sm:items-start sm:gap-3.5 sm:px-4"
    >
      <div className="pointer-events-none absolute -right-6 top-0 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
      <motion.span
        className="relative mt-0.5 grid h-10 w-10 shrink-0 place-content-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <FiCheckCircle className="h-6 w-6" aria-hidden />
      </motion.span>
      <div className="relative min-w-0">
        <p className="text-sm font-semibold text-slate-900">Host tools on — you&apos;re cleared to list</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Publish or edit events from My Hub. New listings still get a quick review before they go live to the city.
        </p>
      </div>
    </motion.div>
  );
}

function OrganizerInviteCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative mt-3 flex gap-3 overflow-hidden rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 px-3 py-3 sm:items-start sm:gap-3.5 sm:px-4"
    >
      <motion.span
        className="mt-0.5 grid h-9 w-9 shrink-0 place-content-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <CalendarDays className="h-5 w-5" aria-hidden />
      </motion.span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">Blank calendar — your move</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Request organizer access once. After approval, you&apos;ll list dates, tickets, and details straight from My Hub.
        </p>
        <p className="mt-2 text-xs font-medium text-emerald-800/80">Tip: use &quot;Request Organizer Access&quot; above when you&apos;re ready.</p>
      </div>
    </motion.div>
  );
}

function OrganizerPendingRibbon() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative mt-3 flex gap-3 overflow-hidden rounded-xl border border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-white to-amber-50/40 px-3 py-3 sm:items-start sm:gap-3.5 sm:px-4"
    >
      <motion.span
        className="relative mt-0.5 grid h-10 w-10 shrink-0 place-content-center rounded-xl bg-white text-sky-600 shadow-sm ring-1 ring-sky-100"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <FiClock className="h-6 w-6" aria-hidden />
      </motion.span>
      <div className="relative min-w-0">
        <p className="text-sm font-semibold text-slate-900">Almost there — publishing unlocks soon</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Your host profile is active; we&apos;re finishing the last check so you can post events. Watch My Hub for updates.
        </p>
        <Link
          to={{ pathname: "/dashboard/user", hash: "host-events" }}
          className="mt-2 inline-flex text-sm font-semibold text-sky-700 underline-offset-2 hover:text-sky-800 hover:underline"
        >
          Open My Hub — Events
        </Link>
      </div>
    </motion.div>
  );
}

function EventsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, canPostEvents, login } = useAuth();
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
  const [debouncedQuery, setDebouncedQuery] = useState(initialFilters.query);
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [organizerCtaLoading, setOrganizerCtaLoading] = useState(false);
  const [organizerCtaError, setOrganizerCtaError] = useState("");
  const { isFavorite, toggleFavorite } = useFavorites();
  useRouteContentReady(loading);
  const organizerEnabled = Number(user?.organizer_enabled) === 1;
  const canOpenOrganizerDashboard = Boolean(organizerEnabled && canPostEvents);

  const handlePageChange = (nextPage) => {
    // Guest users can browse only first page. Prompt login/register for deeper pagination.
    if (!isAuthenticated && Number(nextPage) > 1) {
      navigate("/login");
      return;
    }
    setPage(nextPage);
  };
  const setCityWithGlobal = (value) => {
    setCity(value);
    setSelectedCity(value);
  };

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query), 350);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, city, category]);

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
          sort: sortBy || "popularity",
          page,
          limit: LISTING_PAGE_SIZE
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

        setEvents(payload.rows || []);
        setTotalPages(Math.max(1, Math.ceil((payload.total || 0) / (payload.limit || LISTING_PAGE_SIZE))));
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
  }, [debouncedQuery, city, category, sortBy, page, setSelectedCity]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Events</h1>
        <p className="text-sm text-slate-600">Explore verified city events with smart filters, clear pricing, and real-time availability.</p>
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
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      <div className="listing-cards-grid">
        {loading
          ? Array.from({ length: LISTING_PAGE_SIZE }).map((_, idx) => (
              <div
                key={`events-skeleton-${idx}`}
                className="h-[280px] animate-pulse rounded-3xl border border-slate-200 bg-white"
              />
            ))
          : null}
        {!loading && events.length === 0 ? (
          <p className="col-span-full text-sm text-slate-500">No events match your current filters.</p>
        ) : null}
        {!loading
          ? events.map((item) => (
              <EventCard
                key={item.id}
                item={{
                  id: item.id,
                  public_slug: item.public_slug,
                  title: item.title,
                  category: item.category_name || "General",
                  city: item.city_name || "City",
                  event_date: item.event_date,
                  event_time: item.event_time,
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
      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
    </motion.div>
  );
}

export default EventsPage;
