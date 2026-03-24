import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiCalendar, FiClock, FiMapPin, FiUser } from "react-icons/fi";
import { CheckCircle, Clock, Globe, Music, Users } from "lucide-react";
import { fetchEventById, trackEventView } from "../services/eventService";
import { formatCurrency, formatDateUS } from "../utils/format";
import useAuth from "../hooks/useAuth";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-6"
    >
      <img
        src={event.image_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1400"}
        alt={event.title}
        className={`aspect-[16/7] w-full rounded-3xl object-cover ${yayDealGuestLocked ? "blur-sm" : ""}`}
      />

      <div className="grid grid-cols-1 gap-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm text-slate-500">{event.city_name || "City"}</p>
          <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{event.title}</h1>

          <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <p className="inline-flex items-center gap-2">
              <FiCalendar className="text-slate-500" />
              {formatEventScheduleLabel(event)}
            </p>
            <p className="inline-flex items-center gap-2">
              <FiClock className="text-slate-500" />
              {event.event_time ? String(event.event_time).slice(0, 5) : "Time not specified"}
            </p>
            <p className="inline-flex items-center gap-2">
              <FiMapPin className="text-slate-500" />
              {venueName}
            </p>
            <p className="inline-flex items-center gap-2">
              <FiUser className="text-slate-500" />
              {event.organizer_name || "Event Organizer"}
            </p>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <h2 className="text-base font-semibold text-slate-900">About this event</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{aboutText}</p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
            <p className="inline-flex items-center gap-2">
              <Clock size={16} className="text-slate-500" />
              {event.duration_hours ? `${event.duration_hours} Hours` : "Duration not specified"}
            </p>
            <p className="inline-flex items-center gap-2">
              <Users size={16} className="text-slate-500" />
              Age Limit - {event.age_limit || "All Ages"}
            </p>
            <p className="inline-flex items-center gap-2">
              <Globe size={16} className="text-slate-500" />
              {event.languages || "Languages not specified"}
            </p>
            <p className="inline-flex items-center gap-2">
              <Music size={16} className="text-slate-500" />
              {event.genres || "Genres not specified"}
            </p>
          </div>

          {isYayDealEvent ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <p className="text-sm font-semibold text-slate-900">Yay! Deal Event — discount code</p>
              {isGuest ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    Code:
                    <span className="relative ml-2 inline-flex min-w-[120px] items-center justify-center overflow-hidden rounded bg-slate-200 px-2 py-0.5">
                      <span className="absolute inset-0 bg-slate-300/80 backdrop-blur-md" aria-hidden="true" />
                      <span className="select-none font-bold tracking-[0.2em] text-slate-700 blur-sm">UNLOCK</span>
                    </span>
                  </span>
                  <Link
                    to="/login"
                    className="inline-flex items-center rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-rose-600"
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
            <div className="mt-5 border-t border-slate-100 pt-5">
              <h2 className="text-base font-semibold text-slate-900">Event Highlights</h2>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {highlights.map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <CheckCircle size={16} className="text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!isGuest ? (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <h2 className="text-base font-semibold text-slate-900">Location</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{venueName}</p>
                {event.venue_address ? <p>{event.venue_address}</p> : null}
                {!event.venue_address ? (
                  <p className="text-slate-500">Address not provided.</p>
                ) : null}
              </div>

              {mapEmbedUrl ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                  <iframe
                    title="Event location map"
                    src={mapEmbedUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-64 w-full md:h-72"
                    allowFullScreen
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {isGuest ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-base font-semibold text-slate-900">View More</h2>
              <p className="mt-2 text-sm text-slate-700">
                Login or register to view complete event details, highlights, and location information.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to="/login"
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Login to View More
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Register
                </Link>
              </div>
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Reserve Tickets</p>
                <p className="text-sm text-slate-600">
                  {isGuest
                    ? "Login or register to continue with ticket reservation."
                    : "Continue to the organizer ticket link to reserve your spot."}
                </p>
              </div>
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Reserve Tickets
                </Link>
              ) : event.ticket_link ? (
                <a
                  href={event.ticket_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Reserve Tickets
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center rounded-full bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Reserve Tickets
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">Price from {formatCurrency(pricePerDay)}</p>
          </div>

          <Link to="/events" className="mt-5 inline-block text-sm font-semibold text-brand-600">
            Browse More Events
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
