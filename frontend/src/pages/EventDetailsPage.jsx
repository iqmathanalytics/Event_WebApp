import { Link, useParams } from "react-router-dom";
import { absoluteListingUrl, eventDetailPath } from "../utils/listingPaths";
import ShareListingButton from "../components/ShareListingButton";
import ListingFavoriteButton from "../components/ListingFavoriteButton";
import { useCanonicalListingUrl } from "../utils/useCanonicalListingUrl";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiCalendar, FiClock, FiMapPin, FiUser, FiYoutube } from "react-icons/fi";
import { CheckCircle, Clock, Globe, Mic, Users } from "lucide-react";
import { fetchEventById, trackEventView } from "../services/eventService";
import { trackEventPageView } from "../utils/googleAnalytics";
import { formatCurrency, formatDateUS, formatEventDuration, formatTime12Hour } from "../utils/format";
import { normalizeEventTicketSalesMode } from "../utils/eventTicketSalesMode";
import useAuth from "../hooks/useAuth";
import useCityFilter from "../hooks/useCityFilter";
import { useRouteContentReady } from "../context/RouteContentReadyContext";
import EventDetailBanner from "../components/EventDetailBanner";
import GuestPromoVideoCard from "../components/GuestPromoVideoCard";
import EventTicketCheckoutPanel from "../components/EventTicketCheckoutPanel";
import EventAirbnbBookingShell from "../components/EventAirbnbBookingShell";
import { EXCLUSIVE_DEAL_EVENT_LABEL } from "../constants/brand";
import { parsePromoVideoUrls } from "../utils/youtubeVideo";

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
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const { selectedCity } = useCityFilter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trackedView, setTrackedView] = useState(false);

  useCanonicalListingUrl(event, eventDetailPath);

  useEffect(() => {
    let active = true;

    async function loadEvent() {
      try {
        setLoading(true);
        setError("");
        const response = await fetchEventById(slug);
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
  }, [slug]);

  useEffect(() => {
    if (!event?.id || trackedView) {
      return;
    }
    trackEventPageView({
      eventId: event.id,
      eventTitle: event.title,
      ticketMode: event.ticket_sales_mode
    });
    trackEventView(event.public_slug || event.id).catch(() => {});
    setTrackedView(true);
  }, [event?.id, event?.title, event?.ticket_sales_mode, trackedView]);

  useEffect(() => {
    if (!event?.title) {
      return undefined;
    }
    const previousTitle = document.title;
    document.title = `${event.title} | Book My Tickets`;
    return () => {
      document.title = previousTitle;
    };
  }, [event?.title]);

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
  const ticketSalesMode = normalizeEventTicketSalesMode(event.ticket_sales_mode);
  const fullDescription = event.description || "No event description provided yet.";
  const partialDescription =
    fullDescription.length > 240 ? `${fullDescription.slice(0, 240).trim()}...` : fullDescription;
  const aboutText = yayDealGuestLocked
    ? `Login to unlock full ${EXCLUSIVE_DEAL_EVENT_LABEL.toLowerCase()} details, highlights, location, and your exclusive discount code.`
    : isGuest
      ? partialDescription
      : fullDescription;

  const metaCard =
    "rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/95 to-white p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none";
  const metaValue = "font-semibold text-slate-900";
  const durationText = formatEventDuration(event.duration_hours, event.duration_minutes);
  const promoVideos = parsePromoVideoUrls(event.promo_video_urls);
  const hasPromoVideos = promoVideos.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-4 lg:space-y-6"
    >
      <EventDetailBanner
        event={event}
        title={event.title}
        guestLocked={yayDealGuestLocked}
        promoVideos={promoVideos}
        videoGuestLocked={isGuest && hasPromoVideos}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] lg:items-start lg:gap-8">
        <div className="relative rounded-2xl border border-slate-200/90 bg-white p-4 shadow-soft ring-1 ring-slate-900/[0.04] sm:p-5 lg:rounded-3xl lg:border-slate-200 lg:p-6 lg:shadow-sm lg:ring-0">
          <ListingFavoriteButton
            listingType="event"
            listingId={event.id}
            className="right-[5.5rem] sm:right-[6.25rem] lg:right-[7rem]"
          />
          <ShareListingButton
            url={absoluteListingUrl(eventDetailPath(event))}
            title={event.title}
            listingType="event"
          />
          <p className="mb-1 pr-24 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:pr-28 lg:mb-2 lg:pr-32 lg:text-sm lg:font-normal lg:tracking-normal">
            {event.city_name || "City"}
          </p>
          <h1 className="pr-4 text-[1.35rem] font-bold leading-[1.2] tracking-tight text-slate-900 sm:pr-6 sm:text-2xl lg:pr-8 lg:text-3xl">
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

          <div className="mt-4 grid grid-cols-2 gap-2 text-[13px] leading-snug lg:mt-4 lg:grid-cols-2 lg:gap-3 lg:text-sm">
            <div className={metaCard}>
              <p className="flex items-start gap-2 text-slate-600">
                <FiCalendar className="mt-0.5 shrink-0 text-brand-600 lg:text-slate-500" />
                <span className={metaValue}>{formatEventScheduleLabel(event)}</span>
              </p>
            </div>
            <div className={metaCard}>
              <p className="flex items-start gap-2 text-slate-600">
                <FiClock className="mt-0.5 shrink-0 text-brand-600 lg:text-slate-500" />
                <span className={metaValue}>{formatTime12Hour(event.event_time)}</span>
              </p>
            </div>
            <div className={`col-span-2 ${metaCard} lg:col-span-1`}>
              <p className="flex items-start gap-2 text-slate-600">
                <FiMapPin className="mt-0.5 shrink-0 text-brand-600 lg:text-slate-500" />
                <span className={`line-clamp-2 lg:line-clamp-none ${metaValue}`}>
                  <span>{venueName}</span>
                  {event.venue_address ? (
                    <span className="mt-0.5 block text-xs font-medium text-slate-500">{event.venue_address}</span>
                  ) : null}
                </span>
              </p>
            </div>
            <div className={`col-span-2 ${metaCard} lg:col-span-1`}>
              <p className="flex items-start gap-2 text-slate-600">
                <FiUser className="mt-0.5 shrink-0 text-brand-600 lg:text-slate-500" />
                <span className={`line-clamp-2 lg:line-clamp-none ${metaValue}`}>
                  {event.organizer_name || "Event Organizer"}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5 lg:mt-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 lg:text-base lg:font-semibold lg:normal-case lg:tracking-normal lg:text-slate-900">
              About this event
            </h2>
            <p className="mt-2 text-[15px] font-medium leading-relaxed text-slate-800 lg:text-sm lg:leading-6">{aboutText}</p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2.5 rounded-2xl border border-slate-200/90 bg-slate-50 p-3 sm:grid-cols-2 sm:p-4 lg:gap-3 lg:p-4">
            <p className="inline-flex items-center gap-2 text-[13px] text-slate-600 lg:text-sm">
              <Clock size={16} className="shrink-0 text-slate-500" />
              <span>
                <span className="font-bold text-slate-900">Duration · </span>
                <span className="font-semibold text-slate-900">{durationText || "Not specified"}</span>
              </span>
            </p>
            <p className="inline-flex items-center gap-2 text-[13px] text-slate-600 lg:text-sm">
              <Users size={16} className="shrink-0 text-slate-500" />
              <span>
                <span className="font-bold text-slate-900">Age · </span>
                <span className="font-semibold text-slate-900">{event.age_limit || "All Ages"}</span>
              </span>
            </p>
            <p className="inline-flex items-center gap-2 text-[13px] text-slate-600 lg:text-sm">
              <Globe size={16} className="shrink-0 text-slate-500" />
              <span>
                <span className="font-bold text-slate-900">Languages · </span>
                <span className="font-semibold text-slate-900">{event.languages || "Not specified"}</span>
              </span>
            </p>
            <p className="inline-flex items-center gap-2 text-[13px] text-slate-600 lg:text-sm">
              <Mic size={16} className="shrink-0 text-slate-500" />
              <span>
                <span className="font-bold text-slate-900">Genres · </span>
                <span className="font-semibold text-slate-900">{event.genres || "Not specified"}</span>
              </span>
            </p>
          </div>

          {isYayDealEvent ? (
            <div className="mt-5 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-amber-50/40 p-4 lg:rounded-2xl lg:p-4">
              <p className="text-sm font-semibold text-slate-900">{EXCLUSIVE_DEAL_EVENT_LABEL} — discount code</p>
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

          {!isGuest && hasPromoVideos ? (
            <div className="mt-5 border-t border-slate-100 pt-5 lg:mt-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 lg:text-base lg:font-semibold lg:normal-case lg:tracking-normal lg:text-slate-900">
                Promo Video{promoVideos.length === 1 ? "" : "s"}
              </h2>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {promoVideos.map((watchUrl, index) => (
                  <a
                    key={watchUrl}
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex min-h-[44px] flex-1 items-center gap-3 rounded-xl border border-slate-200/90 bg-gradient-to-r from-white to-slate-50/80 px-4 py-3 text-left shadow-sm transition hover:border-rose-200/90 hover:from-rose-50/40 hover:to-white hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 sm:min-w-[220px] sm:flex-none lg:min-h-0 lg:py-2.5"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-content-center rounded-lg bg-red-600 text-white shadow-sm ring-1 ring-red-700/20 transition group-hover:bg-red-700">
                      <FiYoutube className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 group-hover:text-rose-950">
                        {promoVideos.length === 1 ? "Watch promo video" : `Watch promo video ${index + 1}`}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">Opens on YouTube</span>
                    </span>
                  </a>
                ))}
              </div>
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
            <div className="mt-5 space-y-4">
              {hasPromoVideos ? (
                <GuestPromoVideoCard promoCount={promoVideos.length} />
              ) : null}

              <div className="rounded-2xl border border-slate-200/90 bg-slate-50 p-4 lg:rounded-2xl lg:border-slate-200 lg:bg-slate-50">
                <h2 className="text-sm font-semibold text-slate-900 lg:text-base">View More</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-700 lg:text-sm lg:leading-normal">
                  Login or register to view complete event details, highlights, and location information.
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Link
                    to="/login"
                    state={{ from: eventDetailPath(event) }}
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
            </div>
          ) : null}

          <Link
            to="/events"
            className="mt-5 flex w-full items-center justify-center rounded-xl border border-dashed border-brand-300/70 bg-brand-50/50 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 lg:mt-5 lg:inline-flex lg:w-auto lg:border-0 lg:bg-transparent lg:py-0 lg:text-brand-600"
          >
            Browse more events
          </Link>
        </div>

        <aside className="lg:sticky lg:top-24 lg:z-10 lg:self-start">
          {ticketSalesMode === "platform" && (isAuthenticated || !isYayDealEvent) ? (
            <EventTicketCheckoutPanel event={event} guestMode={!isAuthenticated} />
          ) : (
            <EventAirbnbBookingShell
              event={event}
              ticketSalesMode={ticketSalesMode}
              isGuest={isGuest}
              scheduleLabel={formatEventScheduleLabel(event)}
              timeLabel={formatTime12Hour(event.event_time)}
              pricePerDay={pricePerDay}
            />
          )}
        </aside>
      </div>
    </motion.div>
  );
}

function formatEventScheduleLabel(event) {
  const toDate = (value) => formatDateUS(value);
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
