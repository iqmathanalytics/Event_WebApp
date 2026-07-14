import { forwardRef, lazy, Suspense, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import { FiCalendar, FiInfo, FiMapPin } from "react-icons/fi";
import { GitBranch, LayoutGrid } from "lucide-react";
import { createEvent, deleteEvent, fetchMyEvents, updateEvent } from "../services/eventService";
import { exportOrganizerBookings, fetchOrganizerBookings } from "../services/bookingService";
import { categories } from "../utils/filterOptions";
import { formatCurrency, formatDateUS } from "../utils/format";
import { formatBookingSeatsLabel } from "../utils/bookingSeats";
import { normalizeEventTicketSalesMode, resolveEventTicketSalesMode } from "../utils/eventTicketSalesMode";
import { downloadBlob } from "../utils/fileDownload";
import AirbnbDatePickerPanel from "../components/AirbnbDatePickerPanel";
import FilterPopupField from "../components/FilterPopupField";
import OrganizerSidebar from "../components/OrganizerSidebar";
import useCityFilter from "../hooks/useCityFilter";
import useAuth from "../hooks/useAuth";
import { useRouteContentReady } from "../context/RouteContentReadyContext";
import CloudinaryImageInput from "../components/CloudinaryImageInput";
import { LISTING_BANNER_IMAGE_HINT } from "../constants/listingImageGuide";
import PostSubmitFeedbackDialog from "../components/PostSubmitFeedbackDialog";
import BookingPaymentSummary from "../components/BookingPaymentSummary";
import {
  BookingAmountPaidCell,
  BookingPaymentStatusCell,
  BookingStripeRefCell
} from "../components/BookingPaymentTableCells";
import ScrollableTableFrame from "../components/ScrollableTableFrame";
import OrganizerCouponsPanel from "../components/OrganizerCouponsPanel";
import OrganizerSeatingChannelsModal from "../components/seating/OrganizerSeatingChannelsModal";
import OrganizerSeatingDesignerModal from "../components/seating/OrganizerSeatingDesignerModal";
import { SEATING_MODES, normalizeSeatingMode } from "../utils/seatingMode";
const OrganizerInsightsPanel = lazy(() => import("../components/OrganizerInsightsPanel"));
import EventTicketLevelsEditor from "../components/EventTicketLevelsEditor";
import {
  parseTicketLevelsFromEvent,
  serializeTicketLevelsForApi,
  ticketLevelsToFormRows
} from "../utils/eventTicketLevels";
import { MAX_PROMO_VIDEOS, normalizeYoutubePromoUrl, parsePromoVideoUrlsForForm } from "../utils/youtubeVideo";
import { parseGalleryImageUrls } from "../utils/eventGallery";

const initialForm = {
  title: "",
  description: "",
  schedule_type: "single",
  event_date: "",
  event_start_date: "",
  event_end_date: "",
  event_dates: [],
  event_time: "",
  venue_name: "",
  venue_address: "",
  google_maps_link: "",
  city_id: "",
  category_id: "",
  ticket_sales_mode: "external",
  total_seats: "",
  ticket_link: "",
  price: "",
  image_url: "",
  gallery_image_urls: [],
  promo_video_urls: [],
  duration_hours: "",
  duration_minutes: "",
  age_limit: "All Ages",
  languages: "",
  genres: "",
  event_highlights: [],
  is_yay_deal_event: false,
  deal_event_discount_code: "",
  ticket_levels: [],
  seating_mode: SEATING_MODES.GENERAL
};

/**
 * Use the checked `ticket_sales_mode` radio in the DOM when present, so we never POST stale React state
 * (can otherwise default to `external` while the user selected "On this site").
 */
function resolveTicketSalesModeForSubmit(submitEvent, formTicketMode) {
  let mode = normalizeEventTicketSalesMode(formTicketMode);
  const root = submitEvent?.currentTarget;
  if (root && typeof root.querySelector === "function") {
    const checked = root.querySelector('input[name="ticket_sales_mode"]:checked');
    if (checked && (checked.value === "platform" || checked.value === "external")) {
      mode = checked.value;
    }
  }
  return mode;
}

const eventHighlightOptions = [
  "Free Parking",
  "Food & Drinks",
  "Live Music",
  "Wheelchair Accessible",
  "Family Friendly",
  "Outdoor Event",
  "Photography Allowed",
  "After Party"
];

function normalizeOptionalUrl(value, fieldLabel) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return undefined;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    // Validate URL format for consistent backend payloads.
    // eslint-disable-next-line no-new
    new URL(withProtocol);
    return withProtocol;
  } catch (_err) {
    throw new Error(`Please enter a valid ${fieldLabel} URL.`);
  }
}

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

function getStatusBadgeClass(status) {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "rejected") {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-amber-100 text-amber-700";
}

function getStatusNote(status, reviewNote) {
  if (status === "approved") {
    return "Approved and visible to users";
  }
  if (status === "rejected") {
    if (String(reviewNote || "").trim()) {
      return `Rejected: ${String(reviewNote).trim()}`;
    }
    return "Rejected by admin. Please edit and resubmit.";
  }
  return "Waiting for admin approval";
}

function formatDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateValue(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function MyEventsActionBar({ showOrganizerDashboardLink, onCreate, className = "" }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {showOrganizerDashboardLink ? (
        <Link
          to="/dashboard/organizer"
          className="inline-flex items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-100/90"
        >
          Organizer dashboard
        </Link>
      ) : null}
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-slate-800"
      >
        Create New Event
      </button>
    </div>
  );
}

function FormField({ label, hint, example, className = "", children }) {
  return (
    <div className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      <span className="mb-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
        <FiInfo className="text-slate-400" />
        {hint}
        {example ? <span className="text-slate-400">Example: {example}</span> : null}
      </span>
      {children}
    </div>
  );
}

const OrganizerDashboardPage = forwardRef(function OrganizerDashboardPage(
  {
    embedded = false,
    suppressChrome = false,
    suppressRouteContentReadySignal = false,
    onEmbeddedWorkspaceInitialReady,
    embeddedSectionMode = "full",
    onRequestPlatformTickets = null
  },
  ref
) {
  const navigate = useNavigate();
  const { user, canSellPlatformTickets, refreshSession, isOrganizer } = useAuth();

  const openPlatformTicketRequest = () => {
    if (typeof onRequestPlatformTickets === "function") {
      onRequestPlatformTickets();
      return;
    }
    navigate("/dashboard/user", { state: { openPlatformTicketRequest: true } });
  };
  const { cities } = useCityFilter();
  const myEventsOnly = embedded && embeddedSectionMode === "my-events-only";
  const [activeSection, setActiveSection] = useState(myEventsOnly ? "my-events" : "overview");
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const editingPlatformEvent =
    Boolean(editingEvent) && resolveEventTicketSalesMode(editingEvent) === "platform";
  const showPlatformTicketOptions = canSellPlatformTickets || editingPlatformEvent;
  const [saving, setSaving] = useState(false);
  const [seatingModalOpen, setSeatingModalOpen] = useState(false);
  const [seatingChannelsModalOpen, setSeatingChannelsModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [overviewBookings, setOverviewBookings] = useState([]);
  const [bookingRows, setBookingRows] = useState([]);
  const [loadingOverviewBookings, setLoadingOverviewBookings] = useState(false);
  const [loadingBookingRows, setLoadingBookingRows] = useState(false);
  const [bookingFilters, setBookingFilters] = useState({ event_id: "", date: "" });
  const [bookingEventQuery, setBookingEventQuery] = useState("");
  const bookingFilterRef = useRef(null);
  const [activeBookingPanel, setActiveBookingPanel] = useState(null);
  const formPanelRef = useRef(null);
  const [activeFormPanel, setActiveFormPanel] = useState(null);
  const [postSubmitFeedback, setPostSubmitFeedback] = useState(null);
  const didKickOffLoadsRef = useRef(false);
  const embeddedWorkspaceReadySentRef = useRef(false);
  const sawEmbeddedLoadCycleRef = useRef(false);

  useRouteContentReady(
    suppressRouteContentReadySignal ? true : loading || loadingOverviewBookings || loadingBookingRows
  );

  useEffect(() => {
    const onDocClick = (event) => {
      if (!bookingFilterRef.current?.contains(event.target)) {
        setActiveBookingPanel(null);
      }
      if (!formPanelRef.current?.contains(event.target)) {
        setActiveFormPanel(null);
      }
    };
    window.addEventListener("click", onDocClick);
    return () => window.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    if (!isFormOpen || canSellPlatformTickets) {
      return undefined;
    }
    void refreshSession();
    const timer = window.setInterval(() => {
      void refreshSession();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [isFormOpen, canSellPlatformTickets, refreshSession]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingEvent(null);
  };

  const openCreate = useCallback(() => {
    setForm(initialForm);
    setEditingEvent(null);
    setIsFormOpen(true);
  }, []);

  useImperativeHandle(ref, () => ({ openCreateEvent: openCreate }), [openCreate]);

  const openEdit = (event) => {
    setEditingEvent(event);
    setForm({
      title: event.title || "",
      description: event.description || "",
      event_date: event.event_date ? String(event.event_date).slice(0, 10) : "",
      schedule_type: event.schedule_type || "single",
      event_start_date: event.event_start_date ? String(event.event_start_date).slice(0, 10) : "",
      event_end_date: event.event_end_date ? String(event.event_end_date).slice(0, 10) : "",
      event_dates: Array.isArray(event.event_dates) ? event.event_dates : [],
      event_time: event.event_time ? String(event.event_time).slice(0, 5) : "",
      venue_name: event.venue_name || event.venue || "",
      venue_address: event.venue_address || "",
      google_maps_link: event.google_maps_link || "",
      city_id: event.city_id ? String(event.city_id) : "",
      category_id: event.category_id ? String(event.category_id) : "",
      ticket_sales_mode: resolveEventTicketSalesMode(event),
      total_seats: event.total_seats != null && event.total_seats !== "" ? String(event.total_seats) : "",
      ticket_link: event.ticket_link || "",
      price: event.price ?? "",
      image_url: event.image_url || "",
      gallery_image_urls: parseGalleryImageUrls(event.gallery_image_urls),
      promo_video_urls: parsePromoVideoUrlsForForm(event.promo_video_urls),
      duration_hours: event.duration_hours ?? "",
      duration_minutes: event.duration_minutes ?? "",
      age_limit: event.age_limit || "All Ages",
      languages: event.languages || "",
      genres: event.genres || "",
      event_highlights: parseHighlights(event.event_highlights),
      is_yay_deal_event:
        event.is_yay_deal_event === 1 ||
        event.is_yay_deal_event === true ||
        String(event.is_yay_deal_event || "") === "1",
      deal_event_discount_code: event.deal_event_discount_code || "",
      ticket_levels: ticketLevelsToFormRows(parseTicketLevelsFromEvent(event)),
      seating_mode: normalizeSeatingMode(event.seating_mode)
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setActiveFormPanel(null);
    resetForm();
  };

  useEffect(() => {
    if (myEventsOnly && activeSection !== "my-events") {
      setActiveSection("my-events");
    }
  }, [myEventsOnly, activeSection]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetchMyEvents();
      setRows(response?.data || []);
    } catch (err) {
      setRows([]);
      const apiMessage = err?.response?.data?.message;
      setError(apiMessage || "Could not load your events. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadOverviewBookings = async () => {
    try {
      setLoadingOverviewBookings(true);
      const response = await fetchOrganizerBookings();
      setOverviewBookings(response?.data || []);
    } catch (_err) {
      setOverviewBookings([]);
    } finally {
      setLoadingOverviewBookings(false);
    }
  };

  const loadFilteredBookings = async () => {
    try {
      setLoadingBookingRows(true);
      const response = await fetchOrganizerBookings({
        event_id: bookingFilters.event_id || undefined,
        date: bookingFilters.date || undefined
      });
      setBookingRows(response?.data || []);
    } catch (_err) {
      setBookingRows([]);
    } finally {
      setLoadingBookingRows(false);
    }
  };

  useEffect(() => {
    didKickOffLoadsRef.current = true;
    loadEvents();
    loadOverviewBookings();
    loadFilteredBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!didKickOffLoadsRef.current) {
      return undefined;
    }
    if (loading || loadingOverviewBookings || loadingBookingRows) {
      sawEmbeddedLoadCycleRef.current = true;
    }
    return undefined;
  }, [loading, loadingOverviewBookings, loadingBookingRows]);

  useEffect(() => {
    if (!embedded || suppressRouteContentReadySignal || typeof onEmbeddedWorkspaceInitialReady !== "function") {
      return undefined;
    }
    if (!didKickOffLoadsRef.current || embeddedWorkspaceReadySentRef.current) {
      return undefined;
    }
    if (!sawEmbeddedLoadCycleRef.current) {
      return undefined;
    }
    if (!loading && !loadingOverviewBookings && !loadingBookingRows) {
      embeddedWorkspaceReadySentRef.current = true;
      onEmbeddedWorkspaceInitialReady();
    }
    return undefined;
  }, [
    embedded,
    suppressRouteContentReadySignal,
    loading,
    loadingOverviewBookings,
    loadingBookingRows,
    onEmbeddedWorkspaceInitialReady
  ]);

  useEffect(() => {
    loadFilteredBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingFilters]);

  const refreshData = async () => {
    await Promise.all([loadEvents(), loadOverviewBookings(), loadFilteredBookings()]);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      setSaving(true);
      if (!form.title.trim()) {
        throw new Error("Event title is required.");
      }
      if (form.schedule_type === "single" && !form.event_date) {
        throw new Error("Event date is required.");
      }
      if (form.schedule_type === "range" && (!form.event_start_date || !form.event_end_date)) {
        throw new Error("Start and end dates are required for date range events.");
      }
      if (
        form.schedule_type === "multiple" &&
        !form.event_dates.length
      ) {
        throw new Error("Please add at least one date for multiple-date events.");
      }
      if (!form.venue_name.trim()) {
        throw new Error("Venue name is required.");
      }
      if (!form.city_id) {
        throw new Error("Please select a city.");
      }
      if (!form.category_id) {
        throw new Error("Please select a category.");
      }
      let resolvedTicketMode = resolveTicketSalesModeForSubmit(e, form.ticket_sales_mode);
      if (!canSellPlatformTickets) {
        if (editingPlatformEvent) {
          resolvedTicketMode = "platform";
        } else {
          resolvedTicketMode = "external";
        }
      }
      if (resolvedTicketMode === "external" && !String(form.ticket_link || "").trim()) {
        throw new Error("Please enter your external ticket page URL.");
      }
      if (resolvedTicketMode === "platform") {
        const reservedSeating = normalizeSeatingMode(form.seating_mode) === SEATING_MODES.RESERVED;
        if (!reservedSeating) {
          const seats = Number(form.total_seats);
          if (!Number.isFinite(seats) || seats < 1) {
            throw new Error("Enter total seats available for on-site ticket booking (at least 1).");
          }
          if (seats > 50000) {
            throw new Error("Total seats cannot exceed 50,000.");
          }
        }
        const levels = serializeTicketLevelsForApi(form.ticket_levels);
        if (!levels.length) {
          throw new Error("Add at least one ticket level for on-site sales (name and price).");
        }
        if (reservedSeating && !editingEvent?.id) {
          throw new Error("Save the event first, then open Design seating chart to configure reserved seating.");
        }
      }
      if (form.is_yay_deal_event && !String(form.deal_event_discount_code || "").trim()) {
        throw new Error("Please enter a discount code for exclusive deal events.");
      }

      const venueMapsUrl = normalizeOptionalUrl(form.google_maps_link, "Google Maps");
      const rawTicket = String(form.ticket_link || "").trim();
      const ticketUrl =
        resolvedTicketMode === "platform"
          ? rawTicket
            ? normalizeOptionalUrl(form.ticket_link, "ticket")
            : null
          : normalizeOptionalUrl(form.ticket_link, "ticket");
      const imageUrl = normalizeOptionalUrl(form.image_url, "image");
      const galleryRaw = Array.isArray(form.gallery_image_urls) ? form.gallery_image_urls : [];
      const galleryUrls = [];
      for (const line of galleryRaw) {
        const trimmed = String(line || "").trim();
        if (!trimmed) {
          continue;
        }
        galleryUrls.push(normalizeOptionalUrl(trimmed, "gallery image"));
      }
      if (galleryUrls.length > 12) {
        throw new Error("You can add up to 12 additional banner images.");
      }
      const promoRaw = Array.isArray(form.promo_video_urls) ? form.promo_video_urls : [];
      const promoVideoUrls = [];
      for (const line of promoRaw) {
        const trimmed = String(line || "").trim();
        if (!trimmed) {
          continue;
        }
        const normalized = normalizeYoutubePromoUrl(trimmed);
        if (!normalized) {
          throw new Error("Each promo video must be a valid YouTube link (watch, youtu.be, or shorts URL).");
        }
        promoVideoUrls.push(normalized);
      }
      if (promoVideoUrls.length > MAX_PROMO_VIDEOS) {
        throw new Error(`You can add up to ${MAX_PROMO_VIDEOS} promo videos.`);
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        event_date: form.event_date || undefined,
        schedule_type: form.schedule_type,
        event_start_date: form.schedule_type === "range" ? form.event_start_date || undefined : undefined,
        event_end_date: form.schedule_type === "range" ? form.event_end_date || undefined : undefined,
        event_dates: form.schedule_type === "multiple" ? form.event_dates : undefined,
        event_time: form.event_time || undefined,
        venue: form.venue_name.trim(),
        venue_name: form.venue_name.trim(),
        venue_address: form.venue_address.trim() || undefined,
        google_maps_link: venueMapsUrl,
        city_id: Number(form.city_id),
        category_id: Number(form.category_id),
        ticket_sales_mode: resolvedTicketMode,
        seating_mode:
          resolvedTicketMode === "platform" ? normalizeSeatingMode(form.seating_mode) : SEATING_MODES.GENERAL,
        total_seats:
          resolvedTicketMode === "platform" &&
          normalizeSeatingMode(form.seating_mode) !== SEATING_MODES.RESERVED
            ? Number(form.total_seats)
            : undefined,
        image_url: imageUrl,
        gallery_image_urls: galleryUrls,
        promo_video_urls: promoVideoUrls,
        ticket_levels:
          resolvedTicketMode === "platform" ? serializeTicketLevelsForApi(form.ticket_levels) : undefined,
        price:
          resolvedTicketMode === "platform"
            ? Math.min(...serializeTicketLevelsForApi(form.ticket_levels).map((l) => l.price))
            : form.price === ""
              ? 0
              : Number(form.price),
        duration_hours: form.duration_hours === "" ? undefined : Number(form.duration_hours),
        duration_minutes: form.duration_minutes === "" ? undefined : Number(form.duration_minutes),
        age_limit: form.age_limit || undefined,
        languages: form.languages.trim() || undefined,
        genres: form.genres.trim() || undefined,
        event_highlights: form.event_highlights,
        is_yay_deal_event: Boolean(form.is_yay_deal_event),
        deal_event_discount_code: form.is_yay_deal_event
          ? String(form.deal_event_discount_code || "").trim()
          : undefined
      };

      if (resolvedTicketMode === "external") {
        payload.ticket_link = ticketUrl;
      } else if (ticketUrl) {
        payload.ticket_link = ticketUrl;
      }

      const wasEditing = Boolean(editingEvent);
      if (wasEditing) {
        await updateEvent(editingEvent.id, payload);
        await loadEvents();
        closeForm();
        setPostSubmitFeedback({
          title: "Event updated",
          description: "Your changes were saved and your event is now live — no admin re-approval needed."
        });
        return;
      }

      const result = await createEvent(payload);
      await loadEvents();
      const autoApproved = Boolean(result?.data?.autoApproved);
      closeForm();
      setPostSubmitFeedback({
        title: autoApproved ? "Event published" : "Event submitted",
        description: autoApproved
          ? "Your event is live on the site. Our team can still review the listing details."
          : "Your event was submitted successfully and is pending admin approval."
      });
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      const apiDetails = err?.response?.data?.details;
      if (Array.isArray(apiDetails) && apiDetails.length) {
        const detailText = apiDetails
          .map((item) => `${item.path?.replace("body.", "") || "field"}: ${item.message}`)
          .join(" | ");
        setError(detailText);
      } else {
        setError(apiMessage || err?.message || "Could not save event. Please check your inputs.");
      }
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (event) => {
    setDeleteTarget(event);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      await deleteEvent(deleteTarget.id);
      setSuccess("Event deleted successfully.");
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      await refreshData();
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      setError(apiMessage || "Could not delete event.");
    } finally {
      setSaving(false);
    }
  };

  const downloadBookings = async (format) => {
    const result = await exportOrganizerBookings({
      ...bookingFilters,
      event_id: bookingFilters.event_id || undefined,
      date: bookingFilters.date || undefined,
      format
    });
    downloadBlob(result.blob, `organizer-bookings.${format === "excel" ? "xlsx" : "csv"}`);
  };

  const bookingEventOptions = useMemo(() => {
    return [...rows].sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "en", { sensitivity: "base" }));
  }, [rows]);

  const filteredBookingEventOptions = useMemo(() => {
    const query = bookingEventQuery.trim().toLowerCase();
    if (!query) {
      return bookingEventOptions;
    }
    return bookingEventOptions.filter((item) => String(item.title || "").toLowerCase().includes(query));
  }, [bookingEventOptions, bookingEventQuery]);

  const showBackToUserDashboard =
    !embedded && user?.role === "user" && (user?.organizer_enabled === 1 || user?.role === "organizer");
  const showOrganizerDashboardLink = myEventsOnly && isOrganizer;
  const scheduleTypeLabel =
    form.schedule_type === "multiple"
      ? "Multiple Dates Event"
      : form.schedule_type === "range"
        ? "Date Range Event"
        : "Single Date Event";
  const selectedCityLabel = cities.find((city) => String(city.value) === String(form.city_id))?.label || "Select City";
  const selectedCategoryLabel =
    categories.find((category) => String(category.value) === String(form.category_id))?.label || "Select Category";

  return (
    <>
      {!suppressChrome ? (
        <>
      {/* Mobile + Tablet layout (does not affect desktop). */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="lg:hidden space-y-4"
      >
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 text-white shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70">
                {embedded ? "Your hosted experiences" : "Host dashboard"}
              </p>
              <h1 className="mt-2 text-xl font-bold leading-tight">
                {embedded ? (
                  <>
                    Gatherings you&apos;re bringing
                    <span className="block text-white/85">to the city</span>
                  </>
                ) : (
                  <>
                    Manage events, bookings,
                    <span className="block text-white/85">and momentum</span>
                  </>
                )}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                {embedded
                  ? "Create listings, tune details, and watch RSVPs roll in."
                  : "Quick access to what matters most on mobile."}
              </p>
            </div>
            {showBackToUserDashboard ? (
              <Link
                to="/dashboard/user"
                className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold ring-1 ring-white/15 hover:bg-white/15"
              >
                Back
              </Link>
            ) : null}
          </div>

          {!myEventsOnly ? <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveSection("overview")}
              className={`rounded-2xl px-3 py-3 text-left ring-1 ring-white/10 transition ${
                activeSection === "overview"
                  ? "bg-white/20 ring-2 ring-white/30 shadow-[0_12px_34px_-18px_rgba(255,255,255,0.35)]"
                  : "bg-white/10 hover:bg-white/15"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Overview</p>
              <p className="mt-1 text-sm font-semibold">Stats</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("my-events")}
              className={`rounded-2xl px-3 py-3 text-left ring-1 ring-white/10 transition ${
                activeSection === "my-events"
                  ? "bg-white/20 ring-2 ring-white/30 shadow-[0_12px_34px_-18px_rgba(255,255,255,0.35)]"
                  : "bg-white/10 hover:bg-white/15"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">My events</p>
              <p className="mt-1 text-sm font-semibold">{rows.length}</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("coupons")}
              className={`rounded-2xl px-3 py-3 text-left ring-1 ring-white/10 transition ${
                activeSection === "coupons"
                  ? "bg-white/20 ring-2 ring-white/30 shadow-[0_12px_34px_-18px_rgba(255,255,255,0.35)]"
                  : "bg-white/10 hover:bg-white/15"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Coupons</p>
              <p className="mt-1 text-sm font-semibold">Promo codes</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("bookings")}
              className={`rounded-2xl px-3 py-3 text-left ring-1 ring-white/10 transition ${
                activeSection === "bookings"
                  ? "bg-white/20 ring-2 ring-white/30 shadow-[0_12px_34px_-18px_rgba(255,255,255,0.35)]"
                  : "bg-white/10 hover:bg-white/15"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Bookings</p>
              <p className="mt-1 text-sm font-semibold">{overviewBookings.length}</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSection("my-events");
                openCreate();
              }}
              className="rounded-2xl bg-white px-3 py-3 text-left font-semibold text-slate-900 ring-1 ring-white/30"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Create</p>
              <p className="mt-1 text-sm font-bold">New event</p>
            </button>
          </div> : null}
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          {!myEventsOnly && activeSection === "overview" ? (
            <motion.section
              key="m-overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-4"
            >
              <Suspense fallback={<p className="text-sm text-slate-500">Loading analytics…</p>}>
                <OrganizerInsightsPanel
                  events={rows}
                  refreshKey={analyticsRefreshKey}
                  organizerBookings={overviewBookings}
                />
              </Suspense>
            </motion.section>
          ) : null}

          {myEventsOnly || activeSection === "my-events" ? (
            <motion.section
              key="m-my-events"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft"
            >
              <MyEventsActionBar
                showOrganizerDashboardLink={showOrganizerDashboardLink}
                onCreate={openCreate}
                className="mb-4"
              />
              <div>
                <h2 className="text-base font-bold text-slate-900">My events</h2>
                <p className="mt-1 text-sm text-slate-600">Create, edit, and track review status.</p>
              </div>

              {loading ? <p className="mt-3 text-sm text-slate-500">Loading your events...</p> : null}
              {!loading && rows.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-semibold text-slate-900">No events submitted yet.</p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Create your first event
                  </button>
                </div>
              ) : null}

              {!loading && rows.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {rows.map((item) => (
                    <article key={`m-org-event-card-${item.id}`} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${getStatusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-600">
                        <span className="font-semibold">Date:</span> {formatDateUS(item.event_date)}{" "}
                        <span className="px-1 text-slate-300">•</span>
                        <span className="font-semibold">City:</span> {item.city_name || "-"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{getStatusNote(item.status, item.review_note)}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="flex-1 rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(item)}
                          className="flex-1 rounded-full bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </motion.section>
          ) : null}

          {!myEventsOnly && activeSection === "coupons" ? (
            <OrganizerCouponsPanel key="coupons-mobile" />
          ) : null}

          {!myEventsOnly && activeSection === "bookings" ? (
            <motion.section
              key="m-bookings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Event bookings</h2>
                  <p className="mt-1 text-sm text-slate-600">Filter and export your reservations.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => downloadBookings("csv")}
                    className="flex-1 rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadBookings("excel")}
                    className="flex-1 rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Excel
                  </button>
                </div>
              </div>

              <div
                ref={bookingFilterRef}
                className="mt-3 grid grid-cols-2 gap-2 rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-soft"
              >
                <FilterPopupField
                  label="Event"
                  value={
                    bookingEventOptions.find((item) => String(item.id) === String(bookingFilters.event_id))?.title || "All Events"
                  }
                  isActive={activeBookingPanel === "event"}
                  onToggle={(e) => {
                    e.stopPropagation();
                    setBookingEventQuery("");
                    setActiveBookingPanel((prev) => (prev === "event" ? null : "event"));
                  }}
                  panelClassName="w-full min-w-[240px]"
                  panelContent={
                    <div>
                      <label className="mb-2 block">
                        <span className="sr-only">Search events</span>
                        <input
                          type="text"
                          value={bookingEventQuery}
                          onChange={(e) => setBookingEventQuery(e.target.value)}
                          placeholder="Search events"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 caret-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-300"
                        />
                      </label>
                      <div className="hide-scrollbar max-h-56 space-y-0.5 overflow-y-auto pr-1">
                        <button
                          type="button"
                          onClick={() => {
                            setBookingFilters((prev) => ({ ...prev, event_id: "" }));
                            setActiveBookingPanel(null);
                          }}
                          className={`group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition hover:bg-slate-50 ${
                            !bookingFilters.event_id ? "bg-slate-50 text-slate-900" : "text-slate-700"
                          }`}
                        >
                          <FiMapPin className="shrink-0 text-slate-400" />{" "}
                          <span className="min-w-0 flex-1 truncate">All Events</span>
                          {!bookingFilters.event_id ? (
                            <span className="shrink-0 text-[11px] font-semibold text-emerald-700">Selected</span>
                          ) : null}
                        </button>
                        {filteredBookingEventOptions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setBookingFilters((prev) => ({ ...prev, event_id: String(item.id) }));
                              setActiveBookingPanel(null);
                            }}
                            className={`group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition hover:bg-slate-50 ${
                              String(bookingFilters.event_id) === String(item.id)
                                ? "bg-slate-50 text-slate-900"
                                : "text-slate-700"
                            }`}
                          >
                            <FiMapPin className="shrink-0 text-slate-400" />{" "}
                            <span className="min-w-0 flex-1 truncate">{item.title}</span>
                            {String(bookingFilters.event_id) === String(item.id) ? (
                              <span className="shrink-0 text-[11px] font-semibold text-emerald-700">Selected</span>
                            ) : null}
                          </button>
                        ))}
                        {filteredBookingEventOptions.length === 0 ? (
                          <p className="px-2.5 py-3 text-sm text-slate-500">No events found.</p>
                        ) : null}
                      </div>
                    </div>
                  }
                />

                <FilterPopupField
                  label="Date"
                  value={bookingFilters.date ? formatDateUS(bookingFilters.date) : "Any Date"}
                  isActive={activeBookingPanel === "date"}
                  onToggle={(e) => {
                    e.stopPropagation();
                    setActiveBookingPanel((prev) => (prev === "date" ? null : "date"));
                  }}
                  panelClassName="w-fit max-w-[calc(100vw-2rem)]"
                  panelContent={
                    <AirbnbDatePickerPanel
                      value={bookingFilters.date}
                      onChange={(next) => setBookingFilters((prev) => ({ ...prev, date: next }))}
                      closeOnSelect
                      onClose={() => setActiveBookingPanel(null)}
                    />
                  }
                />
              </div>

              <div className="mt-3 space-y-2">
                {loadingBookingRows ? (
                  <p className="rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-500">Loading bookings...</p>
                ) : bookingRows.length === 0 ? (
                  <p className="rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-500">
                    No bookings match the selected filters.
                  </p>
                ) : (
                  bookingRows.map((item) => (
                    <article key={`m-org-book-card-${item.id}`} className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-900">{item.event_title}</p>
                      <p className="mt-1 text-xs text-slate-600">{item.name} • {item.email}</p>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-600">
                        <p><span className="font-semibold">Guests:</span> {item.attendee_count}</p>
                        <p>
                          <span className="font-semibold">Booked:</span>{" "}
                          {item.created_at ? formatDateUS(String(item.created_at).slice(0, 10)) : "-"}
                        </p>
                        <p className="col-span-2">
                          <span className="font-semibold">Dates:</span>{" "}
                          {Array.isArray(item.selected_dates) && item.selected_dates.length
                            ? item.selected_dates.map((value) => formatDateUS(value)).join(", ")
                            : "-"}
                        </p>
                        {formatBookingSeatsLabel(item) ? (
                          <p className="col-span-2">
                            <span className="font-semibold">Seats:</span> {formatBookingSeatsLabel(item)}
                          </p>
                        ) : null}
                        <p className="col-span-2"><span className="font-semibold">Total:</span> {formatCurrency(item.total_amount || 0)}</p>
                        <div className="col-span-2 mt-1">
                          <BookingPaymentSummary booking={item} />
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </motion.div>

      {/* Desktop layout (unchanged). */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className={`hidden min-w-0 lg:grid grid-cols-1 gap-4 ${myEventsOnly ? "lg:grid-cols-1" : "lg:grid-cols-[220px_minmax(0,1fr)]"}`}
      >
        {!myEventsOnly ? <OrganizerSidebar activeSection={activeSection} onSectionChange={setActiveSection} /> : null}

        <section className="min-w-0 space-y-4">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            {myEventsOnly ? (
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">My events</h2>
                <p className="text-sm text-slate-600">Create, edit, and track review status.</p>
              </div>
            ) : (
              <div className="min-w-0 pr-1">
                <h1 className="text-2xl font-bold">Organizer Dashboard</h1>
                <p className="text-sm text-slate-600">
                  Track event performance, booking activity, and submissions in one place.
                </p>
              </div>
            )}
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {showBackToUserDashboard ? (
                <Link
                  to="/dashboard/user"
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-soft transition hover:bg-slate-50"
                >
                  Back to User Dashboard
                </Link>
              ) : null}
              {myEventsOnly ? (
                <MyEventsActionBar
                  showOrganizerDashboardLink={showOrganizerDashboardLink}
                  onCreate={openCreate}
                />
              ) : activeSection === "my-events" ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-soft"
                >
                  Create New Event
                </button>
              ) : null}
            </div>
          </header>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {success}
            </div>
          ) : null}

          <AnimatePresence mode="wait">
          {!myEventsOnly && activeSection === "overview" ? (
            <motion.section
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-4"
            >
              <Suspense fallback={<p className="text-sm text-slate-500">Loading analytics…</p>}>
                <OrganizerInsightsPanel
                  events={rows}
                  refreshKey={analyticsRefreshKey}
                  organizerBookings={overviewBookings}
                />
              </Suspense>
            </motion.section>
          ) : null}

          {myEventsOnly || activeSection === "my-events" ? (
            <motion.section
              key="my-events"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft"
            >
              <h2 className="text-lg font-semibold text-slate-900">My Events</h2>
              {loading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                  Loading your events...
                </div>
              ) : null}
              {!loading && rows.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-medium text-slate-700">No events submitted yet.</p>
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Create Your First Event
                  </button>
                </div>
              ) : null}
              {!loading && rows.length > 0 ? (
                <>
                  <div className="mt-3 space-y-2 md:hidden">
                    {rows.map((item) => (
                      <article key={`m-org-event-${item.id}`} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${getStatusBadgeClass(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-600">
                          <p><span className="font-semibold">Date:</span> {formatDateUS(item.event_date)}</p>
                          <p><span className="font-semibold">City:</span> {item.city_name || "-"}</p>
                          <p className="col-span-2"><span className="font-semibold">Price:</span> {formatCurrency(item.price || 0)}</p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{getStatusNote(item.status, item.review_note)}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDelete(item)}
                            className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white"
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                <div className="mt-3 hidden md:block">
                  <ScrollableTableFrame minWidthClass="min-w-[820px]" maxHeightClass="max-h-[min(60vh,36rem)]">
                  <table className="w-full table-fixed text-left text-sm">
                    <colgroup>
                      <col className="w-[38%]" />
                      <col className="w-[12%]" />
                      <col className="w-[14%]" />
                      <col className="w-[10%]" />
                      <col className="w-[14%]" />
                      <col className="w-[12%]" />
                    </colgroup>
                    <thead className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide">Event Title</th>
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Date</th>
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide">City</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">Price</th>
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide">Status</th>
                        <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2.5 font-medium text-slate-900">
                            <span className="line-clamp-2" title={item.title || ""}>
                              {item.title}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{formatDateUS(item.event_date)}</td>
                          <td className="px-3 py-2.5 text-slate-600">
                            <span className="block truncate" title={item.city_name || ""}>
                              {item.city_name || "-"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap text-slate-600">
                            {formatCurrency(item.price || 0)}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${getStatusBadgeClass(item.status)}`}
                            >
                              {item.status}
                            </span>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                              {getStatusNote(item.status, item.review_note)}
                            </p>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(item)}
                                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => openDelete(item)}
                                className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </ScrollableTableFrame>
                </div>
                </>
              ) : null}
            </motion.section>
          ) : null}

          {!myEventsOnly && activeSection === "coupons" ? (
            <OrganizerCouponsPanel key="coupons-desktop" />
          ) : null}

          {!myEventsOnly && activeSection === "bookings" ? (
            <motion.section
              key="bookings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Event Bookings</h2>
                  <p className="text-sm text-slate-500">View reservations received for your events.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => downloadBookings("csv")}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Download CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadBookings("excel")}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                  >
                    Download Excel
                  </button>
                </div>
              </div>
              <div
                ref={bookingFilterRef}
                className="mt-3 grid grid-cols-1 gap-2 rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-soft sm:grid-cols-2"
              >
                <FilterPopupField
                  label="Event"
                  value={
                    bookingEventOptions.find((item) => String(item.id) === String(bookingFilters.event_id))?.title || "All Events"
                  }
                  isActive={activeBookingPanel === "event"}
                  onToggle={(e) => {
                    e.stopPropagation();
                  setBookingEventQuery("");
                    setActiveBookingPanel((prev) => (prev === "event" ? null : "event"));
                  }}
                  panelClassName="w-full min-w-[240px]"
                  panelContent={
                    <div>
                      <label className="mb-2 block">
                        <span className="sr-only">Search events</span>
                        <input
                          type="text"
                          value={bookingEventQuery}
                          onChange={(e) => setBookingEventQuery(e.target.value)}
                          placeholder="Search events"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 caret-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-300"
                        />
                      </label>
                      <div className="hide-scrollbar max-h-56 space-y-0.5 overflow-y-auto pr-1">
                      <button
                        type="button"
                        onClick={() => {
                          setBookingFilters((prev) => ({ ...prev, event_id: "" }));
                          setActiveBookingPanel(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        <FiMapPin className="text-slate-400" /> All Events
                      </button>
                      {filteredBookingEventOptions.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setBookingFilters((prev) => ({ ...prev, event_id: String(item.id) }));
                            setActiveBookingPanel(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <FiMapPin className="text-slate-400" /> {item.title}
                        </button>
                      ))}
                      {filteredBookingEventOptions.length === 0 ? (
                        <p className="px-2.5 py-3 text-sm text-slate-500">No events found.</p>
                      ) : null}
                      </div>
                    </div>
                  }
                />

                <FilterPopupField
                  label="Date"
                  value={bookingFilters.date ? formatDateUS(bookingFilters.date) : "Any Date"}
                  isActive={activeBookingPanel === "date"}
                  onToggle={(e) => {
                    e.stopPropagation();
                    setActiveBookingPanel((prev) => (prev === "date" ? null : "date"));
                  }}
                  panelClassName="w-fit max-w-[calc(100vw-2rem)]"
                  panelContent={
                    <AirbnbDatePickerPanel
                      value={bookingFilters.date}
                      onChange={(next) => setBookingFilters((prev) => ({ ...prev, date: next }))}
                      closeOnSelect
                      onClose={() => setActiveBookingPanel(null)}
                    />
                  }
                />
              </div>
              <div className="mt-3 space-y-2 md:hidden">
                {loadingBookingRows ? (
                  <p className="rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-500">Loading bookings...</p>
                ) : bookingRows.length === 0 ? (
                  <p className="rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-500">
                    No bookings match the selected filters.
                  </p>
                ) : (
                  bookingRows.map((item) => (
                    <article key={`m-org-book-${item.id}`} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-900">{item.event_title}</p>
                      <p className="text-xs text-slate-600">{item.name} • {item.email}</p>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-600">
                        <p><span className="font-semibold">Phone:</span> {item.phone}</p>
                        <p><span className="font-semibold">Guests:</span> {item.attendee_count}</p>
                        <p className="col-span-2">
                          <span className="font-semibold">Dates:</span>{" "}
                          {Array.isArray(item.selected_dates) && item.selected_dates.length
                            ? item.selected_dates.map((value) => formatDateUS(value)).join(", ")
                            : "-"}
                        </p>
                        {formatBookingSeatsLabel(item) ? (
                          <p className="col-span-2">
                            <span className="font-semibold">Seats:</span> {formatBookingSeatsLabel(item)}
                          </p>
                        ) : null}
                        <p><span className="font-semibold">Total:</span> {formatCurrency(item.total_amount || 0)}</p>
                        <p>
                          <span className="font-semibold">Booked:</span>{" "}
                          {item.created_at ? formatDateUS(String(item.created_at).slice(0, 10)) : "-"}
                        </p>
                        <div className="col-span-2 mt-1">
                          <BookingPaymentSummary booking={item} />
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
              <div className="mt-3 hidden md:block">
                <ScrollableTableFrame minWidthClass="min-w-[1280px]">
                <table className="w-full table-fixed text-left text-sm">
                  <colgroup>
                    <col className="w-[88px]" />
                    <col className="w-[220px]" />
                    <col className="w-[140px]" />
                    <col className="w-[180px]" />
                    <col className="w-[118px]" />
                    <col className="w-[70px]" />
                    <col className="w-[120px]" />
                    <col className="w-[118px]" />
                    <col className="w-[96px]" />
                    <col className="w-[100px]" />
                    <col className="w-[96px]" />
                    <col className="w-[118px]" />
                    <col className="w-[108px]" />
                  </colgroup>
                  <thead className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Type</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Event Name</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Attendee</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Email</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Phone</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Guests</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Seats</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Event Dates</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Total</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Payment</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Charged</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Stripe</th>
                      <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Booked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingBookingRows ? (
                      <tr>
                        <td className="px-3 py-2.5 text-slate-500" colSpan={13}>
                          Loading bookings...
                        </td>
                      </tr>
                    ) : null}
                    {!loadingBookingRows && bookingRows.length === 0 ? (
                      <tr>
                        <td className="px-3 py-2.5 text-slate-500" colSpan={13}>
                          No bookings match the selected filters.
                        </td>
                      </tr>
                    ) : null}
                    {!loadingBookingRows
                      ? bookingRows.map((item) => {
                          const seatsLabel = formatBookingSeatsLabel(item);
                          return (
                          <tr key={item.id} className="border-b border-slate-100">
                            <td className="px-3 py-2.5">
                              {item.is_guest_booking === 1 ||
                              item.is_guest_booking === true ||
                              String(item.is_guest_booking || "") === "1" ||
                              item.user_id == null ? (
                                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                                  Guest
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500">Registered</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-900">
                              <span className="line-clamp-2" title={item.event_title || ""}>
                                {item.event_title}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">
                              <span className="block truncate" title={item.name || ""}>
                                {item.name}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">
                              <span className="block truncate" title={item.email || ""}>
                                {item.email}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{item.phone}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{item.attendee_count}</td>
                            <td className="px-3 py-2.5 text-slate-600">
                              <span className="line-clamp-2" title={seatsLabel || ""}>
                                {seatsLabel || "—"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                              {Array.isArray(item.selected_dates) && item.selected_dates.length
                                ? item.selected_dates.map((value) => formatDateUS(value)).join(", ")
                                : "-"}
                            </td>
                            <td className="px-3 py-2.5 text-right whitespace-nowrap text-slate-600">
                              {formatCurrency(item.total_amount || 0)}
                            </td>
                            <BookingPaymentStatusCell booking={item} />
                            <BookingAmountPaidCell booking={item} className="px-3 py-2.5 text-right text-slate-600" />
                            <BookingStripeRefCell booking={item} className="px-3 py-2.5 text-slate-600" />
                            <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                              {item.created_at ? formatDateUS(String(item.created_at).slice(0, 10)) : "-"}
                            </td>
                          </tr>
                          );
                        })
                      : null}
                  </tbody>
                </table>
                </ScrollableTableFrame>
              </div>
            </motion.section>
          ) : null}
          </AnimatePresence>
        </section>
      </motion.div>
        </>
      ) : null}

      {isFormOpen
        ? createPortal(
            <div className="fixed inset-0 z-[210] flex items-start justify-center bg-slate-900/45 p-4 sm:items-center">
              <div className="popup-modal hide-scrollbar max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                  <div>
                    <h3 className="text-lg font-semibold">{editingEvent ? "Edit Event Listing" : "Create New Event Listing"}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Add complete event details so attendees can discover and book confidently.
                    </p>
                  </div>
                  <button type="button" onClick={closeForm} className="text-sm font-semibold text-slate-500 hover:text-slate-700">
                    Close
                  </button>
                </div>

                <form ref={formPanelRef} noValidate onSubmit={submitForm} className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 sm:col-span-2">
                  {error}
                </div>
              ) : null}
              {success ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 sm:col-span-2">
                  {success}
                </div>
              ) : null}
              <FormField label="Event Title" hint="Use a clear title attendees can instantly understand." example="Summer Startup Mixer" className="sm:col-span-2">
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <FormField label="Description" hint="Describe the experience, audience, and key value." example="Founder networking with live panel and Q&A." className="sm:col-span-2">
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <FormField label="Schedule Type" hint="Select how attendees can pick event dates." className="sm:col-span-2">
                <FilterPopupField
                  label="Schedule"
                  value={scheduleTypeLabel}
                  isActive={activeFormPanel === "schedule"}
                  onToggle={(e) => {
                    e.stopPropagation();
                    setActiveFormPanel((prev) => (prev === "schedule" ? null : "schedule"));
                  }}
                  usePortal={false}
                  panelClassName="w-full min-w-[260px]"
                  panelContent={
                    <div className="space-y-1">
                      {[
                        { value: "single", label: "Single Date Event" },
                        { value: "multiple", label: "Multiple Dates Event" },
                        { value: "range", label: "Date Range Event" }
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, schedule_type: item.value }));
                            setActiveFormPanel(null);
                          }}
                          className="flex w-full items-center rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  }
                />
              </FormField>
              {form.schedule_type === "single" ? (
                <FormField label="Event Date" hint="Choose the primary date for this event." className="sm:col-span-2">
                  <FilterPopupField
                    label="Date"
                    value={form.event_date ? formatDateUS(form.event_date) : "Select event date"}
                    isActive={activeFormPanel === "event_date"}
                    onToggle={(e) => {
                      e.stopPropagation();
                      setActiveFormPanel((prev) => (prev === "event_date" ? null : "event_date"));
                    }}
                    usePortal={false}
                    panelClassName="w-fit max-w-[calc(100vw-2rem)]"
                    panelContent={
                      <AirbnbDatePickerPanel
                        value={form.event_date}
                        onChange={(next) => setForm((prev) => ({ ...prev, event_date: next }))}
                        closeOnSelect
                        onClose={() => setActiveFormPanel(null)}
                      />
                    }
                  />
                </FormField>
              ) : null}
              {form.schedule_type === "multiple" ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                  <p className="text-sm font-semibold text-slate-900">Select Multiple Dates</p>
                  <p className="mt-0.5 text-xs text-slate-500">Click dates in the calendar to add or remove them.</p>
                  <div className="mt-3 overflow-x-auto">
                    <DatePicker
                      inline
                      selected={parseDateValue(form.event_dates[0])}
                      onChange={(date) => {
                        if (!date) {
                          return;
                        }
                        const value = formatDateValue(date);
                        setForm((prev) => {
                          const exists = prev.event_dates.includes(value);
                          const nextDates = exists
                            ? prev.event_dates.filter((item) => item !== value)
                            : [...prev.event_dates, value].sort();
                          return {
                            ...prev,
                            event_dates: nextDates
                          };
                        });
                      }}
                      minDate={new Date()}
                      monthsShown={2}
                      dayClassName={(date) =>
                        form.event_dates.includes(formatDateValue(date)) ? "multi-selected-day" : undefined
                      }
                      calendarClassName="airbnb-calendar"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {form.event_dates.length ? (
                      form.event_dates.map((dateItem) => (
                        <button
                          key={dateItem}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              event_dates: prev.event_dates.filter((item) => item !== dateItem)
                            }))
                          }
                          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          {formatDateUS(dateItem)} ×
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No dates selected yet.</p>
                    )}
                  </div>
                </div>
              ) : null}
              {form.schedule_type === "range" ? (
                <>
                  <FormField label="Start Date" hint="Beginning date of the event range.">
                    <FilterPopupField
                      label="Start Date"
                      value={form.event_start_date ? formatDateUS(form.event_start_date) : "Select start date"}
                      isActive={activeFormPanel === "event_start_date"}
                      onToggle={(e) => {
                        e.stopPropagation();
                        setActiveFormPanel((prev) => (prev === "event_start_date" ? null : "event_start_date"));
                      }}
                      usePortal={false}
                      panelClassName="w-fit max-w-[calc(100vw-2rem)]"
                      panelContent={
                        <AirbnbDatePickerPanel
                          value={form.event_start_date}
                          onChange={(next) => setForm((prev) => ({ ...prev, event_start_date: next }))}
                          closeOnSelect
                          onClose={() => setActiveFormPanel(null)}
                        />
                      }
                    />
                  </FormField>
                  <FormField label="End Date" hint="Ending date of the event range.">
                    <FilterPopupField
                      label="End Date"
                      value={form.event_end_date ? formatDateUS(form.event_end_date) : "Select end date"}
                      isActive={activeFormPanel === "event_end_date"}
                      onToggle={(e) => {
                        e.stopPropagation();
                        setActiveFormPanel((prev) => (prev === "event_end_date" ? null : "event_end_date"));
                      }}
                      usePortal={false}
                      panelClassName="w-fit max-w-[calc(100vw-2rem)]"
                      panelContent={
                        <AirbnbDatePickerPanel
                          value={form.event_end_date}
                          onChange={(next) => setForm((prev) => ({ ...prev, event_end_date: next }))}
                          closeOnSelect
                          onClose={() => setActiveFormPanel(null)}
                        />
                      }
                    />
                  </FormField>
                </>
              ) : null}
              <FormField label="Event Time" hint="Optional event start time." example="18:30">
                <input
                  type="time"
                  value={form.event_time}
                  onChange={(e) => setForm((prev) => ({ ...prev, event_time: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                <p className="text-sm font-semibold text-slate-900">Event Location</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField label="Venue Name" hint="Name of the venue where event is hosted." example="Downtown Convention Center" className="sm:col-span-2">
                    <input
                      required
                      value={form.venue_name}
                      onChange={(e) => setForm((prev) => ({ ...prev, venue_name: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField label="Venue Address" hint="Street address for map and navigation." example="456 Market Street, San Francisco" className="sm:col-span-2">
                    <input
                      value={form.venue_address}
                      onChange={(e) => setForm((prev) => ({ ...prev, venue_address: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField label="Google Maps Link" hint="Optional direct map URL for the event location." example="https://maps.google.com/..." className="sm:col-span-2">
                    <input
                      type="url"
                      value={form.google_maps_link}
                      onChange={(e) => setForm((prev) => ({ ...prev, google_maps_link: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                    />
                  </FormField>
                </div>
              </div>
              <FormField label="City" hint="City where this event is being held.">
                <FilterPopupField
                  label="City"
                  value={selectedCityLabel}
                  isActive={activeFormPanel === "city"}
                  onToggle={(e) => {
                    e.stopPropagation();
                    setActiveFormPanel((prev) => (prev === "city" ? null : "city"));
                  }}
                  usePortal={false}
                  panelClassName="w-full min-w-[240px]"
                  panelContent={
                    <div className="hide-scrollbar max-h-56 space-y-0.5 overflow-y-auto pr-1">
                      {cities.map((city) => (
                        <button
                          key={city.value}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, city_id: String(city.value) }));
                            setActiveFormPanel(null);
                          }}
                          className="flex w-full items-center rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          {city.label}
                        </button>
                      ))}
                    </div>
                  }
                />
              </FormField>
              <FormField label="Category" hint="Choose the best matching event category.">
                <FilterPopupField
                  label="Category"
                  value={selectedCategoryLabel}
                  isActive={activeFormPanel === "category"}
                  onToggle={(e) => {
                    e.stopPropagation();
                    setActiveFormPanel((prev) => (prev === "category" ? null : "category"));
                  }}
                  usePortal={false}
                  panelClassName="w-full min-w-[240px]"
                  panelContent={
                    <div className="hide-scrollbar max-h-56 space-y-0.5 overflow-y-auto pr-1">
                      {categories.map((category) => (
                        <button
                          key={category.value}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, category_id: String(category.value) }));
                            setActiveFormPanel(null);
                          }}
                          className="flex w-full items-center rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          {category.label}
                        </button>
                      ))}
                    </div>
                  }
                />
              </FormField>
              <FormField
                label="Where tickets are sold"
                hint={
                  showPlatformTicketOptions
                    ? "Choose whether guests buy on an external ticketing page or book directly on this site."
                    : "List an external ticket link, or request on-site sales through Book My Tickets."
                }
                className="sm:col-span-2"
              >
                {showPlatformTicketOptions ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 ring-1 ring-slate-900/[0.04]">
                      <input
                        type="radio"
                        name="ticket_sales_mode"
                        value="external"
                        checked={(form.ticket_sales_mode || "external") === "external"}
                        disabled={editingPlatformEvent && !canSellPlatformTickets}
                        onChange={() =>
                          setForm((prev) => ({
                            ...prev,
                            ticket_sales_mode: "external"
                          }))
                        }
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">External site</span>
                        <span className="mt-0.5 block text-xs text-slate-600">
                          Link out to Eventbrite, Ticketmaster, your own checkout, etc.
                        </span>
                      </span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 ring-1 ring-slate-900/[0.04]">
                      <input
                        type="radio"
                        name="ticket_sales_mode"
                        value="platform"
                        checked={(form.ticket_sales_mode || "external") === "platform"}
                        onChange={() =>
                          setForm((prev) => ({
                            ...prev,
                            ticket_sales_mode: "platform",
                            ticket_link: ""
                          }))
                        }
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">On this site</span>
                        <span className="mt-0.5 block text-xs text-slate-600">
                          Guests book through checkout on the public event page after approval.
                        </span>
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 ring-1 ring-slate-900/[0.04]">
                      <input type="radio" name="ticket_sales_mode" value="external" checked readOnly className="mt-1" />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">External site</span>
                        <span className="mt-0.5 block text-xs text-slate-600">
                          Link out to your ticketing provider (default for new events).
                        </span>
                      </span>
                    </label>
                    <div className="rounded-xl border border-brand-200 bg-brand-50/80 px-4 py-3 text-sm text-slate-800">
                      <p className="font-semibold text-slate-900">Do you want to host your event on Book My Tickets?</p>
                      <p className="mt-1 text-slate-700">
                        Sell tickets on our site with checkout, seat counts, and analytics. Submit a short request — we
                        review and enable on-site sales for your account.
                      </p>
                      <button
                        type="button"
                        onClick={openPlatformTicketRequest}
                        className="mt-3 inline-flex rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                      >
                        Send hosting request
                      </button>
                    </div>
                  </div>
                )}
                {editingPlatformEvent && !canSellPlatformTickets ? (
                  <p className="mt-2 text-xs text-slate-600">
                    This event uses on-site checkout. Use{" "}
                    <button
                      type="button"
                      onClick={openPlatformTicketRequest}
                      className="font-semibold text-brand-700 underline-offset-2 hover:underline"
                    >
                      Send hosting request
                    </button>{" "}
                    if you need to change ticket settings.
                  </p>
                ) : null}
              </FormField>
              {(form.ticket_sales_mode || "external") === "external" ? (
                <FormField
                  label="Ticket link"
                  hint="Required for external sales. Paste the full URL to your ticketing page."
                  example="https://tickets.example.com/event-123"
                  className="sm:col-span-2"
                >
                  <input
                    type="url"
                    value={form.ticket_link}
                    onChange={(e) => setForm((prev) => ({ ...prev, ticket_link: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
              ) : null}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:col-span-2">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={Boolean(form.is_yay_deal_event)}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        is_yay_deal_event: e.target.checked,
                        deal_event_discount_code: e.target.checked ? prev.deal_event_discount_code : ""
                      }))
                    }
                    className="mt-1 h-4 w-4 rounded border-amber-300 text-slate-900 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-900">Exclusive deal event</span>
                    <p className="mt-1 text-xs text-slate-600">
                      Mark this as a premium deal-style listing. Guests will need to log in to see full details and the
                      discount code on the public events page.
                    </p>
                  </div>
                </label>
                {form.is_yay_deal_event ? (
                  <div className="mt-4">
                    <FormField
                      label="Discount code"
                      hint="Shown to logged-in visitors on the event page (not visible to guests)."
                      example="SAVE20"
                    >
                      <input
                        value={form.deal_event_discount_code}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, deal_event_discount_code: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                        placeholder="Enter code"
                        autoComplete="off"
                      />
                    </FormField>
                  </div>
                ) : null}
              </div>
              {(form.ticket_sales_mode || "external") === "platform" ? (
                <EventTicketLevelsEditor
                  levels={form.ticket_levels}
                  onChange={(ticket_levels) => setForm((prev) => ({ ...prev, ticket_levels }))}
                />
              ) : (
                <FormField label="Price (USD)" hint="Enter ticket price per person." example="29.99">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
              )}
              {(form.ticket_sales_mode || "external") === "platform" ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2">
                    <p className="text-sm font-semibold text-slate-900">Seated and Non Seated Event</p>
                    <p className="mt-1 text-xs text-slate-600">
                      Non seated events use quantity pickers. Seated events open an interactive seat map for buyers.
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
                        <input
                          type="radio"
                          name="seating_mode"
                          checked={normalizeSeatingMode(form.seating_mode) === SEATING_MODES.GENERAL}
                          onChange={() =>
                            setForm((prev) => ({ ...prev, seating_mode: SEATING_MODES.GENERAL }))
                          }
                          className="mt-1"
                        />
                        <span>
                          <span className="block text-sm font-medium text-slate-900">Non Seated Event</span>
                          <span className="block text-xs text-slate-500">Guests pick ticket quantities by tier.</span>
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
                        <input
                          type="radio"
                          name="seating_mode"
                          checked={normalizeSeatingMode(form.seating_mode) === SEATING_MODES.RESERVED}
                          onChange={() =>
                            setForm((prev) => ({ ...prev, seating_mode: SEATING_MODES.RESERVED }))
                          }
                          className="mt-1"
                        />
                        <span>
                          <span className="block text-sm font-medium text-slate-900">Seated Event</span>
                          <span className="block text-xs text-slate-500">Guests choose specific seats on a chart.</span>
                        </span>
                      </label>
                    </div>
                    {normalizeSeatingMode(form.seating_mode) === SEATING_MODES.RESERVED ? (
                      <div className="mt-3 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            disabled={!editingEvent?.id}
                            onClick={() => setSeatingModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            <LayoutGrid className="h-4 w-4" />
                            Design seating chart
                          </button>
                          <button
                            type="button"
                            disabled={!editingEvent?.id || !editingEvent?.seatsio_event_key}
                            onClick={() => setSeatingChannelsModalOpen(true)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 disabled:opacity-50"
                          >
                            <GitBranch className="h-4 w-4" />
                            Manage channels
                          </button>
                          {!editingEvent?.id ? (
                            <p className="text-xs text-amber-800">Save the event first, then design the chart.</p>
                          ) : editingEvent?.seatsio_event_key ? (
                            <p className="text-xs text-emerald-700">Seating chart linked.</p>
                          ) : (
                            <p className="text-xs text-slate-500">Chart not saved yet.</p>
                          )}
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
                          <p className="font-semibold text-slate-900">Correct tier mapping</p>
                          <p className="mt-1">
                            Keep ticket level, chart categories, and seat label prefixes aligned.
                          </p>
                          <div className="mt-2 space-y-1">
                            <p>Level 1 - Category 1 - e.g. (Platinum)</p>
                            <p>Level 2 - Category 2 - e.g. (Gold)</p>
                            <p>Level 3 - Category 3 - e.g. (Silver) and so on.</p>
                          </div>
                          <p className="mt-2 text-slate-500">
                            Example: if the ticket tier is Platinum, name seats like Platinum-A-14 and assign those
                            seats to the Platinum chart category.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {normalizeSeatingMode(form.seating_mode) !== SEATING_MODES.RESERVED ? (
                    <FormField
                      label="Total seats available"
                      hint="Maximum tickets guests can book on this site across all reservations. Booked seats update automatically."
                      example="250"
                      className="sm:col-span-2"
                    >
                      <input
                        type="number"
                        min={1}
                        max={50000}
                        step={1}
                        required
                        value={form.total_seats}
                        onChange={(e) => setForm((prev) => ({ ...prev, total_seats: e.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                        placeholder="e.g. 200"
                      />
                    </FormField>
                  ) : null}
                  {normalizeSeatingMode(form.seating_mode) !== SEATING_MODES.RESERVED ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 sm:col-span-2">
                      Guests book through checkout on the public event page once approved. Seat count includes confirmed
                      bookings and short-term coupon holds.
                    </div>
                  ) : null}
                </>
              ) : null}
              <FormField
                label="Duration"
                hint="How long the event runs. Use hours and optional minutes (e.g. 2 hr 30 min)."
                example="2 hours, 30 minutes"
              >
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    max="168"
                    placeholder="Hours"
                    value={form.duration_hours}
                    onChange={(e) => setForm((prev) => ({ ...prev, duration_hours: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="Minutes"
                    value={form.duration_minutes}
                    onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>
              </FormField>
              <FormField label="Age Limit" hint="Set attendee age guidance for safety and clarity.">
                <FilterPopupField
                  label="Age"
                  value={form.age_limit || "All Ages"}
                  isActive={activeFormPanel === "age_limit"}
                  onToggle={(e) => {
                    e.stopPropagation();
                    setActiveFormPanel((prev) => (prev === "age_limit" ? null : "age_limit"));
                  }}
                  usePortal={false}
                  panelClassName="w-full min-w-[220px]"
                  panelContent={
                    <div className="space-y-0.5">
                      {["All Ages", "5 yrs +", "12 yrs +", "18 yrs +"].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, age_limit: item }));
                            setActiveFormPanel(null);
                          }}
                          className="flex w-full items-center rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  }
                />
              </FormField>
              <FormField label="Languages" hint="List spoken languages separated by commas." example="English, Spanish" className="sm:col-span-2">
                <input
                  value={form.languages}
                  onChange={(e) => setForm((prev) => ({ ...prev, languages: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <FormField label="Genres" hint="Add genres or themes separated by commas." example="Jazz, Soul, R&B" className="sm:col-span-2">
                <input
                  value={form.genres}
                  onChange={(e) => setForm((prev) => ({ ...prev, genres: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <FormField
                label="Cover image"
                hint={`Upload the main banner (shown first). ${LISTING_BANNER_IMAGE_HINT} Optional gallery images below power the detail-page slideshow.`}
                className="sm:col-span-2"
              >
                <CloudinaryImageInput
                  value={form.image_url}
                  onChange={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
                  disabled={saving}
                />
              </FormField>
              <div className="space-y-2 sm:col-span-2">
                <FormField
                  label="Additional banner images"
                  hint="Up to 12 extra photos for the event page carousel (same cover is not duplicated on save)."
                  className="!mb-0"
                >
                  <div className="space-y-2">
                    {(form.gallery_image_urls || []).map((row, idx) => (
                      <div key={`gal-${idx}`} className="flex gap-2">
                        <CloudinaryImageInput
                          compact
                          value={row}
                          onChange={(url) =>
                            setForm((prev) => {
                              const next = [...(prev.gallery_image_urls || [])];
                              next[idx] = url;
                              return { ...prev, gallery_image_urls: next };
                            })
                          }
                          disabled={saving}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              gallery_image_urls: (prev.gallery_image_urls || []).filter((_, i) => i !== idx)
                            }))
                          }
                          className="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      disabled={(form.gallery_image_urls || []).length >= 12}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          gallery_image_urls: [...(prev.gallery_image_urls || []), ""]
                        }))
                      }
                      className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      + Add gallery image
                    </button>
                  </div>
                </FormField>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <FormField
                  label="YouTube promo videos"
                  hint="Optional. Up to 6 YouTube links shown as a promo slider for registered users (guests are prompted to login)."
                  className="!mb-0"
                >
                  <div className="space-y-2">
                    {(form.promo_video_urls || []).map((row, idx) => (
                      <div key={`promo-vid-${idx}`} className="flex gap-2">
                        <input
                          type="url"
                          value={row}
                          onChange={(e) =>
                            setForm((prev) => {
                              const next = [...(prev.promo_video_urls || [])];
                              next[idx] = e.target.value;
                              return { ...prev, promo_video_urls: next };
                            })
                          }
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                          disabled={saving}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              promo_video_urls: (prev.promo_video_urls || []).filter((_, i) => i !== idx)
                            }))
                          }
                          className="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      disabled={(form.promo_video_urls || []).length >= MAX_PROMO_VIDEOS}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          promo_video_urls: [...(prev.promo_video_urls || []), ""]
                        }))
                      }
                      className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      + Add YouTube video
                    </button>
                  </div>
                </FormField>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                <p className="text-sm font-semibold text-slate-900">Event Highlights</p>
                <p className="mt-1 text-xs text-slate-500">Select all highlights that apply to this event.</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {eventHighlightOptions.map((option) => {
                    const isSelected = form.event_highlights.includes(option);
                    return (
                      <label
                        key={option}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setForm((prev) => ({
                              ...prev,
                              event_highlights: e.target.checked
                                ? [...prev.event_highlights, option]
                                : prev.event_highlights.filter((item) => item !== option)
                            }));
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : editingEvent ? "Update Event" : "Submit Event"}
                </button>
              </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}

      {isDeleteOpen
        ? createPortal(
            <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/45 p-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                <h3 className="text-lg font-semibold text-slate-900">Delete Event Listing</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteOpen(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    disabled={saving}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <PostSubmitFeedbackDialog
        open={postSubmitFeedback != null}
        title={postSubmitFeedback?.title ?? ""}
        description={postSubmitFeedback?.description ?? ""}
      />

      <OrganizerSeatingDesignerModal
        open={seatingModalOpen}
        onClose={() => setSeatingModalOpen(false)}
        eventId={editingEvent?.id}
        eventTitle={editingEvent?.title || form.title}
        onSaved={(saved) => {
          setEditingEvent((prev) =>
            prev
              ? {
                  ...prev,
                  seating_mode: saved?.seating_mode || SEATING_MODES.RESERVED,
                  seatsio_chart_key: saved?.chart_key || prev.seatsio_chart_key,
                  seatsio_event_key: saved?.event_key || prev.seatsio_event_key
                }
              : prev
          );
          loadEvents();
        }}
      />
      <OrganizerSeatingChannelsModal
        open={seatingChannelsModalOpen}
        onClose={() => setSeatingChannelsModalOpen(false)}
        eventId={editingEvent?.id}
        eventTitle={editingEvent?.title || form.title}
      />
    </>
  );
});

OrganizerDashboardPage.displayName = "OrganizerDashboardPage";

export default OrganizerDashboardPage;
