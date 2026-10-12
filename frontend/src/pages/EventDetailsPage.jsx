import { Link, useLocation, useParams } from "react-router-dom";
import { absoluteListingUrl, eventDetailPath } from "../utils/listingPaths";
import ShareListingButton from "../components/ShareListingButton";
import ListingFavoriteButton from "../components/ListingFavoriteButton";
import BecomeSponsorButton from "../components/BecomeSponsorButton";
import BecomeInfluencerPartnerButton from "../components/BecomeInfluencerPartnerButton";
import EventSponsorContactDetails from "../components/EventSponsorContactDetails";
import HomeSpotlightChip from "../components/HomeSpotlightChip";
import { LandingTagList } from "../components/ListingTagIcon";
import { useCanonicalListingUrl } from "../utils/useCanonicalListingUrl";
import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FiCalendar, FiClock, FiMapPin, FiUser, FiYoutube } from "react-icons/fi";
import { BookOpen, CheckCircle, Clock, Globe, MapPin, Mic, Ticket, Users } from "lucide-react";
import { fetchEventById, trackEventView, trackEventPresence } from "../services/eventService";
import { trackEventPageView } from "../utils/googleAnalytics";
import { recordVendorLinkHit } from "../services/vendorShareService";
import {
  getOrCreatePageSessionKey,
  getOrCreateVendorSessionKey,
  resolveVendorCodeForEvent
} from "../utils/vendorAttribution";
import { formatCurrency, formatDateUS, formatEventDuration, formatTime12Hour } from "../utils/format";
import { normalizeEventTicketSalesMode } from "../utils/eventTicketSalesMode";
import { resolveEventListPrice } from "../utils/eventTicketLevels";
import useAuth from "../hooks/useAuth";
import useCityFilter from "../hooks/useCityFilter";
import { useRouteContentReady } from "../context/RouteContentReadyContext";
import EventDetailBanner from "../components/EventDetailBanner";
import GuestPromoVideoCard from "../components/GuestPromoVideoCard";
import EventAirbnbBookingShell from "../components/EventAirbnbBookingShell";
import RichTextContent from "../components/RichTextContent";
import { truncateDescriptionPlain } from "../utils/richText";
import { isHomeFeaturedEvent } from "../utils/eventHomeFeatured";

const EventTicketCheckoutPanel = lazy(() => import("../components/EventTicketCheckoutPanel"));
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

function EventDetailActionRow({ children }) {
  const rowRef = useRef(null);
  const [icons, setIcons] = useState(false);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) {
      return undefined;
    }
    const measure = () => {
      if (window.matchMedia("(min-width: 1024px)").matches || row.clientWidth < 8) {
        setIcons(false);
        return;
      }
      const compact = row.classList.contains("is-icons");
      row.classList.remove("is-icons");
      const textFits = row.scrollWidth <= row.clientWidth + 2;
      if (compact) {
        row.classList.add("is-icons");
      }
      setIcons(!textFits);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    let cancelled = false;
    document.fonts?.ready?.then(() => {
      if (!cancelled) {
        measure();
      }
    });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [children]);

  return (
    <div
      ref={rowRef}
      className={`event-detail-actions mb-3 flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-hidden lg:absolute lg:right-6 lg:top-6 lg:mb-0 lg:max-w-[18rem] lg:gap-2 lg:overflow-visible lg:justify-end ${
        icons ? "is-icons" : ""
      }`}
    >
      {children}
    </div>
  );
}

function EventDetailsPage() {
  const { slug } = useParams();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { selectedCity } = useCityFilter();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [trackedView, setTrackedView] = useState(false);
  const [trackedVendorHit, setTrackedVendorHit] = useState(false);
  const [showMobileBookBar, setShowMobileBookBar] = useState(false);
  const [detailChapter, setDetailChapter] = useState("story");
  const checkoutRef = useRef(null);
  const ownerPreview = Boolean(location.state?.ownerPreview);

  useCanonicalListingUrl(event, eventDetailPath);

  useEffect(() => {
    let active = true;

    async function loadEvent() {
      try {
        setLoading(true);
        setError("");
        const response = await fetchEventById(slug, { ownerPreview });
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
  }, [slug, ownerPreview]);

  useEffect(() => {
    if (!event?.id || trackedView) {
      return;
    }
    if (event.viewer_preview) {
      setTrackedView(true);
      return;
    }
    trackEventPageView({
      eventId: event.id,
      eventTitle: event.title,
      ticketMode: event.ticket_sales_mode
    });
    trackEventView(event.public_slug || event.id).catch(() => {});
    setTrackedView(true);
  }, [event?.id, event?.title, event?.ticket_sales_mode, event?.viewer_preview, trackedView]);

  useEffect(() => {
    if (!event?.id || trackedVendorHit || event.viewer_preview) {
      return;
    }
    const code = resolveVendorCodeForEvent(event.id, location.search);
    if (!code) {
      return;
    }
    setTrackedVendorHit(true);
    void recordVendorLinkHit(event.id, {
      vendor_code: code,
      session_key: getOrCreateVendorSessionKey(),
      path: location.pathname || undefined
    }).catch(() => {});
  }, [event?.id, event?.viewer_preview, location.search, location.pathname, trackedVendorHit]);

  // Event-level live presence (all visitors) — powers organizer "Live now".
  useEffect(() => {
    if (!event?.id || event.viewer_preview) {
      return undefined;
    }

    let cancelled = false;
    const sessionKey = getOrCreatePageSessionKey();
    const ping = () => {
      if (cancelled || (typeof document !== "undefined" && document.visibilityState === "hidden")) {
        return;
      }
      void trackEventPresence(event.public_slug || event.id, { session_key: sessionKey });
    };

    ping();
    const intervalId = window.setInterval(ping, 30000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        ping();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [event?.id, event?.public_slug, event?.viewer_preview]);

  // Partner-link live presence — powers vendor "Live now".
  useEffect(() => {
    if (!event?.id || event.viewer_preview) {
      return undefined;
    }
    const code = resolveVendorCodeForEvent(event.id, location.search);
    if (!code) {
      return undefined;
    }

    let cancelled = false;
    const sessionKey = getOrCreateVendorSessionKey();
    const sendHeartbeat = () => {
      if (cancelled || (typeof document !== "undefined" && document.visibilityState === "hidden")) {
        return;
      }
      void recordVendorLinkHit(event.id, {
        vendor_code: code,
        session_key: sessionKey,
        path: location.pathname || undefined,
        heartbeat: true
      }).catch(() => {});
    };

    sendHeartbeat();
    const intervalId = window.setInterval(sendHeartbeat, 30000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [event?.id, event?.viewer_preview, location.search, location.pathname]);

  useEffect(() => {
    setTrackedView(false);
    setTrackedVendorHit(false);
  }, [slug]);

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

  useEffect(() => {
    const node = checkoutRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      return undefined;
    }
    // Tickets chapter already shows checkout; keep the sticky bar for Story/Place only.
    if (detailChapter === "tickets") {
      setShowMobileBookBar(false);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowMobileBookBar(!entry.isIntersecting);
      },
      { threshold: 0.15, rootMargin: "0px 0px -120px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [event?.id, loading, detailChapter]);

  const pricePerDay = resolveEventListPrice(event);

  if (loading) {
    return (
      <>
        <p className="hidden text-sm text-slate-500 lg:block">Loading event details...</p>
        <div className="space-y-3 lg:hidden" aria-busy="true" aria-label="Loading event details">
          <div className="h-48 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-6 w-2/3 animate-pulse rounded-full bg-slate-200" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-100" />
        </div>
      </>
    );
  }

  if (!event || error) {
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-base font-medium text-rose-600 lg:text-sm">{error || "Event not found."}</p>
        <Link to="/events" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-600 lg:inline-block lg:min-h-0">
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
  const fullDescription = event.description || "";
  const partialDescription = truncateDescriptionPlain(fullDescription, 240) || "No event description provided yet.";
  const aboutText = yayDealGuestLocked
    ? `Login to unlock full ${EXCLUSIVE_DEAL_EVENT_LABEL.toLowerCase()} details, highlights, location, and your exclusive discount code.`
    : isGuest
      ? partialDescription
      : fullDescription || "No event description provided yet.";
  const aboutIsLockedOrTruncated = yayDealGuestLocked || isGuest;

  const metaCard =
    "rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/95 to-white p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none";
  const metaValue = "font-semibold text-slate-900";
  const durationText = formatEventDuration(event.duration_hours, event.duration_minutes);
  const promoVideos = parsePromoVideoUrls(event.promo_video_urls);
  const hasPromoVideos = promoVideos.length > 0;
  const phoneChapter = (id) => (detailChapter === id ? "" : "max-lg:hidden");
  const eventChapters = [
    { id: "story", label: "Story", Icon: BookOpen },
    { id: "place", label: "Place", Icon: MapPin },
    { id: "tickets", label: "Tickets", Icon: Ticket }
  ];
  const openChapter = (id) => {
    setDetailChapter(id);
    if (id !== "tickets") return;
    window.requestAnimationFrame(() => {
      checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-4 lg:space-y-6"
    >
      {event.viewer_preview ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Preview only — this event is not visible on the public site.</p>
          <p className="mt-0.5 text-amber-900/80">
            Visitors will not see this listing until it is approved and set to Active.
          </p>
        </div>
      ) : null}
      <EventDetailBanner
        event={event}
        title={event.title}
        guestLocked={yayDealGuestLocked}
        promoVideos={promoVideos}
        videoGuestLocked={isGuest && hasPromoVideos}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] lg:items-start lg:gap-8">
        <div className="relative rounded-2xl border border-slate-200/90 bg-white p-4 shadow-soft ring-1 ring-slate-900/[0.04] sm:p-5 lg:rounded-3xl lg:border-slate-200 lg:p-6 lg:shadow-sm lg:ring-0">
          <EventDetailActionRow>
            <ListingFavoriteButton
              listingType="event"
              listingId={event.id}
              embedded
              label="Like"
              className="event-action-btn"
            />
            {event.sponsor_inquiry_enabled &&
            (event.sponsor_contact_email || event.sponsor_contact_phone) ? (
              <BecomeSponsorButton
                email={event.sponsor_contact_email}
                phone={event.sponsor_contact_phone}
                eventTitle={event.title}
              />
            ) : null}
            {event.influencer_partner_enabled &&
            (event.influencer_partner_contact_email || event.influencer_partner_contact_phone) ? (
              <BecomeInfluencerPartnerButton
                email={event.influencer_partner_contact_email}
                phone={event.influencer_partner_contact_phone}
                eventTitle={event.title}
              />
            ) : null}
            <ShareListingButton
              url={absoluteListingUrl(eventDetailPath(event))}
              title={event.title}
              listingType="event"
              className="event-action-btn inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200/90 bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-900/[0.03] backdrop-blur-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-md lg:px-3 lg:min-h-0"
            />
          </EventDetailActionRow>
          <p
            className={`mb-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 lg:mb-2 lg:text-sm lg:font-normal lg:tracking-normal ${
              event.sponsor_inquiry_enabled || event.influencer_partner_enabled
                ? "lg:pr-80"
                : "lg:pr-32"
            }`}
          >
            {event.city_name || "City"}
          </p>
          <h1
            className={`text-[1.35rem] font-bold leading-[1.2] tracking-tight text-slate-900 sm:text-2xl lg:text-3xl ${
              event.sponsor_inquiry_enabled || event.influencer_partner_enabled ? "lg:pr-80" : "lg:pr-8"
            }`}
          >
            {event.title}
          </h1>

          <div className="sticky top-20 z-30 -mx-4 mt-4 border-y border-slate-200/80 bg-white/95 px-3 py-2 backdrop-blur sm:top-24 sm:-mx-5 lg:hidden">
            <div role="tablist" aria-label="Event chapters" className="grid grid-cols-3 gap-1 rounded-full bg-slate-100 p-1">
              {eventChapters.map(({ id, label, Icon }) => {
                const selected = detailChapter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`event-chapter-${id}`}
                    aria-selected={selected}
                    aria-controls={id === "tickets" ? "event-ticket-checkout" : `event-panel-${id}`}
                    onClick={() => openChapter(id)}
                    className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-semibold transition ${
                      selected ? "bg-slate-900 text-white shadow-sm" : "text-slate-600"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {isHomeFeaturedEvent(event) ? (
            <div className="mt-3">
              <HomeSpotlightChip />
            </div>
          ) : null}

          {Array.isArray(event.tags) && event.tags.length ? (
            <div className="mt-3">
              <LandingTagList
                tags={event.tags}
                classFor={() =>
                  "rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 lg:px-3 lg:py-1 lg:text-[11px]"
                }
                desktopClassName="hidden flex-wrap items-center gap-2 lg:flex"
              />
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

          <div id="event-panel-story" className={`mt-5 border-t border-slate-100 pt-5 lg:mt-5 ${phoneChapter("story")}`}>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 lg:text-base lg:font-semibold lg:normal-case lg:tracking-normal lg:text-slate-900">
              About this event
            </h2>
            {aboutIsLockedOrTruncated ? (
              <p className="mt-2 text-[15px] font-medium leading-relaxed text-slate-800 lg:text-sm lg:leading-6">
                {aboutText}
              </p>
            ) : (
              <div className="mt-2">
                <RichTextContent html={aboutText} />
              </div>
            )}
          </div>

          <div className={`mt-5 grid grid-cols-1 gap-2.5 rounded-2xl border border-slate-200/90 bg-slate-50 p-3 sm:grid-cols-2 sm:p-4 lg:gap-3 lg:p-4 ${phoneChapter("story")}`}>
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
            <div className={`mt-5 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-amber-50/40 p-4 lg:rounded-2xl lg:p-4 ${phoneChapter("story")}`}>
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
            <div className={`mt-5 border-t border-slate-100 pt-5 lg:mt-5 ${phoneChapter("story")}`}>
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

          {(event.sponsor_inquiry_enabled &&
            (event.sponsor_contact_email || event.sponsor_contact_phone)) ||
          (event.influencer_partner_enabled &&
            (event.influencer_partner_contact_email || event.influencer_partner_contact_phone)) ? (
            <div className={`mt-5 space-y-4 border-t border-slate-100 pt-5 lg:mt-5 ${phoneChapter("place")}`}>
              {event.sponsor_inquiry_enabled &&
              (event.sponsor_contact_email || event.sponsor_contact_phone) ? (
                <EventSponsorContactDetails
                  variant="sponsor"
                  email={event.sponsor_contact_email}
                  phone={event.sponsor_contact_phone}
                  eventTitle={event.title}
                />
              ) : null}
              {event.influencer_partner_enabled &&
              (event.influencer_partner_contact_email || event.influencer_partner_contact_phone) ? (
                <EventSponsorContactDetails
                  variant="influencer"
                  email={event.influencer_partner_contact_email}
                  phone={event.influencer_partner_contact_phone}
                  eventTitle={event.title}
                />
              ) : null}
            </div>
          ) : null}

          {!isGuest && highlights.length > 0 ? (
            <div className={`mt-5 border-t border-slate-100 pt-5 lg:mt-5 ${phoneChapter("story")}`}>
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
            <div id="event-panel-place" className={`mt-5 border-t border-slate-100 pt-5 lg:mt-5 ${phoneChapter("place")}`}>
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
            <div id="event-panel-place" className={`mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:!hidden ${phoneChapter("place")}`}>
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Place</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
                Sign in to see the map, full address, and venue directions.
              </p>
              <Link
                to="/login"
                state={{ from: eventDetailPath(event) }}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white"
              >
                Sign in
              </Link>
            </div>
          ) : null}

          {isGuest ? (
            <div className={`mt-5 space-y-4 ${phoneChapter("story")}`}>
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
            className={`mt-5 flex w-full items-center justify-center rounded-xl border border-dashed border-brand-300/70 bg-brand-50/50 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 lg:mt-5 lg:inline-flex lg:w-auto lg:border-0 lg:bg-transparent lg:py-0 lg:text-brand-600 ${phoneChapter("story")}`}
          >
            Browse more events
          </Link>
        </div>

        <aside ref={checkoutRef} id="event-ticket-checkout" className={`scroll-mt-28 lg:sticky lg:top-24 lg:z-10 lg:self-start ${phoneChapter("tickets")}`}>
          {ticketSalesMode === "platform" && (isAuthenticated || !isYayDealEvent) ? (
            <Suspense
              fallback={
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-soft">
                  Loading checkout…
                </div>
              }
            >
              <EventTicketCheckoutPanel event={event} guestMode={!isAuthenticated} />
            </Suspense>
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
      {showMobileBookBar ? (
        <div
          className="fixed inset-x-0 z-[46] px-3 lg:hidden"
          style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex w-full max-w-lg min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-soft backdrop-blur">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">From</p>
              <p className="truncate text-sm font-semibold tabular-nums text-slate-900">
                {pricePerDay != null ? formatCurrency(pricePerDay) : "See tickets"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openChapter("tickets")}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-brand-600 px-4 text-sm font-semibold text-white active:scale-[0.98]"
            >
              Book tickets
            </button>
          </div>
        </div>
      ) : null}
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
