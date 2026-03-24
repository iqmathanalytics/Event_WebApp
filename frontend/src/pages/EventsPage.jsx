import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import EventCard from "../components/EventCard";
import EventFilterBar from "../components/EventFilterBar";
import Pagination from "../components/Pagination";
import { fetchEvents } from "../services/eventService";
import useFavorites from "../hooks/useFavorites";
import useCityFilter from "../hooks/useCityFilter";
import useAuth from "../hooks/useAuth";
import { enableOrganizer } from "../services/userService";
import { refreshAccessToken } from "../services/authService";
import { formatDateUS } from "../utils/format";

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
  const [appliedFilters, setAppliedFilters] = useState({
    ...initialFilters
  });
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [organizerCtaLoading, setOrganizerCtaLoading] = useState(false);
  const [organizerCtaError, setOrganizerCtaError] = useState("");
  const { isFavorite, toggleFavorite } = useFavorites();
  const canOpenOrganizerDashboard = Boolean(Number(user?.organizer_enabled) === 1 && canPostEvents);

  const handlePageChange = (nextPage) => {
    // Guest users can browse only first page. Prompt login/register for deeper pagination.
    if (!isAuthenticated && Number(nextPage) > 1) {
      navigate("/login");
      return;
    }
    setPage(nextPage);
  };
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
        const requestParams = {
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
        };
        const response = await fetchEvents(requestParams);

        if (!active) {
          return;
        }

        let payload = response?.data || {};
        const hasOnlyCityFilter =
          Boolean(appliedFilters.city) &&
          !appliedFilters.query &&
          !appliedFilters.category &&
          !appliedFilters.date &&
          !appliedFilters.time &&
          !appliedFilters.priceMin &&
          !appliedFilters.priceMax;

        if (hasOnlyCityFilter && (!payload.rows || payload.rows.length === 0)) {
          const fallbackResponse = await fetchEvents({
            ...requestParams,
            city: undefined
          });
          payload = fallbackResponse?.data || {};
          setCity("");
          setSelectedCity("");
          setAppliedFilters((prev) => ({
            ...prev,
            city: ""
          }));
        }

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
        <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Events</h1>
        <p className="text-sm text-slate-600">Explore verified city events with smart filters, clear pricing, and real-time availability.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">Create your Event Organizer profile</p>
            <p className="text-sm text-slate-600">
              Become an Event Organizer and submit events for admin approval.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/register"
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Create Account
                </Link>
                <Link
                  to="/login"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Login to Request Organizer Access
                </Link>
              </>
            ) : canOpenOrganizerDashboard ? (
              <Link
                to="/dashboard/organizer"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Open Organizer Dashboard
              </Link>
            ) : (
              <button
                type="button"
                disabled={organizerCtaLoading}
                onClick={async () => {
                  try {
                    setOrganizerCtaError("");
                    setOrganizerCtaLoading(true);
                    await enableOrganizer();
                    let canOpenAfterRefresh = false;
                    const refreshTokenValue = localStorage.getItem("refreshToken");
                    if (refreshTokenValue) {
                      const refreshed = await refreshAccessToken(refreshTokenValue);
                      const payload = refreshed?.data;
                      if (payload?.accessToken && payload?.refreshToken && payload?.user) {
                        login(payload);
                        canOpenAfterRefresh = Boolean(payload.user?.can_post_events);
                      }
                    }
                    if (canOpenAfterRefresh) {
                      navigate("/dashboard/organizer");
                    } else {
                      setOrganizerCtaError("Organizer access request submitted. You can open Organizer Dashboard after admin approval.");
                    }
                  } catch (_err) {
                    setOrganizerCtaError("Could not submit organizer access request. Please try again.");
                  } finally {
                    setOrganizerCtaLoading(false);
                  }
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {organizerCtaLoading ? "Submitting..." : "Request Organizer Access"}
              </button>
            )}
          </div>
        </div>
        {organizerCtaError ? <p className="mt-2 text-sm font-medium text-rose-600">{organizerCtaError}</p> : null}
      </section>

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
                  date: formatDateUS(item.event_date),
                  time: item.event_time ? String(item.event_time).slice(0, 5) : "",
                  price: item.price,
                  image: item.image_url
                }}
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
