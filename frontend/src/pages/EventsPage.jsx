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
  const [appliedFilters, setAppliedFilters] = useState({
    ...initialFilters
  });
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

      <section className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-amber-50/20 to-sky-50/25 p-4 shadow-soft ring-1 ring-amber-500/[0.07] sm:p-5">
        <div className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-gradient-to-br from-amber-400/25 to-sky-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-orange-400/15 blur-3xl" />

        {!isAuthenticated ? (
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <div className="min-w-0 flex-1">
              <motion.p
                className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-900/85"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
              >
                <motion.span
                  className="inline-flex text-amber-600"
                  animate={{ rotate: [0, -12, 10, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden
                >
                  <Sparkles className="h-4 w-4" />
                </motion.span>
                Hosts &amp; happenings
              </motion.p>
              <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                Put your event where the city looks first
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">
                Create a free account, request host tools once, then publish experiences from My Hub — we keep listings trustworthy.
              </p>
              <ul className="mt-3 flex flex-col gap-1.5 text-xs font-medium text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-1">
                <li className="inline-flex items-center gap-1.5">
                  <motion.span
                    className="text-amber-600"
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden
                  >
                    <MousePointerClick className="h-4 w-4" />
                  </motion.span>
                  Sign up — tickets, tweaks, one dashboard
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
                  Nights out, workshops, family days
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Ticket className="h-4 w-4 shrink-0 text-orange-600" aria-hidden />
                  Yay! Tickets — checkout-ready when you&apos;re approved
                </li>
              </ul>
            </div>
            <div className="relative flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:flex-col xl:flex-row">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/register"
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition hover:from-amber-400 hover:to-sky-500 sm:min-h-0 sm:w-auto"
                >
                  Host on Yay! — join free
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/login"
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl border-2 border-slate-200 bg-white/90 px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-amber-300 hover:bg-white sm:min-h-0 sm:w-auto"
                >
                  Have an account? Sign in to host
                </Link>
              </motion.div>
            </div>
          </div>
        ) : (
          <>
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">List your own experiences</p>
                <p className="text-sm text-slate-600">
                  Host gatherings on Yay! Tickets — submit details for review, then welcome guests from your hub.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canOpenOrganizerDashboard ? (
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link
                      to={{ pathname: "/dashboard/user", hash: "host-events" }}
                      className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
                    >
                      Go to My Hub — Events
                    </Link>
                  </motion.div>
                ) : organizerEnabled && !canPostEvents ? (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      to={{ pathname: "/dashboard/user", hash: "host-events" }}
                      className="inline-flex rounded-xl border-2 border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-300 hover:bg-sky-50/80"
                    >
                      Open My Hub
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
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
                            navigate({ pathname: "/dashboard/user", hash: "host-events" });
                          } else {
                            setOrganizerCtaError(
                              "We’ve received your request. You’ll be able to list events from My Hub after approval."
                            );
                          }
                        } catch (_err) {
                          setOrganizerCtaError("Could not submit organizer access request. Please try again.");
                        } finally {
                          setOrganizerCtaLoading(false);
                        }
                      }}
                      className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {organizerCtaLoading ? "Submitting..." : "Request Organizer Access"}
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
            {canOpenOrganizerDashboard ? <OrganizerReadyRibbon /> : null}
            {isAuthenticated && !organizerEnabled && !organizerCtaError ? <OrganizerInviteCard /> : null}
            {isAuthenticated && organizerEnabled && !canPostEvents ? <OrganizerPendingRibbon /> : null}
            {organizerCtaError ? (
              organizerCtaError.toLowerCase().includes("could not") ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex gap-3 rounded-xl border border-rose-200/80 bg-rose-50/90 px-3 py-3 text-sm text-rose-900 sm:px-4"
                >
                  <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
                  <span className="leading-relaxed">{organizerCtaError}</span>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 flex gap-3 rounded-xl border border-sky-200/70 bg-gradient-to-br from-sky-50/90 to-white px-3 py-3 text-sm leading-relaxed text-slate-700 sm:px-4"
                >
                  <FiInfo className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden />
                  <span>{organizerCtaError}</span>
                </motion.div>
              )
            ) : null}
          </>
        )}
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
