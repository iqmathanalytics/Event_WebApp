import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiCalendar, FiClock, FiMapPin, FiUser } from "react-icons/fi";
import { CheckCircle, Clock, Globe, Music, Users } from "lucide-react";
import { fetchEventById, trackEventView } from "../services/eventService";
import { formatCurrency, formatDateUS } from "../utils/format";
import useAuth from "../hooks/useAuth";
import { useRouteContentReady } from "../context/RouteContentReadyContext";
import EventDetailBanner from "../components/EventDetailBanner";

function parseHighlights(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function getEmbedMapUrl(googleMapsLink, venueName, venueAddress) {
  if (!googleMapsLink) {
    return null;
  }
  try {
    const parsed = new URL(googleMapsLink);
    if (parsed.pathname.includes("/maps/embed") || parsed.searchParams.get("output") === "embed") {
      return googleMapsLink;
    }
    const queryText = parsed.searchParams.get("q") || parsed.searchParams.get("query");
    if (queryText) {
      return `https://www.google.com/maps?q=${encodeURIComponent(queryText)}&output=embed`;
    }
  } catch (_err) {
    // fall back below for non-standard URL formats
  }

  const fallback = venueAddress || venueName || googleMapsLink;
  return `https://www.google.com/maps?q=${encodeURIComponent(fallback)}&output=embed`;
}

function EventDetailsPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trackedView, setTrackedView] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadEvent() {
      try {
        setLoading(true);
        setError("");
        const response = await fetchEventById(id);
        if (active) {
          setEvent(response?.data || null);
        }
      } catch (_err) {
        if (active) {
          setEvent(null);
          setError("Could not load this event.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadEvent();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id || trackedView) {
      return;
    }
    // Fire-and-forget analytics. Backend will ignore unapproved events.
    void trackEventView(id).finally(() => setTrackedView(true));
  }, [id, trackedView]);

  useRouteContentReady(loading);

  const pricePerDay = Number(event?.price || 0);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading event details...</p>;
  }

  if (!event || error) {
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-sm text-rose-600">{error || "Event not found."}</p>
        <Link to="/events" className="inline-block text-sm font-semibold text-brand-600">
          Browse Events
        </Link>
      </div>
    );
  }

  const highlights = parseHighlights(event.event_highlights);
  const venueName = event.venue_name || event.venue || "Venue to be announced";
  const mapEmbedUrl = getEmbedMapUrl(event.google_maps_link, venueName, event.venue_address);
  const isGuest = !isAuthenticated;
  const isYayDealEvent =
    event.is_yay_deal_event === 1 ||
    event.is_yay_deal_event === true ||
    String(event.is_yay_deal_event || "") === "1";
  const yayDealGuestLocked = isYayDealEvent && isGuest;
  const fullDescription = event.description || "No event description provided yet.";
  const partialDescription =
    fullDescription.length > 240 ? `${fullDescription.slice(0, 240).trim()}...` : fullDescription;
  const aboutText = yayDealGuestLocked
    ? "Login to unlock full Yay! Deal Event details, highlights, location, and your exclusive discount code."
    : isGuest
      ? partialDescription
      : fullDescription;

  const metaCard =
    "rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/95 to-white p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-4 lg:space-y-6"
    >
      <EventDetailBanner event={event} title={event.title} guestLocked={yayDealGuestLocked} />

      <div className="grid grid-cols-1 gap-4 lg:gap-5">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-soft ring-1 ring-slate-900/[0.04] sm:p-5 lg:rounded-3xl lg:border-slate-200 lg:p-6 lg:shadow-sm lg:ring-0">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 lg:mb-2 lg:text-sm lg:font-normal lg:tracking-normal">
            {event.city_name || "City"}
          </p>
          <h1 className="text-[1.35rem] font-bold leading-[1.2] tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
            {event.title}
          </h1>

          {Array.isArray(event.tags) && event.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5 lg:mt-3 lg:gap-2">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 lg:px-3 lg:py-1 lg:text-[11px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 text-[13px] leading-snug text-slate-700 lg:mt-4 lg:grid-cols-2 lg:gap-3 lg:text-sm lg:text-slate-600">
            <div className={metaCard}>
              <p className="flex items-start gap-2">
                <FiCalendar className="mt-0.5 shrink-0 text-brand-600 lg:text-slate-500" />
                <span>{formatEventScheduleLabel(event)}</span>
              </p>
            </div>
            <div className={metaCard}>
              <p className="flex items-start gap-2">
                <FiClock className="mt-0.5 shrink-0 text-brand-600 lg:text-slate-500" />
                <span>{event.event_time ? String(event.event_time).slice(0, 5) : "Time not specified"}</span>
              </p>
            </div>
            <div className={`col-span-2 ${metaCard} lg:col-span-1`}>
              <p className="flex items-start gap-2">
                <FiMapPin className="mt-0.5 shrink-0 text-brand-600 lg:text-slate-500" />
                <span className="line-clamp-2 lg:line-clamp-none">{venueName}</span>
              </p>
            </div>
            <div className={`col-span-2 ${metaCard} lg:col-span-1`}>
              <p className="flex items-start gap-2">
                <FiUser className="mt-0.5 shrink-0 text-brand-600 lg:text-slate-500" />
                <span className="line-clamp-2 lg:line-clamp-none">{event.organizer_name || "Event Organizer"}</span>
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5 lg:mt-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 lg:text-base lg:font-semibold lg:normal-case lg:tracking-normal lg:text-slate-900">
              About this event
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700 lg:text-sm lg:leading-6">{aboutText}</p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 rounded-2xl border border-slate-200/90 bg-slate-50 p-3 text-[13px] text-slate-700 sm:grid-cols-2 sm:p-4 lg:gap-2 lg:p-4 lg:text-sm">
            <p className="inline-flex items-center gap-2">
              <Clock size={16} className="shrink-0 text-slate-500" />
              {event.duration_hours ? `${event.duration_hours} Hours` : "Duration not specified"}
            </p>
            <p className="inline-flex items-center gap-2">
              <Users size={16} className="shrink-0 text-slate-500" />
              Age Limit - {event.age_limit || "All Ages"}
            </p>
            <p className="inline-flex items-center gap-2">
              <Globe size={16} className="shrink-0 text-slate-500" />
              {event.languages || "Languages not specified"}
            </p>
            <p className="inline-flex items-center gap-2">
              <Music size={16} className="shrink-0 text-slate-500" />
              {event.genres || "Genres not specified"}
            </p>
          </div>

          {isYayDealEvent ? (
            <div className="mt-5 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-amber-50/40 p-4 lg:rounded-2xl lg:p-4">
              <p className="text-sm font-semibold text-slate-900">Yay! Deal Event — discount code</p>
              {isGuest ? (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <span className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-amber-200/80 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-600">
                    Code:
                    <span className="relative inline-flex min-w-[120px] items-center justify-center overflow-hidden rounded bg-slate-200 px-2 py-0.5">
                      <span className="absolute inset-0 bg-slate-300/80 backdrop-blur-md" aria-hidden="true" />
                      <span className="select-none font-bold tracking-[0.2em] text-slate-700 blur-sm">UNLOCK</span>
                    </span>
                  </span>
                  <Link
                    to="/login"
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-600 sm:flex-none sm:rounded-full sm:py-1.5 lg:px-3 lg:text-xs"
                  >
                    Login to Unlock
                  </Link>
                </div>
              ) : event.deal_event_discount_code ? (
                <p className="mt-2 inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  Code: {event.deal_event_discount_code}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-600">No discount code was provided for this event.</p>
              )}
            </div>
          ) : null}

          {!isGuest && highlights.length > 0 ? (
            <div className="mt-5 border-t border-slate-100 pt-5 lg:mt-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 lg:text-base lg:font-semibold lg:normal-case lg:tracking-normal lg:text-slate-900">
                Event Highlights
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {highlights.map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-[13px] text-slate-700 shadow-sm lg:py-2 lg:text-sm"
                  >
                    <CheckCircle size={16} className="shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!isGuest ? (
            <div className="mt-5 border-t border-slate-100 pt-5 lg:mt-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 lg:text-base lg:font-semibold lg:normal-case lg:tracking-normal lg:text-slate-900">
                Location
              </h2>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{venueName}</p>
                {event.venue_address ? <p className="text-[15px] leading-relaxed lg:text-sm">{event.venue_address}</p> : null}
                {!event.venue_address ? (
                  <p className="text-slate-500">Address not provided.</p>
                ) : null}
              </div>

              {mapEmbedUrl ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 lg:rounded-2xl">
                  <iframe
                    title="Event location map"
                    src={mapEmbedUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-52 w-full sm:h-60 md:h-64 lg:h-72"
                    allowFullScreen
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {isGuest ? (
            <div className="mt-5 rounded-2xl border border-slate-200/90 bg-slate-50 p-4 lg:rounded-2xl lg:border-slate-200 lg:bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-900 lg:text-base">View More</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-700 lg:text-sm lg:leading-normal">
                Login or register to view complete event details, highlights, and location information.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Link
                  to="/login"
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 sm:min-h-0 sm:flex-none sm:rounded-xl lg:py-2"
                >
                  Login to View More
                </Link>
                <Link
                  to="/register"
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:min-h-0 sm:flex-none lg:py-2"
                >
                  Register
                </Link>
              </div>
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50 to-white p-4 lg:rounded-2xl lg:border-slate-200 lg:bg-slate-50 lg:from-slate-50 lg:to-slate-50">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Reserve Tickets</p>
                <p className="mt-0.5 text-[13px] leading-snug text-slate-600 lg:text-sm">
                  {isGuest
                    ? "Login or register to continue with ticket reservation."
                    : "Continue to the organizer ticket link to reserve your spot."}
                </p>
              </div>
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 lg:min-h-0 lg:w-auto lg:rounded-full lg:py-2"
                >
                  Reserve Tickets
                </Link>
              ) : event.ticket_link ? (
                <a
                  href={event.ticket_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 lg:min-h-0 lg:w-auto lg:rounded-full lg:py-2"
                >
                  Reserve Tickets
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-[48px] w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-300 px-4 text-sm font-semibold text-slate-600 lg:min-h-0 lg:w-auto lg:rounded-full lg:py-2"
                >
                  Reserve Tickets
                </button>
              )}
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-500 lg:mt-2 lg:text-left lg:text-xs">
              Price from {formatCurrency(pricePerDay)}
            </p>
          </div>

          <Link
            to="/events"
            className="mt-5 flex w-full items-center justify-center rounded-xl border border-dashed border-brand-300/70 bg-brand-50/50 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 lg:mt-5 lg:inline-flex lg:w-auto lg:border-0 lg:bg-transparent lg:py-0 lg:text-brand-600"
          >
            Browse more events
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function formatEventScheduleLabel(event) {
  const toDate = (value) => formatDateUS(String(value || "").slice(0, 10));
  if (event.schedule_type === "range" && event.event_start_date && event.event_end_date) {
    return `${toDate(event.event_start_date)} - ${toDate(event.event_end_date)}`;
  }
  const dates = Array.isArray(event.event_dates) ? event.event_dates : [];
  if (event.schedule_type === "multiple" && dates.length > 1) {
    return `${dates.length} dates available`;
  }
  if (event.schedule_type === "multiple" && dates.length === 1) {
    return toDate(dates[0]);
  }
  return toDate(event?.event_date || "");
}

export default EventDetailsPage;
