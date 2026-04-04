import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import { FiBell, FiCalendar, FiInfo, FiMapPin, FiTrash2, FiUsers } from "react-icons/fi";
import AdminSidebar from "../components/AdminSidebar";
import AdminCommunicationsSection from "../components/AdminCommunicationsSection";
import AnalyticsCards from "../components/AnalyticsCards";
import AdminFilters from "../components/AdminFilters";
import AdminListingsTable from "../components/AdminListingsTable";
import AirbnbDatePickerPanel from "../components/AirbnbDatePickerPanel";
import FilterPopupField from "../components/FilterPopupField";
import { categories } from "../utils/filterOptions";
import {
  activateTeamUser,
  createTeamUser,
  deactivateTeamUser,
  deleteAdminListing,
  editAdminListing,
  fetchAdminAnalytics,
  fetchAdminListings,
  fetchAdminBookings,
  fetchAdminUsers,
  exportAdminBookings,
  fetchAdminNewsletterSubscribers,
  syncAdminNewsletterSubscribersToMailchimp,
  deleteAdminNewsletterSubscriber,
  exportAdminNewsletterSubscribers,
  fetchAdminContactMessages,
  exportAdminContactMessages,
  fetchAdminNotifications,
  fetchTeamUsers,
  deleteAdminNotification,
  deleteAdminUser,
  markAdminNotificationsRead,
  updateTeamUserCapabilities,
  updateAdminListingStatus
} from "../services/adminService";
import { downloadBlob } from "../utils/fileDownload";
import { formatCurrency, formatDateUS } from "../utils/format";
import useCityFilter from "../hooks/useCityFilter";
import { useRouteContentReady } from "../context/RouteContentReadyContext";

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

function parseEventDates(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).slice(0, 10)).filter(Boolean);
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).slice(0, 10)).filter(Boolean) : [];
  } catch (_err) {
    return [];
  }
}

function parseInfluencerSocialLinks(value) {
  if (!value) {
    return { instagram: "", youtube: "" };
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return {
      instagram: String(value.instagram || "").trim(),
      youtube: String(value.youtube || "").trim()
    };
  }
  try {
    const parsed = JSON.parse(value);
    return {
      instagram: String(parsed?.instagram || "").trim(),
      youtube: String(parsed?.youtube || "").trim()
    };
  } catch (_err) {
    return { instagram: "", youtube: "" };
  }
}

function hasDisplayValue(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (value === null || value === undefined) {
    return false;
  }
  return String(value).trim() !== "";
}

function getScheduleTypeLabel(scheduleType) {
  if (scheduleType === "multiple") {
    return "Multiple Dates Event";
  }
  if (scheduleType === "range") {
    return "Date Range Event";
  }
  return "Single Date Event";
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

function PopupSelect({ value, onChange, options = [], placeholder = "Select option" }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
    >
      <option value="">{placeholder}</option>
      {options.map((item) => (
        <option key={String(item.value)} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

function PopupDateField({ value, onChange, placeholder = "Select date" }) {
  return (
    <input
      type="date"
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
    />
  );
}

function getNotificationEntityLabel(entityType) {
  const value = String(entityType || "").toLowerCase();
  if (value === "events" || value === "event") return "Events";
  if (value === "deals" || value === "deal") return "Deals";
  if (value === "influencers" || value === "influencer") return "Influencers";
  if (value === "dealers" || value === "dealer") return "Dealers";
  if (value === "contact") return "Contact";
  if (value === "newsletter") return "Newsletter";
  return "General";
}

function AdminDashboardPage() {
  const { cities } = useCityFilter();
  const [activeSection, setActiveSection] = useState("overview");
  const [stats, setStats] = useState({});
  const [rows, setRows] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [teamRole, setTeamRole] = useState("organizer");
  const [teamRows, setTeamRows] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [usersRows, setUsersRows] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: "",
    email: "",
    mobile_number: "",
    password: "",
    role: "organizer"
  });
  const [teamMessage, setTeamMessage] = useState("");
  const [teamError, setTeamError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [allNotificationsOpen, setAllNotificationsOpen] = useState(false);
  const [deletingNotificationId, setDeletingNotificationId] = useState(null);
  const [creatingTeamUser, setCreatingTeamUser] = useState(false);
  const [savingCapabilitiesForUserId, setSavingCapabilitiesForUserId] = useState(null);
  const [filters, setFilters] = useState({
    date: "",
    city: "",
    category: ""
  });
  const [appliedFilters, setAppliedFilters] = useState({
    date: "",
    city: "",
    category: ""
  });
  const [editingListing, setEditingListing] = useState(null);
  const [editingListingType, setEditingListingType] = useState("events");
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [reviewListing, setReviewListing] = useState(null);
  const [reviewListingType, setReviewListingType] = useState("events");
  const [reviewForm, setReviewForm] = useState({});
  const [reviewEditing, setReviewEditing] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [rejectListing, setRejectListing] = useState(null);
  const [rejectListingType, setRejectListingType] = useState("events");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSaving, setRejectSaving] = useState(false);
  const [rejectError, setRejectError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [viewListing, setViewListing] = useState(null);
  const [viewListingType, setViewListingType] = useState("events");
  const [bookingRows, setBookingRows] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingFilters, setBookingFilters] = useState({
    event_id: "",
    organizer_id: "",
    city: "",
    date: ""
  });
  const [bookingEventQuery, setBookingEventQuery] = useState("");
  const [bookingCityQuery, setBookingCityQuery] = useState("");
  const bookingFilterRef = useRef(null);
  const [activeBookingPanel, setActiveBookingPanel] = useState(null);
  const [commTab, setCommTab] = useState("newsletter");
  const [newsletterPage, setNewsletterPage] = useState(1);
  const [contactPage, setContactPage] = useState(1);
  const [newsletterRows, setNewsletterRows] = useState([]);
  const [newsletterPagination, setNewsletterPagination] = useState({});
  const [contactRows, setContactRows] = useState([]);
  const [contactPagination, setContactPagination] = useState({});
  const [loadingNewsletter, setLoadingNewsletter] = useState(false);
  const [loadingContact, setLoadingContact] = useState(false);
  const [syncingNewsletterMailchimp, setSyncingNewsletterMailchimp] = useState(false);
  const [deletingNewsletterId, setDeletingNewsletterId] = useState(null);
  const perPageMobile = 5;
  const [mobileBookingsPage, setMobileBookingsPage] = useState(1);
  const [mobileUsersPage, setMobileUsersPage] = useState(1);
  const [mobileTeamPage, setMobileTeamPage] = useState(1);
  const chipsRef = useRef(null);
  const [chipsProgress, setChipsProgress] = useState(0);
  const canApplyAdminFilters =
    filters.date !== appliedFilters.date ||
    filters.city !== appliedFilters.city ||
    filters.category !== appliedFilters.category;

  const adminRouteBusy = useMemo(() => {
    const statsBusy = loadingStats;
    if (activeSection === "bookings") {
      return statsBusy || loadingBookings;
    }
    if (activeSection === "users") {
      return statsBusy || loadingUsers;
    }
    if (activeSection === "team") {
      return statsBusy || loadingTeam;
    }
    if (activeSection === "communications") {
      return statsBusy || (commTab === "newsletter" ? loadingNewsletter : loadingContact);
    }
    return statsBusy || loadingRows;
  }, [
    activeSection,
    commTab,
    loadingStats,
    loadingRows,
    loadingBookings,
    loadingUsers,
    loadingTeam,
    loadingNewsletter,
    loadingContact
  ]);

  useRouteContentReady(adminRouteBusy);

  useEffect(() => {
    setMobileBookingsPage(1);
    setMobileUsersPage(1);
    setMobileTeamPage(1);
  }, [activeSection]);

  useEffect(() => {
    setMobileTeamPage(1);
  }, [teamRole]);

  useEffect(() => {
    const el = chipsRef.current;
    if (!el) return undefined;

    const update = () => {
      const max = Math.max(1, el.scrollWidth - el.clientWidth);
      const next = Math.min(1, Math.max(0, el.scrollLeft / max));
      setChipsProgress(next);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const onDocClick = (event) => {
      if (event.target?.closest?.("[data-filter-popup-portal='true']")) {
        return;
      }
      if (!bookingFilterRef.current?.contains(event.target)) {
        setActiveBookingPanel(null);
      }
    };
    window.addEventListener("click", onDocClick);
    return () => window.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    if (!reviewListing && !editingListing && !viewListing) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [reviewListing, editingListing, viewListing]);

  const listingType = useMemo(() => {
    if (["overview", "team", "communications", "bookings", "users"].includes(activeSection)) {
      return "events";
    }
    return activeSection;
  }, [activeSection]);

  const loadAnalytics = async () => {
    try {
      setLoadingStats(true);
      const response = await fetchAdminAnalytics({
        date: appliedFilters.date || undefined,
        city: appliedFilters.city || undefined,
        category: appliedFilters.category || undefined
      });
      setStats(response?.data || {});
    } finally {
      setLoadingStats(false);
    }
  };

  const loadListings = async () => {
    try {
      setLoadingRows(true);
      const response = await fetchAdminListings({
        type: listingType,
        date: appliedFilters.date || undefined,
        city: appliedFilters.city || undefined,
        category: appliedFilters.category || undefined
      });
      setRows(response?.data || []);
    } finally {
      setLoadingRows(false);
    }
  };

  const loadTeam = async () => {
    try {
      setLoadingTeam(true);
      const response = await fetchTeamUsers(teamRole);
      setTeamRows(response?.data || []);
    } finally {
      setLoadingTeam(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await fetchAdminUsers();
      setUsersRows(response?.data || []);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadBookings = async () => {
    try {
      setLoadingBookings(true);
      const response = await fetchAdminBookings({
        event_id: bookingFilters.event_id || undefined,
        organizer_id: bookingFilters.organizer_id || undefined,
        city: bookingFilters.city || undefined,
        date: bookingFilters.date || undefined
      });
      setBookingRows(response?.data || []);
    } finally {
      setLoadingBookings(false);
    }
  };

  const loadNewsletterSubscribers = async (page = newsletterPage) => {
    try {
      setLoadingNewsletter(true);
      const response = await fetchAdminNewsletterSubscribers({ page, limit: 20 });
      setNewsletterRows(response?.data || []);
      setNewsletterPagination(response?.pagination || {});
    } finally {
      setLoadingNewsletter(false);
    }
  };

  const loadContactMessages = async (page = contactPage) => {
    try {
      setLoadingContact(true);
      const response = await fetchAdminContactMessages({ page, limit: 20 });
      setContactRows(response?.data || []);
      setContactPagination(response?.pagination || {});
    } finally {
      setLoadingContact(false);
    }
  };

  const loadNotifications = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoadingNotifications(true);
      }
      const response = await fetchAdminNotifications({ limit: 200 });
      if (!silent || notificationsOpen || allNotificationsOpen) {
        setNotifications(response?.data || []);
      }
      setNotificationsUnread(Number(response?.unread || 0));
    } finally {
      if (!silent) {
        setLoadingNotifications(false);
      }
    }
  };

  const handleDeleteNotification = async (id) => {
    if (!Number.isFinite(Number(id))) {
      return;
    }
    try {
      setDeletingNotificationId(Number(id));
      const response = await deleteAdminNotification(Number(id));
      setNotifications((prev) => prev.filter((item) => Number(item.id) !== Number(id)));
      setNotificationsUnread(Number(response?.unread || 0));
    } finally {
      setDeletingNotificationId(null);
    }
  };

  useEffect(() => {
    loadAnalytics();
    if (activeSection === "bookings") {
      loadBookings();
    } else if (activeSection === "users") {
      loadUsers();
    } else if (activeSection === "team") {
      loadTeam();
    } else if (activeSection === "communications") {
      if (commTab === "newsletter") {
        loadNewsletterSubscribers(newsletterPage);
      } else {
        loadContactMessages(contactPage);
      }
    } else {
      loadListings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, listingType, teamRole, appliedFilters, bookingFilters, commTab, newsletterPage, contactPage]);

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    const intervalMs = 15000;

    const tick = () => {
      loadNotifications({ silent: true }).catch(() => {});
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        tick();
      }
    };

    const onFocus = () => {
      tick();
    };

    const id = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsOpen, allNotificationsOpen]);

  const onFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyAdminFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const resetAdminFilters = () => {
    const reset = { date: "", city: "", category: "" };
    setFilters(reset);
    setAppliedFilters(reset);
  };

  const buildEventReviewForm = (item) => ({
    title: item.title || "",
    description: item.description || "",
    city_id: item.city_id ? String(item.city_id) : "",
    category_id: item.category_id ? String(item.category_id) : "",
    event_date: item.event_date ? String(item.event_date).slice(0, 10) : "",
    event_start_date: item.event_start_date ? String(item.event_start_date).slice(0, 10) : "",
    event_end_date: item.event_end_date ? String(item.event_end_date).slice(0, 10) : "",
    event_dates: parseEventDates(item.event_dates || item.event_dates_json),
    event_time: item.event_time ? String(item.event_time).slice(0, 5) : "",
    venue_name: item.venue_name || item.venue || "",
    venue: item.venue || item.venue_name || "",
    venue_address: item.venue_address || "",
    google_maps_link: item.google_maps_link || "",
    ticket_link: item.ticket_link || "",
    image_url: item.image_url || "",
    gallery_image_urls: Array.isArray(item.gallery_image_urls) ? [...item.gallery_image_urls] : [],
    price: item.price ?? "",
    duration_hours: item.duration_hours ?? "",
    age_limit: item.age_limit || "All Ages",
    languages: item.languages || "",
    genres: item.genres || "",
    schedule_type: item.schedule_type || "single",
    event_highlights: parseHighlights(item.event_highlights),
    is_yay_deal_event:
      item.is_yay_deal_event === 1 ||
      item.is_yay_deal_event === true ||
      String(item.is_yay_deal_event || "") === "1",
    deal_event_discount_code: item.deal_event_discount_code || ""
  });

  const buildEventPayloadFromForm = (formValues) => {
    const payload = {};
    Object.entries(formValues).forEach(([key, value]) => {
      if (key === "is_yay_deal_event") {
        payload[key] = Boolean(value);
        return;
      }
      if (value === "" || value === null || value === undefined) {
        return;
      }
      if (["city_id", "category_id", "price", "duration_hours"].includes(key)) {
        payload[key] = Number(value);
        return;
      }
      if (key === "event_highlights" && Array.isArray(value)) {
        payload[key] = value;
        return;
      }
      if (key === "event_dates" && Array.isArray(value)) {
        payload[key] = value;
        return;
      }
      if (key === "gallery_image_urls" && Array.isArray(value)) {
        payload[key] = value.map((u) => String(u || "").trim()).filter(Boolean);
        return;
      }
      payload[key] = typeof value === "string" ? value.trim() : value;
    });
    if (payload.venue_name && !payload.venue) {
      payload.venue = payload.venue_name;
    }
    if (Object.prototype.hasOwnProperty.call(payload, "is_yay_deal_event")) {
      if (!payload.is_yay_deal_event) {
        payload.deal_event_discount_code = null;
      } else {
        payload.deal_event_discount_code = String(formValues.deal_event_discount_code || "").trim() || null;
      }
    }
    return payload;
  };

  const reviewDisplayItems = useMemo(() => {
    if (!reviewListing) {
      return [];
    }

    const items = [];
    const pushText = (label, value) => {
      if (hasDisplayValue(value)) {
        items.push({ label, value: String(value), type: "text" });
      }
    };
    const pushLink = (label, href, text) => {
      if (hasDisplayValue(href)) {
        items.push({ label, href: String(href), value: text, type: "link" });
      }
    };

    pushText("Title", reviewForm.title);
    pushText("Description", reviewForm.description);
    pushText("Schedule Type", getScheduleTypeLabel(reviewForm.schedule_type));
    pushText("Time", reviewForm.event_time);

    if ((reviewForm.schedule_type || "single") === "single") {
      pushText("Event Date", formatDateUS(reviewForm.event_date));
    } else if ((reviewForm.schedule_type || "single") === "multiple") {
      if (Array.isArray(reviewForm.event_dates) && reviewForm.event_dates.length) {
        pushText("Selected Dates", reviewForm.event_dates.map((value) => formatDateUS(value)).join(", "));
      }
    } else if ((reviewForm.schedule_type || "single") === "range") {
      const hasStart = hasDisplayValue(reviewForm.event_start_date);
      const hasEnd = hasDisplayValue(reviewForm.event_end_date);
      if (hasStart || hasEnd) {
        pushText(
          "Date Range",
          `${hasStart ? formatDateUS(reviewForm.event_start_date) : "Not provided"} to ${
            hasEnd ? formatDateUS(reviewForm.event_end_date) : "Not provided"
          }`
        );
      }
    }

    pushText("City", cities.find((city) => city.value === reviewForm.city_id)?.label);
    pushText("Category", categories.find((cat) => cat.value === reviewForm.category_id)?.label);
    pushText("Venue", reviewForm.venue_name);
    pushText("Venue Address", reviewForm.venue_address);
    if (hasDisplayValue(reviewForm.price)) {
      pushText("Price", formatCurrency(Number(reviewForm.price || 0)));
    }
    if (hasDisplayValue(reviewForm.duration_hours)) {
      pushText("Duration", `${reviewForm.duration_hours} hour(s)`);
    }
    pushText("Age Limit", reviewForm.age_limit);
    pushText("Languages", reviewForm.languages);
    pushText("Genres", reviewForm.genres);
    if (Array.isArray(reviewForm.event_highlights) && reviewForm.event_highlights.length) {
      pushText("Event Highlights", reviewForm.event_highlights.join(", "));
    }
    items.push({
      label: "Yay! Deal Event",
      value: reviewForm.is_yay_deal_event ? "Yes" : "No",
      type: "text"
    });
    if (reviewForm.is_yay_deal_event) {
      pushText("Discount code", hasDisplayValue(reviewForm.deal_event_discount_code) ? reviewForm.deal_event_discount_code : "—");
    }
    pushLink("Google Maps", reviewForm.google_maps_link, "Open Map");
    pushLink("Ticket Link", reviewForm.ticket_link, "Open Ticket Page");
    pushLink("Image", reviewForm.image_url, "View Image");
    if (Array.isArray(reviewForm.gallery_image_urls)) {
      reviewForm.gallery_image_urls.forEach((url, idx) => {
        pushLink(`Gallery image ${idx + 1}`, url, "View Image");
      });
    }

    return items;
  }, [reviewListing, reviewForm]);

  const handleApprove = async (item) => {
    if (listingType === "events") {
      setReviewListingType("events");
      setReviewListing(item);
      setReviewForm(buildEventReviewForm(item));
      setReviewEditing(false);
      setReviewError("");
      return;
    }
    setViewListingType(listingType);
    setViewListing(item);
  };

  const handleReject = async (item) => {
    setRejectListingType(listingType);
    setRejectListing(item);
    setRejectReason("");
    setRejectError("");
  };

  const handleView = (item) => {
    setViewListingType(listingType);
    setViewListing(item);
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm("Delete this listing?");
    if (!confirmed) {
      return;
    }
    await deleteAdminListing({ type: listingType, id: item.id });
    await loadListings();
    await loadAnalytics();
  };

  const openEditModal = (item) => {
    setEditError("");
    setEditingListingType(listingType);
    setEditingListing(item);
    if (listingType === "events") {
      setEditForm(buildEventReviewForm(item));
      return;
    }
    if (listingType === "deals") {
      setEditForm({
        title: item.title || "",
        description: item.description || "",
        city_id: item.city_id ? String(item.city_id) : "",
        category_id: item.category_id ? String(item.category_id) : "",
        original_price: item.original_price ?? "",
        discounted_price: item.discounted_price ?? "",
        expiry_date: item.expiry_date ? String(item.expiry_date).slice(0, 10) : ""
      });
      return;
    }
    if (listingType === "influencers") {
      const links = parseInfluencerSocialLinks(item.social_links);
      setEditForm({
        name: item.name || "",
        description: item.bio || "",
        city_id: item.city_id ? String(item.city_id) : "",
        category_id: item.category_id ? String(item.category_id) : "",
        instagram: links.instagram || "",
        youtube: links.youtube || "",
        followers_count: item.followers_count != null ? String(item.followers_count) : "",
        youtube_subscribers_count: item.youtube_subscribers_count != null ? String(item.youtube_subscribers_count) : "",
        contact_email: item.contact_email || "",
        profile_image_url: item.profile_image_url || ""
      });
      return;
    }
    if (listingType === "dealers") {
      setEditForm({
        name: item.name || "",
        business_email: item.business_email || "",
        business_mobile: item.business_mobile || "",
        location_text: item.location_text || "",
        description: item.bio || "",
        city_id: item.city_id ? String(item.city_id) : "",
        category_id: item.category_id ? String(item.category_id) : "",
        website_or_social_link: item.website_or_social_link || "",
        profile_image_url: item.profile_image_url || ""
      });
      return;
    }
    setEditForm({
      title: item.title || "",
      description: item.description || "",
      city_id: item.city_id ? String(item.city_id) : "",
      category_id: item.category_id ? String(item.category_id) : "",
      price_min: item.price_min ?? "",
      price_max: item.price_max ?? ""
    });
  };

  const closeEditModal = () => {
    setEditingListing(null);
    setEditingListingType("events");
    setEditForm({});
    setEditError("");
  };

  const closeReviewModal = () => {
    setReviewListing(null);
    setReviewListingType("events");
    setReviewForm({});
    setReviewEditing(false);
    setReviewSaving(false);
    setReviewError("");
    setRejectListing(null);
    setRejectReason("");
    setRejectSaving(false);
    setRejectError("");
  };

  const closeViewModal = () => {
    setViewListing(null);
    setViewListingType("events");
  };

  const closeRejectModal = () => {
    setRejectListing(null);
    setRejectListingType("events");
    setRejectReason("");
    setRejectSaving(false);
    setRejectError("");
  };

  const submitReject = async () => {
    if (!rejectListing) {
      return;
    }
    if (!rejectReason.trim()) {
      setRejectError("Please enter a rejection reason.");
      return;
    }
    setRejectError("");
    try {
      setRejectSaving(true);
      await updateAdminListingStatus({
        type: rejectListingType,
        id: rejectListing.id,
        status: "rejected",
        note: rejectReason.trim()
      });
      closeRejectModal();
      if (reviewListing && Number(reviewListing.id) === Number(rejectListing.id)) {
        closeReviewModal();
      }
      await loadListings();
      await loadAnalytics();
      setAdminMessage(`${rejectListingType.slice(0, -1)} rejected successfully.`);
      window.setTimeout(() => setAdminMessage(""), 3000);
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      const details = err?.response?.data?.details;
      if (Array.isArray(details) && details.length) {
        setRejectError(details.map((item) => item.message).join(" | "));
      } else {
        setRejectError(apiMessage || "Could not reject event. Please try again.");
      }
    } finally {
      setRejectSaving(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingListing) {
      return;
    }

    setEditError("");
    try {
      setEditSaving(true);
      let payload = {};
      if (editingListingType === "events") {
        payload = buildEventPayloadFromForm(editForm);
      } else {
        Object.entries(editForm).forEach(([key, value]) => {
          if (value === "" || value === null || value === undefined) {
            return;
          }
          if (["city_id", "category_id", "price", "original_price", "discounted_price", "price_min", "price_max"].includes(key)) {
            payload[key] = Number(value);
          } else if (key === "description" && ["influencers", "dealers"].includes(editingListingType)) {
            payload.bio = value;
          } else {
            payload[key] = typeof value === "string" ? value.trim() : value;
          }
        });
        delete payload.description;
        if (!["influencers", "dealers"].includes(editingListingType) && editForm.description?.trim()) {
          payload.description = editForm.description.trim();
        }
      }

      await editAdminListing({ type: editingListingType, id: editingListing.id, payload });
      closeEditModal();
      await loadListings();
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      setEditError(apiMessage || "Could not update listing. Please check input values.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleApproveEventFromReview = async () => {
    if (!reviewListing) {
      return;
    }
    setReviewError("");
    try {
      setReviewSaving(true);
      if (reviewEditing) {
        const payload = buildEventPayloadFromForm(reviewForm);
        await editAdminListing({ type: "events", id: reviewListing.id, payload });
      }

      await updateAdminListingStatus({
        type: reviewListingType,
        id: reviewListing.id,
        status: "approved"
      });
      closeReviewModal();
      await loadListings();
      await loadAnalytics();
      closeViewModal();
      setAdminMessage("Approved successfully.");
      window.setTimeout(() => setAdminMessage(""), 3000);
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      setReviewError(apiMessage || "Could not approve event. Please verify details and try again.");
    } finally {
      setReviewSaving(false);
    }
  };

  const handleCreateTeamUser = async (e) => {
    e.preventDefault();
    setTeamMessage("");
    setTeamError("");
    try {
      setCreatingTeamUser(true);
      await createTeamUser({
        ...teamForm,
        name: teamForm.name.trim(),
        email: teamForm.email.trim(),
        mobile_number: teamForm.mobile_number.trim()
      });
      setTeamMessage(`${teamForm.role === "admin" ? "Admin" : "Organizer"} account created successfully.`);
      setTeamForm({
        name: "",
        email: "",
        mobile_number: "",
        password: "",
        role: "organizer"
      });
      await loadTeam();
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      const details = err?.response?.data?.details;
      if (Array.isArray(details) && details.length) {
        const pretty = details
          .map((item) => `${item.path?.replace("body.", "") || "field"}: ${item.message}`)
          .join(" | ");
        setTeamError(pretty);
      } else {
        setTeamError(apiMessage || "Could not create account. Please verify inputs and try again.");
      }
    } finally {
      setCreatingTeamUser(false);
    }
  };

  const handleDeactivate = async (userId) => {
    const confirmed = window.confirm("Deactivate this account?");
    if (!confirmed) {
      return;
    }
    await deactivateTeamUser(userId);
    await loadTeam();
  };

  const handleDeleteUser = async (userId) => {
    const confirmed = window.confirm("Delete this user account permanently?");
    if (!confirmed) {
      return;
    }
    await deleteAdminUser(userId);
    await loadUsers();
    setAdminMessage("User deleted successfully.");
    window.setTimeout(() => setAdminMessage(""), 3000);
  };

  const handleActivate = async (userId) => {
    const confirmed = window.confirm("Activate this account?");
    if (!confirmed) {
      return;
    }
    await activateTeamUser(userId);
    await loadTeam();
  };

  const handleCapabilityToggle = (userId, key, checked) => {
    setTeamRows((prev) =>
      prev.map((item) => (item.id === userId ? { ...item, [key]: checked ? 1 : 0 } : item))
    );
  };

  const handleSaveCapabilities = async (user) => {
    try {
      setSavingCapabilitiesForUserId(user.id);
      await updateTeamUserCapabilities(user.id, {
        can_post_events: Boolean(user.can_post_events),
        can_create_influencer_profile: Boolean(user.can_create_influencer_profile),
        can_post_deals: Boolean(user.can_post_deals)
      });
      setTeamMessage("Capabilities updated successfully.");
      setTeamError("");
      window.setTimeout(() => setTeamMessage(""), 2500);
    } catch (err) {
      setTeamError(err?.response?.data?.message || "Could not update capabilities.");
    } finally {
      setSavingCapabilitiesForUserId(null);
    }
  };

  const exportBookings = async (format) => {
    const result = await exportAdminBookings({
      ...bookingFilters,
      event_id: bookingFilters.event_id || undefined,
      organizer_id: bookingFilters.organizer_id || undefined,
      city: bookingFilters.city || undefined,
      date: bookingFilters.date || undefined,
      format
    });
    downloadBlob(result.blob, `admin-bookings.${format === "excel" ? "xlsx" : "csv"}`);
  };

  const exportNewsletter = async (format) => {
    const result = await exportAdminNewsletterSubscribers({
      format: format === "excel" ? "excel" : "csv"
    });
    downloadBlob(result.blob, `newsletter-subscribers.${format === "excel" ? "xlsx" : "csv"}`);
  };

  const deleteNewsletterSubscriber = async (subscriberId) => {
    if (!Number.isFinite(Number(subscriberId))) {
      return;
    }
    const ok = window.confirm(
      "Remove this row from the newsletter list? This does not delete the user account—only the newsletter subscription record."
    );
    if (!ok) {
      return;
    }
    try {
      setDeletingNewsletterId(Number(subscriberId));
      await deleteAdminNewsletterSubscriber(subscriberId);
      setAdminMessage("Subscriber removed.");
      window.setTimeout(() => setAdminMessage(""), 4000);
      const nextPage =
        newsletterRows.length === 1 && newsletterPage > 1 ? newsletterPage - 1 : newsletterPage;
      if (nextPage !== newsletterPage) {
        setNewsletterPage(nextPage);
      } else {
        await loadNewsletterSubscribers(newsletterPage);
      }
    } catch (err) {
      setAdminMessage(err?.response?.data?.message || "Could not remove subscriber.");
      window.setTimeout(() => setAdminMessage(""), 5000);
    } finally {
      setDeletingNewsletterId(null);
    }
  };

  const syncNewsletterToMailchimp = async () => {
    try {
      setSyncingNewsletterMailchimp(true);
      const result = await syncAdminNewsletterSubscribersToMailchimp();
      const stats = result?.data || {};
      const tail = stats.hint ? ` ${stats.hint}` : "";
      setAdminMessage(
        `Mailchimp sync complete. Synced: ${stats.synced || 0}, Failed: ${stats.failed || 0}, Skipped: ${stats.skipped || 0}.${tail}`
      );
      window.setTimeout(() => setAdminMessage(""), stats.hint ? 14000 : 5000);
    } catch (err) {
      setAdminMessage(err?.response?.data?.message || "Could not sync newsletter subscribers to Mailchimp.");
      window.setTimeout(() => setAdminMessage(""), 5000);
    } finally {
      setSyncingNewsletterMailchimp(false);
    }
  };

  const exportContact = async (format) => {
    const result = await exportAdminContactMessages({
      format: format === "excel" ? "excel" : "csv"
    });
    downloadBlob(result.blob, `contact-messages.${format === "excel" ? "xlsx" : "csv"}`);
  };

  const onCommTabChange = (tab) => {
    setCommTab(tab);
    if (tab === "newsletter") {
      setNewsletterPage(1);
    } else {
      setContactPage(1);
    }
  };

  const bookingEventOptions = useMemo(() => {
    const seen = new Set();
    return bookingRows
      .filter((item) => {
      const key = `${item.event_id}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
      })
      .sort((a, b) => String(a.event_title || "").localeCompare(String(b.event_title || ""), "en", { sensitivity: "base" }));
  }, [bookingRows]);

  const bookingOrganizerOptions = useMemo(() => {
    const seen = new Set();
    return bookingRows
      .filter((item) => {
      const key = `${item.organizer_id}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
      })
      .sort((a, b) =>
        String(a.organizer_name || `Organizer #${a.organizer_id}`).localeCompare(
          String(b.organizer_name || `Organizer #${b.organizer_id}`),
          "en",
          { sensitivity: "base" }
        )
      );
  }, [bookingRows]);
  const filteredBookingEventOptions = useMemo(() => {
    const query = bookingEventQuery.trim().toLowerCase();
    if (!query) {
      return bookingEventOptions;
    }
    return bookingEventOptions.filter((item) => String(item.event_title || "").toLowerCase().includes(query));
  }, [bookingEventOptions, bookingEventQuery]);
  const filteredBookingCities = useMemo(() => {
    const query = bookingCityQuery.trim().toLowerCase();
    if (!query) {
      return cities;
    }
    return cities.filter((city) => city.label.toLowerCase().includes(query));
  }, [bookingCityQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]"
    >
      {/* Desktop sidebar only (mobile uses top chips). */}
      <div className="hidden lg:block">
        <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      </div>

      <section className="space-y-4">
        {/* Mobile / Tablet hero + navigation (does not affect desktop). */}
        <section className="lg:hidden space-y-3">
          <div className="overflow-visible rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 text-white shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold">Admin Dashboard</h1>
                <p className="mt-1 text-sm text-white/70">Moderate, manage, and monitor key activity.</p>
              </div>

              <div className="relative flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const nextOpen = !notificationsOpen;
                    setNotificationsOpen(nextOpen);
                    if (nextOpen) {
                      await loadNotifications({ silent: false });
                    }
                  }}
                  className="relative rounded-2xl bg-white/10 p-2 text-white ring-1 ring-white/10 hover:bg-white/15"
                  aria-label="Open notifications"
                >
                  <FiBell className="h-5 w-5" />
                  {notificationsUnread > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-semibold text-white">
                      {notificationsUnread > 99 ? "99+" : notificationsUnread}
                    </span>
                  ) : null}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div ref={chipsRef} className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {[
                { key: "overview", label: "Overview" },
                { key: "events", label: "Events" },
                { key: "deals", label: "Deals" },
                { key: "influencers", label: "Influencers" },
                { key: "dealers", label: "Dealers" },
                { key: "bookings", label: "Bookings" },
                { key: "users", label: "Users" },
                { key: "team", label: "Team" },
                { key: "communications", label: "Comms" }
              ].map((item) => {
                const selected = activeSection === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveSection(item.key)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                      selected
                        ? "bg-white/20 text-white ring-white/25 shadow-[0_10px_26px_-18px_rgba(255,255,255,0.35)]"
                        : "bg-white/10 text-white/80 ring-white/10 hover:bg-white/15"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full w-1/3 rounded-full bg-white/40 transition-transform"
                  style={{ transform: `translateX(${chipsProgress * 200}%)` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Mobile notifications overlay (closes on outside click). */}
        {notificationsOpen
          ? createPortal(
              <div
                className="fixed inset-0 z-[160] flex items-start justify-center bg-slate-950/55 p-3 pt-[calc(env(safe-area-inset-top)+14px)] lg:hidden"
                onClick={() => setNotificationsOpen(false)}
                role="presentation"
              >
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur"
                >
                  <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
                    <p className="text-sm font-semibold text-white">Notifications</p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setAllNotificationsOpen(true)}
                        className="text-[11px] font-semibold text-white/80 hover:text-white"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await markAdminNotificationsRead();
                          setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
                          await loadNotifications({ silent: false });
                        }}
                        className="text-[11px] font-semibold text-white/70 hover:text-white"
                      >
                        Mark read
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotificationsOpen(false)}
                        className="text-[11px] font-semibold text-white/70 hover:text-white"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[70dvh] overflow-y-auto">
                    {loadingNotifications ? (
                      <p className="px-3 py-3 text-sm text-white/70">Loading notifications...</p>
                    ) : notifications.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-white/70">No updates yet.</p>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          className={`border-b border-white/10 px-3 py-2.5 last:border-b-0 ${
                            Number(item.is_read) === 1 ? "bg-transparent" : "bg-white/5"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 flex-1 text-sm font-semibold text-white">
                              <span className="block truncate">{item.title || "Update"}</span>
                            </p>
                            <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                              {getNotificationEntityLabel(item.entity_type)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-white/70">
                            {item.message || "New activity in admin dashboard."}
                          </p>
                          <p className="mt-1 text-[11px] text-white/60">
                            {item.created_at ? formatDateUS(item.created_at) : ""}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </div>,
              document.body
            )
          : null}

        {/* Desktop header (unchanged). */}
        <header className="hidden items-start justify-between gap-3 lg:flex">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-slate-600">
              Monitor analytics, moderate events, and manage listings.
            </p>
          </div>
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                const nextOpen = !notificationsOpen;
                setNotificationsOpen(nextOpen);
                if (nextOpen) {
                  await loadNotifications({ silent: false });
                }
              }}
              className="relative rounded-xl border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
              aria-label="Open notifications"
            >
              <FiBell className="h-5 w-5" />
              {notificationsUnread > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-semibold text-white">
                  {notificationsUnread > 99 ? "99+" : notificationsUnread}
                </span>
              ) : null}
            </button>
            <AnimatePresence>
              {notificationsOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 top-[calc(100%+8px)] z-[140] w-[min(90vw,420px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">Notifications</p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setAllNotificationsOpen(true)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        All Notifications
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await markAdminNotificationsRead();
                          setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
                          await loadNotifications({ silent: false });
                        }}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Mark all read
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {loadingNotifications ? (
                      <p className="px-4 py-4 text-sm text-slate-500">Loading notifications...</p>
                    ) : notifications.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-slate-500">No updates yet.</p>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          className={`border-b border-slate-100 px-4 py-3 last:border-b-0 ${
                            Number(item.is_read) === 1 ? "bg-white" : "bg-blue-50/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-900">{item.title || "Update"}</p>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                              {getNotificationEntityLabel(item.entity_type)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-600">{item.message || "New activity in admin dashboard."}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{item.created_at ? formatDateUS(item.created_at) : ""}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </header>

        {allNotificationsOpen
          ? createPortal(
              <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-900/45 p-4">
                <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <h3 className="text-base font-semibold text-slate-900">All Notifications</h3>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          await markAdminNotificationsRead();
                          setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
                          await loadNotifications({ silent: false });
                        }}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        Mark all read
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllNotificationsOpen(false)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[70vh] overflow-y-auto p-4">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-slate-500">No notifications available.</p>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={`all-${item.id}`}
                          className={`mb-3 rounded-xl border px-4 py-3 ${
                            Number(item.is_read) === 1 ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-slate-900">{item.title || "Update"}</p>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                  {getNotificationEntityLabel(item.entity_type)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-600">{item.message || "New activity in admin dashboard."}</p>
                              <p className="mt-1 text-[11px] text-slate-500">
                                {item.created_at ? formatDateUS(item.created_at) : ""}
                              </p>
                            </div>
                            {Number.isFinite(Number(item.id)) ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteNotification(item.id)}
                                disabled={deletingNotificationId === Number(item.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                              >
                                <FiTrash2 className="h-3.5 w-3.5" />
                                {deletingNotificationId === Number(item.id) ? "Deleting..." : "Delete"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>,
              document.body
            )
          : null}

        {activeSection !== "team" && activeSection !== "bookings" && activeSection !== "communications" && activeSection !== "users" ? (
          <AdminFilters
            filters={filters}
            onChange={onFilterChange}
            onApply={applyAdminFilters}
            onReset={resetAdminFilters}
            canApply={canApplyAdminFilters}
          />
        ) : null}

        {activeSection === "overview" ? (
          <div>
            <h2 className="mb-2 text-lg font-semibold text-slate-900">Overview Stats</h2>
            {loadingStats ? (
              <p className="text-sm text-slate-500">Loading analytics...</p>
            ) : (
              <AnalyticsCards stats={stats} />
            )}
          </div>
        ) : null}

        {/* Mobile-only: Recent updates panel (Overview). */}
        {activeSection === "overview" ? (
          <div className="lg:hidden">
            <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">Recent updates</p>
                <button
                  type="button"
                  onClick={async () => {
                    await loadNotifications({ silent: false });
                    setNotificationsOpen(true);
                  }}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-[10px] font-semibold text-slate-700"
                >
                  Open notifications
                </button>
              </div>

              <div className="space-y-2 p-3">
                {loadingNotifications ? (
                  <p className="rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-500">
                    Loading updates...
                  </p>
                ) : (notifications || []).filter((n) =>
                    ["events", "event", "deals", "deal", "influencers", "influencer"].includes(
                      String(n.entity_type || "").toLowerCase()
                    )
                  ).length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-white px-4 py-6 text-center"
                  >
                    <div className="relative mx-auto w-full max-w-[260px]">
                      <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                        className="mx-auto grid h-24 w-24 place-content-center rounded-3xl bg-white shadow-sm ring-1 ring-slate-200"
                      >
                        <svg
                          viewBox="0 0 128 128"
                          className="h-16 w-16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          {/* Sleeping rabbit (simple, friendly). */}
                          <path
                            d="M40 56c-9 4-16 13-16 23 0 14 12 25 40 25s40-11 40-25c0-10-7-19-16-23"
                            fill="#0F172A"
                            opacity="0.08"
                          />
                          <path
                            d="M44 54c0-16 9-29 20-29s20 13 20 29c0 3-1 7-3 10-6 9-17 12-17 12s-11-3-17-12c-2-3-3-7-3-10Z"
                            fill="#F8FAFC"
                            stroke="#0F172A"
                            strokeOpacity="0.12"
                            strokeWidth="2"
                          />
                          <path
                            d="M54 30c-7-10-8-18-5-22 4-5 13 1 19 12"
                            stroke="#0F172A"
                            strokeOpacity="0.18"
                            strokeWidth="6"
                            strokeLinecap="round"
                          />
                          <path
                            d="M74 30c7-10 8-18 5-22-4-5-13 1-19 12"
                            stroke="#0F172A"
                            strokeOpacity="0.18"
                            strokeWidth="6"
                            strokeLinecap="round"
                          />
                          <path
                            d="M49 62c3 2 7 3 11 3"
                            stroke="#0F172A"
                            strokeOpacity="0.35"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          <path
                            d="M79 62c-3 2-7 3-11 3"
                            stroke="#0F172A"
                            strokeOpacity="0.35"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          <path
                            d="M60 69c2 1 6 1 8 0"
                            stroke="#0F172A"
                            strokeOpacity="0.28"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                          <circle cx="52" cy="56" r="2.5" fill="#0F172A" opacity="0.25" />
                          <circle cx="76" cy="56" r="2.5" fill="#0F172A" opacity="0.25" />
                          <path
                            d="M58 77c3 3 9 3 12 0"
                            stroke="#0F172A"
                            strokeOpacity="0.18"
                            strokeWidth="4"
                            strokeLinecap="round"
                          />
                        </svg>
                      </motion.div>

                      {/* Curvy floating Zzz. */}
                      <motion.div
                        className="pointer-events-none absolute -top-2 right-2 text-slate-700"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        {["Z", "z", "z", "…"].map((ch, idx) => (
                          <motion.span
                            key={`zzz-${idx}`}
                            className="inline-block text-sm font-black"
                            animate={{
                              y: [0, -10 - idx * 2, 0],
                              x: [0, idx % 2 === 0 ? 6 : -6, 0],
                              rotate: [0, idx % 2 === 0 ? 8 : -8, 0],
                              opacity: [0.85, 1, 0.85]
                            }}
                            transition={{ duration: 2.4 + idx * 0.25, repeat: Infinity, ease: "easeInOut" }}
                            style={{ marginLeft: idx === 0 ? 0 : 2 }}
                          >
                            {ch}
                          </motion.span>
                        ))}
                      </motion.div>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">You’re all caught up</p>
                    <p className="mt-1 text-xs text-slate-600">
                      No new updates for events, influencers, or deals right now.
                    </p>
                  </motion.div>
                ) : (
                  (notifications || [])
                    .filter((n) =>
                      ["events", "event", "deals", "deal", "influencers", "influencer"].includes(
                        String(n.entity_type || "").toLowerCase()
                      )
                    )
                    .slice(0, 5)
                    .map((n) => (
                      <div
                        key={`ov-upd-${n.id}`}
                        className={`rounded-2xl border border-slate-200 px-3 py-2.5 ${
                          Number(n.is_read) === 1 ? "bg-white" : "bg-blue-50/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 text-sm font-semibold text-slate-900">
                            <span className="block truncate">{n.title || "Update"}</span>
                          </p>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            {getNotificationEntityLabel(n.entity_type)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {n.message || "New activity in admin dashboard."}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">{n.created_at ? formatDateUS(n.created_at) : ""}</p>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        ) : null}

        {activeSection === "communications" ? (
          <AdminCommunicationsSection
            tab={commTab}
            onTabChange={onCommTabChange}
            newsletterRows={newsletterRows}
            newsletterPagination={newsletterPagination}
            loadingNewsletter={loadingNewsletter}
            onNewsletterPageChange={setNewsletterPage}
            contactRows={contactRows}
            contactPagination={contactPagination}
            loadingContact={loadingContact}
            onContactPageChange={setContactPage}
            onExportNewsletter={exportNewsletter}
            onExportContact={exportContact}
            onSyncNewsletterMailchimp={syncNewsletterToMailchimp}
            syncingNewsletterMailchimp={syncingNewsletterMailchimp}
            onDeleteNewsletterSubscriber={deleteNewsletterSubscriber}
            deletingNewsletterId={deletingNewsletterId}
          />
        ) : null}

        {activeSection !== "team" && activeSection !== "bookings" && activeSection !== "communications" && activeSection !== "users" ? (
          <div className={activeSection === "overview" ? "hidden lg:block" : ""}>
            <h2 className="mb-2 text-lg font-semibold capitalize text-slate-900">
              {listingType} Management
            </h2>
            <AdminListingsTable
              rows={rows}
              loading={loadingRows}
              type={listingType}
              onView={handleView}
              onApprove={handleApprove}
              onReject={handleReject}
              onDelete={handleDelete}
            />
          </div>
        ) : activeSection === "bookings" ? (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-900">All Event Bookings</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => exportBookings("csv")}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => exportBookings("excel")}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  Download Excel
                </button>
              </div>
            </div>
            <div
              ref={bookingFilterRef}
              className="grid grid-cols-2 gap-2 rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-soft lg:grid-cols-4"
            >
              <FilterPopupField
                label="Event"
                value={
                  bookingEventOptions.find((item) => String(item.event_id) === String(bookingFilters.event_id))
                    ?.event_title || "All Events"
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
                        key={`event-${item.event_id}`}
                        type="button"
                        onClick={() => {
                          setBookingFilters((prev) => ({ ...prev, event_id: String(item.event_id) }));
                          setActiveBookingPanel(null);
                        }}
                        className={`group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition hover:bg-slate-50 ${
                          String(bookingFilters.event_id) === String(item.event_id)
                            ? "bg-slate-50 text-slate-900"
                            : "text-slate-700"
                        }`}
                      >
                        <FiMapPin className="shrink-0 text-slate-400" />{" "}
                        <span className="min-w-0 flex-1 truncate">{item.event_title}</span>
                        {String(bookingFilters.event_id) === String(item.event_id) ? (
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
                label="Organizer"
                value={
                  bookingOrganizerOptions.find(
                    (item) => String(item.organizer_id) === String(bookingFilters.organizer_id)
                  )?.organizer_name || "All Organizers"
                }
                isActive={activeBookingPanel === "organizer"}
                onToggle={(e) => {
                  e.stopPropagation();
                  setActiveBookingPanel((prev) => (prev === "organizer" ? null : "organizer"));
                }}
                panelClassName="w-full min-w-[240px]"
                panelContent={
                  <div className="hide-scrollbar max-h-56 space-y-0.5 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => {
                        setBookingFilters((prev) => ({ ...prev, organizer_id: "" }));
                        setActiveBookingPanel(null);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <FiUsers className="text-slate-400" /> All Organizers
                    </button>
                    {bookingOrganizerOptions.map((item) => (
                      <button
                        key={`org-${item.organizer_id}`}
                        type="button"
                        onClick={() => {
                          setBookingFilters((prev) => ({ ...prev, organizer_id: String(item.organizer_id) }));
                          setActiveBookingPanel(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        <FiUsers className="text-slate-400" />{" "}
                        {item.organizer_name || `Organizer #${item.organizer_id}`}
                      </button>
                    ))}
                  </div>
                }
              />

              <FilterPopupField
                label="City"
                value={cities.find((city) => city.value === bookingFilters.city)?.label || "All Cities"}
                isActive={activeBookingPanel === "city"}
                onToggle={(e) => {
                  e.stopPropagation();
                  setBookingCityQuery("");
                  setActiveBookingPanel((prev) => (prev === "city" ? null : "city"));
                }}
                panelClassName="w-full min-w-[240px]"
                panelContent={
                  <div>
                    <label className="mb-2 block">
                      <span className="sr-only">Search cities</span>
                      <input
                        type="text"
                        value={bookingCityQuery}
                        onChange={(e) => setBookingCityQuery(e.target.value)}
                        placeholder="Search cities"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 caret-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-300"
                      />
                    </label>
                    <div className="hide-scrollbar max-h-56 space-y-0.5 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => {
                        setBookingFilters((prev) => ({ ...prev, city: "" }));
                        setActiveBookingPanel(null);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <FiMapPin className="text-slate-400" /> All Cities
                    </button>
                    {filteredBookingCities.map((city) => (
                      <button
                        key={city.value}
                        type="button"
                        onClick={() => {
                          setBookingFilters((prev) => ({ ...prev, city: city.value }));
                          setActiveBookingPanel(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        <FiMapPin className="text-slate-400" /> {city.label}
                      </button>
                    ))}
                    {filteredBookingCities.length === 0 ? (
                      <p className="px-2.5 py-3 text-sm text-slate-500">No cities found.</p>
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
                usePortal
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
            <div className="space-y-2 md:hidden">
              {loadingBookings ? (
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">Loading bookings...</p>
              ) : bookingRows.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                  No bookings match the selected filters.
                </p>
              ) : (
                bookingRows
                  .slice((mobileBookingsPage - 1) * perPageMobile, (mobileBookingsPage - 1) * perPageMobile + perPageMobile)
                  .map((item) => (
                  <article key={`m-booking-${item.id}`} className="rounded-2xl border border-slate-200 bg-white p-2.5">
                    <p className="text-sm font-semibold text-slate-900">{item.event_title}</p>
                    <p className="text-xs text-slate-600">{item.name} • {item.email}</p>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-600">
                      <p><span className="font-semibold">Phone:</span> {item.phone || "-"}</p>
                      <p><span className="font-semibold">Guests:</span> {item.attendee_count}</p>
                      <p className="col-span-2">
                        <span className="font-semibold">Dates:</span>{" "}
                        {Array.isArray(item.selected_dates) && item.selected_dates.length
                          ? item.selected_dates.map((value) => formatDateUS(value)).join(", ")
                          : "-"}
                      </p>
                      <p><span className="font-semibold">Total:</span> {formatCurrency(item.total_amount || 0)}</p>
                      <p><span className="font-semibold">Booked:</span> {formatDateUS(item.booking_date)}</p>
                    </div>
                  </article>
                ))
              )}
              {!loadingBookings && bookingRows.length > perPageMobile ? (
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  <button
                    type="button"
                    disabled={mobileBookingsPage <= 1}
                    onClick={() => setMobileBookingsPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg px-2 py-1 font-semibold disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="font-medium">
                    Page {mobileBookingsPage} of {Math.max(1, Math.ceil(bookingRows.length / perPageMobile))}
                  </span>
                  <button
                    type="button"
                    disabled={mobileBookingsPage >= Math.max(1, Math.ceil(bookingRows.length / perPageMobile))}
                    onClick={() =>
                      setMobileBookingsPage((p) => Math.min(Math.max(1, Math.ceil(bookingRows.length / perPageMobile)), p + 1))
                    }
                    className="rounded-lg px-2 py-1 font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Attendee Count</th>
                    <th className="px-4 py-3">Selected Dates</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                    <th className="px-4 py-3">Booking Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingBookings ? (
                    <tr>
                      <td className="px-4 py-3 text-slate-500" colSpan={8}>
                        Loading bookings...
                      </td>
                    </tr>
                  ) : null}
                  {!loadingBookings && bookingRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-3 text-slate-500" colSpan={8}>
                        No bookings match the selected filters.
                      </td>
                    </tr>
                  ) : null}
                  {!loadingBookings
                    ? bookingRows.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-900">{item.event_title}</td>
                          <td className="px-4 py-3 text-slate-600">{item.name}</td>
                          <td className="px-4 py-3 text-slate-600">{item.email}</td>
                          <td className="px-4 py-3 text-slate-600">{item.phone}</td>
                          <td className="px-4 py-3 text-slate-600">{item.attendee_count}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {Array.isArray(item.selected_dates) && item.selected_dates.length
                              ? item.selected_dates.map((value) => formatDateUS(value)).join(", ")
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.total_amount || 0)}</td>
                          <td className="px-4 py-3 text-slate-600">{formatDateUS(item.booking_date)}</td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : activeSection === "users" ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">User Management</h2>
            <div className="space-y-2 md:hidden">
              {loadingUsers ? (
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">Loading users...</p>
              ) : usersRows.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">No users found.</p>
              ) : (
                usersRows
                  .slice((mobileUsersPage - 1) * perPageMobile, (mobileUsersPage - 1) * perPageMobile + perPageMobile)
                  .map((user) => (
                  <article key={`m-user-${user.id}`} className="rounded-2xl border border-slate-200 bg-white p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          user.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {user.is_active ? "Active" : "Deactivated"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{user.email}</p>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-600">
                      <p><span className="font-semibold">Mobile:</span> {user.mobile_number || "-"}</p>
                      <p>
                        <span className="font-semibold">Role:</span>{" "}
                        {user.role === "admin" ? "ADMIN" : user.organizer_enabled === 1 ? "ORGANIZER" : "USER"}
                      </p>
                      <p className="col-span-2"><span className="font-semibold">Created:</span> {user.created_at ? formatDateUS(user.created_at) : "-"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(user.id)}
                      className="mt-2 rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white"
                    >
                      Delete
                    </button>
                  </article>
                ))
              )}
              {!loadingUsers && usersRows.length > perPageMobile ? (
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  <button
                    type="button"
                    disabled={mobileUsersPage <= 1}
                    onClick={() => setMobileUsersPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg px-2 py-1 font-semibold disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="font-medium">
                    Page {mobileUsersPage} of {Math.max(1, Math.ceil(usersRows.length / perPageMobile))}
                  </span>
                  <button
                    type="button"
                    disabled={mobileUsersPage >= Math.max(1, Math.ceil(usersRows.length / perPageMobile))}
                    onClick={() =>
                      setMobileUsersPage((p) => Math.min(Math.max(1, Math.ceil(usersRows.length / perPageMobile)), p + 1))
                    }
                    className="rounded-lg px-2 py-1 font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Mobile</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr>
                      <td className="px-4 py-3 text-slate-500" colSpan={7}>
                        Loading users...
                      </td>
                    </tr>
                  ) : null}
                  {!loadingUsers && usersRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-3 text-slate-500" colSpan={7}>
                        No users found.
                      </td>
                    </tr>
                  ) : null}
                  {!loadingUsers
                    ? usersRows.map((user) => (
                        <tr key={`admin-user-${user.id}`} className="border-b border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                          <td className="px-4 py-3 text-slate-600">{user.email}</td>
                          <td className="px-4 py-3 text-slate-600">{user.mobile_number || "-"}</td>
                          <td className="px-4 py-3 uppercase text-slate-600">
                            {user.role === "admin" ? "ADMIN" : user.organizer_enabled === 1 ? "ORGANIZER" : "USER"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                user.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {user.is_active ? "Active" : "Deactivated"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{user.created_at ? formatDateUS(user.created_at) : "-"}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user.id)}
                              className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : activeSection === "communications" ? null : (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Team Management</h2>
            <form
              onSubmit={handleCreateTeamUser}
              className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
            >
              <FormField label="Full Name" hint="Enter the team member's legal/display name." example="Riya Patel">
                <input
                  type="text"
                  required
                  value={teamForm.name}
                  onChange={(e) => setTeamForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <FormField label="Email Address" hint="Use a valid email for immediate login access." example="riya@yaytickets.com">
                <input
                  type="email"
                  required
                  value={teamForm.email}
                  onChange={(e) => setTeamForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <FormField label="Mobile Number" hint="Primary contact number including country code." example="+1 512 555 0123">
                <input
                  type="text"
                  required
                  value={teamForm.mobile_number}
                  onChange={(e) => setTeamForm((prev) => ({ ...prev, mobile_number: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <FormField label="Temporary Password" hint="Set a secure password the user can use immediately." example="Min 8 chars">
                <input
                  type="password"
                  required
                  value={teamForm.password}
                  onChange={(e) => setTeamForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <FormField label="Account Type" hint="Choose whether to create an Organizer or Admin account.">
                <PopupSelect
                  value={teamForm.role}
                  onChange={(next) => setTeamForm((prev) => ({ ...prev, role: next }))}
                  options={[
                    { value: "organizer", label: "Create Organizer" },
                    { value: "admin", label: "Create Admin" }
                  ]}
                />
              </FormField>
              <button
                type="submit"
                disabled={creatingTeamUser}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {creatingTeamUser ? "Creating..." : "Create Account"}
              </button>
            </form>
            {teamMessage ? <p className="text-sm font-medium text-emerald-700">{teamMessage}</p> : null}
            {teamError ? <p className="text-sm font-medium text-rose-600">{teamError}</p> : null}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTeamRole("organizer")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  teamRole === "organizer" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"
                }`}
              >
                View Organizers
              </button>
              <button
                type="button"
                onClick={() => setTeamRole("admin")}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  teamRole === "admin" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700"
                }`}
              >
                View Admins
              </button>
            </div>

            <div className="space-y-2 md:hidden">
              {loadingTeam ? (
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">Loading team users...</p>
              ) : teamRows.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm text-slate-500">
                  No team members found for this role.
                </p>
              ) : (
                teamRows
                  .slice((mobileTeamPage - 1) * perPageMobile, (mobileTeamPage - 1) * perPageMobile + perPageMobile)
                  .map((user) => (
                  <article key={`m-team-${user.id}`} className="rounded-2xl border border-slate-200 bg-white p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          user.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {user.is_active ? "Active" : "Deactivated"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{user.email}</p>
                    <p className="mt-1 text-xs text-slate-600">Mobile: {user.mobile_number || "-"}</p>
                    <div className="mt-2 space-y-1 text-xs">
                      <label className="flex items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(user.can_post_events)}
                          disabled={!user.is_active}
                          onChange={(e) => handleCapabilityToggle(user.id, "can_post_events", e.target.checked)}
                        />
                        Post Events
                      </label>
                      <label className="flex items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(user.can_create_influencer_profile)}
                          disabled={!user.is_active}
                          onChange={(e) =>
                            handleCapabilityToggle(user.id, "can_create_influencer_profile", e.target.checked)
                          }
                        />
                        Influencer Profiles
                      </label>
                      <label className="flex items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(user.can_post_deals)}
                          disabled={!user.is_active}
                          onChange={(e) => handleCapabilityToggle(user.id, "can_post_deals", e.target.checked)}
                        />
                        Post Deals
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {user.is_active ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveCapabilities(user)}
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700"
                          >
                            Save Capabilities
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeactivate(user.id)}
                            className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white"
                          >
                            Deactivate
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleActivate(user.id)}
                          className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </article>
                ))
              )}
              {!loadingTeam && teamRows.length > perPageMobile ? (
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  <button
                    type="button"
                    disabled={mobileTeamPage <= 1}
                    onClick={() => setMobileTeamPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg px-2 py-1 font-semibold disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="font-medium">
                    Page {mobileTeamPage} of {Math.max(1, Math.ceil(teamRows.length / perPageMobile))}
                  </span>
                  <button
                    type="button"
                    disabled={mobileTeamPage >= Math.max(1, Math.ceil(teamRows.length / perPageMobile))}
                    onClick={() =>
                      setMobileTeamPage((p) => Math.min(Math.max(1, Math.ceil(teamRows.length / perPageMobile)), p + 1))
                    }
                    className="rounded-lg px-2 py-1 font-semibold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Mobile</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Capabilities</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTeam ? (
                    <tr>
                      <td className="px-4 py-3 text-slate-500" colSpan={7}>
                        Loading team users...
                      </td>
                    </tr>
                  ) : null}
                  {!loadingTeam && teamRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-3 text-slate-500" colSpan={7}>
                        No team members found for this role.
                      </td>
                    </tr>
                  ) : null}
                  {!loadingTeam
                    ? teamRows.map((user) => (
                        <tr key={user.id} className="border-b border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                          <td className="px-4 py-3 text-slate-600">{user.email}</td>
                          <td className="px-4 py-3 text-slate-600">{user.mobile_number || "-"}</td>
                          <td className="px-4 py-3 uppercase text-slate-600">
                            {user.role === "admin" ? "ADMIN" : user.organizer_enabled === 1 ? "ORGANIZER" : "USER"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                                user.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {user.is_active ? "Active" : "Deactivated"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1.5 text-xs">
                              <label className="flex items-center gap-2 text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={Boolean(user.can_post_events)}
                                  disabled={!user.is_active}
                                  onChange={(e) =>
                                    handleCapabilityToggle(user.id, "can_post_events", e.target.checked)
                                  }
                                />
                                Post Events
                              </label>
                              <label className="flex items-center gap-2 text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={Boolean(user.can_create_influencer_profile)}
                                  disabled={!user.is_active}
                                  onChange={(e) =>
                                    handleCapabilityToggle(
                                      user.id,
                                      "can_create_influencer_profile",
                                      e.target.checked
                                    )
                                  }
                                />
                                Influencer Profiles
                              </label>
                              <label className="flex items-center gap-2 text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={Boolean(user.can_post_deals)}
                                  disabled={!user.is_active}
                                  onChange={(e) =>
                                    handleCapabilityToggle(user.id, "can_post_deals", e.target.checked)
                                  }
                                />
                                Post Deals
                              </label>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {user.is_active ? (
                              <div className="flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveCapabilities(user)}
                                  disabled={savingCapabilitiesForUserId === user.id}
                                className="rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60"
                                >
                                  {savingCapabilitiesForUserId === user.id ? "Saving..." : "Save Capabilities"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeactivate(user.id)}
                                className="rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white"
                                >
                                  Deactivate
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleActivate(user.id)}
                              className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white"
                              >
                                Activate
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </section>

      {editingListing
        ? createPortal(
        <div className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-900/45 p-3 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+18px)] sm:items-center sm:p-6">
          <form
            onSubmit={handleSaveEdit}
            className="popup-modal flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100dvh-160px)] lg:max-h-[min(88dvh,780px)]"
          >
            <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Edit {listingType.slice(0, -1)}</h3>
                <button type="button" onClick={closeEditModal} className="text-sm font-semibold text-slate-500">
                  Close
                </button>
              </div>
            </div>

            <div className="hide-scrollbar flex-1 overflow-y-auto overscroll-contain scroll-smooth px-5 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {listingType === "influencers" ? (
                <FormField label="Profile Name" hint="Public name displayed for this influencer." example="Ava Luxe" className="sm:col-span-2">
                  <input
                    required
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
              ) : (
                <FormField
                  label={listingType === "events" ? "Event Title" : "Deal Title"}
                  hint="Use a clear title users can quickly scan."
                  example={listingType === "events" ? "Summer Startup Mixer" : "Buy 1 Get 2 Burger Combo"}
                  className="sm:col-span-2"
                >
                  <input
                    required
                    value={editForm.title || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
              )}

              <FormField
                label={listingType === "influencers" ? "Bio" : "Description"}
                hint={listingType === "influencers" ? "Add niche, audience, and content style." : "Provide key details and context."}
                className="sm:col-span-2"
              >
                <textarea
                  rows={3}
                  value={editForm.description || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>

              {listingType === "influencers" ? (
                <>
                  <FormField
                    label="Instagram URL"
                    hint="Paste the influencer's Instagram profile link."
                    example="https://instagram.com/yourhandle"
                  >
                    <input
                      type="url"
                      value={editForm.instagram || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, instagram: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField
                    label="Instagram Followers Count"
                    hint="Saved as Instagram followers (numbers only)."
                    example="12500"
                  >
                    <input
                      type="number"
                      min="0"
                      value={editForm.followers_count || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, followers_count: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField
                    label="YouTube URL"
                    hint="Paste the influencer's channel or profile link."
                    example="https://youtube.com/@yourchannel"
                  >
                    <input
                      type="url"
                      value={editForm.youtube || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, youtube: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField
                    label="YouTube Subscribers Count"
                    hint="Saved subscriber count (numbers only)."
                    example="245000"
                  >
                    <input
                      type="number"
                      min="0"
                      value={editForm.youtube_subscribers_count || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, youtube_subscribers_count: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField
                    label="Contact Email"
                    hint="Use an email where brands can contact this influencer."
                    example="creator@example.com"
                  >
                    <input
                      type="email"
                      value={editForm.contact_email || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, contact_email: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField
                    label="Profile Image URL"
                    hint="Paste a public profile image URL."
                    example="https://images.example.com/profile.jpg"
                  >
                    <input
                      type="url"
                      value={editForm.profile_image_url || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, profile_image_url: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                </>
              ) : null}

              <FormField label="City" hint="Choose the relevant city for this listing.">
                <PopupSelect
                  value={editForm.city_id || ""}
                  onChange={(next) => setEditForm((prev) => ({ ...prev, city_id: next }))}
                  placeholder="Select City"
                  options={cities.map((city) => ({ value: city.value, label: city.label }))}
                />
              </FormField>

              <FormField label="Category" hint="Select the most accurate category.">
                <PopupSelect
                  value={editForm.category_id || ""}
                  onChange={(next) => setEditForm((prev) => ({ ...prev, category_id: next }))}
                  placeholder="Select Category"
                  options={categories.map((category) => ({ value: category.value, label: category.label }))}
                />
              </FormField>

              {listingType === "events" ? (
                <>
                  <FormField label="Schedule Type" hint="Choose single date, multiple dates, or a date range." className="sm:col-span-2">
                    <PopupSelect
                      value={editForm.schedule_type || "single"}
                      onChange={(next) => setEditForm((prev) => ({ ...prev, schedule_type: next }))}
                      options={[
                        { value: "single", label: "Single Date Event" },
                        { value: "multiple", label: "Multiple Dates Event" },
                        { value: "range", label: "Date Range Event" }
                      ]}
                    />
                  </FormField>
                  {(editForm.schedule_type || "single") === "single" ? (
                  <FormField label="Event Date" hint="Primary event date." className="sm:col-span-2">
                    <PopupDateField
                      value={editForm.event_date || ""}
                      onChange={(next) => setEditForm((prev) => ({ ...prev, event_date: next }))}
                      placeholder="Select event date"
                    />
                  </FormField>
                  ) : null}
                  {(editForm.schedule_type || "single") === "range" ? (
                    <>
                      <FormField label="Start Date" hint="First day of the event range.">
                        <PopupDateField
                          value={editForm.event_start_date || ""}
                          onChange={(next) => setEditForm((prev) => ({ ...prev, event_start_date: next }))}
                          placeholder="Select start date"
                        />
                      </FormField>
                      <FormField label="End Date" hint="Last day of the event range.">
                        <PopupDateField
                          value={editForm.event_end_date || ""}
                          onChange={(next) => setEditForm((prev) => ({ ...prev, event_end_date: next }))}
                          placeholder="Select end date"
                        />
                      </FormField>
                    </>
                  ) : null}
                  {(editForm.schedule_type || "single") === "multiple" ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                      <p className="text-sm font-semibold text-slate-900">Select Multiple Dates</p>
                      <p className="mt-0.5 text-xs text-slate-500">Click dates in the calendar to add or remove them.</p>
                      <div className="mt-3 overflow-x-auto">
                        <DatePicker
                          inline
                          selected={parseDateValue(editForm.event_dates?.[0])}
                          onChange={(date) => {
                            if (!date) {
                              return;
                            }
                            const value = formatDateValue(date);
                            setEditForm((prev) => {
                              const currentDates = Array.isArray(prev.event_dates) ? prev.event_dates : [];
                              const exists = currentDates.includes(value);
                              const nextDates = exists
                                ? currentDates.filter((item) => item !== value)
                                : [...currentDates, value].sort();
                              return {
                                ...prev,
                                event_dates: nextDates
                              };
                            });
                          }}
                          minDate={new Date()}
                          monthsShown={2}
                          dayClassName={(date) =>
                            (Array.isArray(editForm.event_dates) ? editForm.event_dates : []).includes(
                              formatDateValue(date)
                            )
                              ? "multi-selected-day"
                              : undefined
                          }
                          calendarClassName="airbnb-calendar"
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Array.isArray(editForm.event_dates) && editForm.event_dates.length ? (
                          editForm.event_dates.map((dateItem) => (
                            <button
                              key={dateItem}
                              type="button"
                              onClick={() =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  event_dates: (Array.isArray(prev.event_dates) ? prev.event_dates : []).filter(
                                    (item) => item !== dateItem
                                  )
                                }))
                              }
                              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                            >
                              {dateItem} ×
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500">No dates selected yet.</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                  <FormField label="Event Time" hint="Optional local start time." example="19:30">
                    <input
                      type="time"
                      value={editForm.event_time || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, event_time: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField label="Price (USD)" hint="Ticket price per attendee." example="29.99">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.price || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, price: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField label="Duration (Hours)" hint="Total event length in hours." example="4">
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={editForm.duration_hours || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, duration_hours: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField label="Age Limit" hint="Audience age guidance for this event.">
                    <PopupSelect
                      value={editForm.age_limit || "All Ages"}
                      onChange={(next) => setEditForm((prev) => ({ ...prev, age_limit: next }))}
                      options={[
                        { value: "All Ages", label: "All Ages" },
                        { value: "5 yrs +", label: "5 yrs +" },
                        { value: "12 yrs +", label: "12 yrs +" },
                        { value: "18 yrs +", label: "18 yrs +" }
                      ]}
                    />
                  </FormField>
                  <FormField label="Languages" hint="Comma-separated spoken languages." example="English, Spanish" className="sm:col-span-2">
                    <input
                      value={editForm.languages || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, languages: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField label="Genres" hint="Comma-separated genres or themes." example="Jazz, Soul" className="sm:col-span-2">
                    <input
                      value={editForm.genres || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, genres: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:col-span-2">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(editForm.is_yay_deal_event)}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            is_yay_deal_event: e.target.checked,
                            deal_event_discount_code: e.target.checked ? prev.deal_event_discount_code : ""
                          }))
                        }
                        className="mt-1 h-4 w-4 rounded border-amber-300 text-slate-900 focus:ring-amber-500"
                      />
                      <div>
                        <span className="text-sm font-semibold text-slate-900">Yay! Deal Event</span>
                        <p className="mt-1 text-xs text-slate-600">
                          Premium deal-style listing; guests must log in to see the discount code on the public site.
                        </p>
                      </div>
                    </label>
                    {editForm.is_yay_deal_event ? (
                      <FormField label="Discount code" hint="As submitted by the organizer." className="mt-4">
                        <input
                          value={editForm.deal_event_discount_code || ""}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, deal_event_discount_code: e.target.value }))
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                          autoComplete="off"
                        />
                      </FormField>
                    ) : null}
                  </div>
                  <FormField label="Venue Name" hint="Venue where the event is hosted." example="Downtown Convention Center" className="sm:col-span-2">
                    <input
                      value={editForm.venue_name || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, venue_name: e.target.value, venue: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField label="Venue Address" hint="Full address for attendee navigation." example="123 Main St, Austin, TX" className="sm:col-span-2">
                    <input
                      value={editForm.venue_address || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, venue_address: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField label="Google Maps Link" hint="Optional direct map URL." example="https://maps.google.com/..." className="sm:col-span-2">
                    <input
                      value={editForm.google_maps_link || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, google_maps_link: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField label="Ticket Link" hint="Optional external ticketing page URL." example="https://tickets.example.com/event-123">
                    <input
                      value={editForm.ticket_link || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, ticket_link: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField label="Cover image URL" hint="Primary banner; detail page shows this first." example="https://images.example.com/event.jpg">
                    <input
                      value={editForm.image_url || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, image_url: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <div className="space-y-2 sm:col-span-2">
                    <p className="text-sm font-semibold text-slate-900">Additional banner images</p>
                    <p className="text-xs text-slate-500">Optional carousel URLs (max 12).</p>
                    <div className="space-y-2">
                      {(editForm.gallery_image_urls || []).map((row, idx) => (
                        <div key={`ad-gal-${idx}`} className="flex gap-2">
                          <input
                            type="url"
                            value={row}
                            onChange={(e) =>
                              setEditForm((prev) => {
                                const next = [...(prev.gallery_image_urls || [])];
                                next[idx] = e.target.value;
                                return { ...prev, gallery_image_urls: next };
                              })
                            }
                            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setEditForm((prev) => ({
                                ...prev,
                                gallery_image_urls: (prev.gallery_image_urls || []).filter((_, i) => i !== idx)
                              }))
                            }
                            className="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        disabled={(editForm.gallery_image_urls || []).length >= 12}
                        onClick={() =>
                          setEditForm((prev) => ({
                            ...prev,
                            gallery_image_urls: [...(prev.gallery_image_urls || []), ""]
                          }))
                        }
                        className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                      >
                        + Add image URL
                      </button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                    <p className="text-sm font-semibold text-slate-900">Event Highlights</p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {eventHighlightOptions.map((option) => {
                        const selected = Array.isArray(editForm.event_highlights)
                          ? editForm.event_highlights.includes(option)
                          : false;
                        return (
                          <label
                            key={option}
                            className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300"
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  event_highlights: e.target.checked
                                    ? [...(Array.isArray(prev.event_highlights) ? prev.event_highlights : []), option]
                                    : (Array.isArray(prev.event_highlights) ? prev.event_highlights : []).filter(
                                        (item) => item !== option
                                      )
                                }))
                              }
                              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                            />
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : null}

              {listingType === "deals" ? (
                <>
                  <FormField label="Original Price" hint="Base price before offer." example="49.99">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.original_price || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, original_price: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField label="Discounted Price" hint="Final price after discount." example="29.99">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.discounted_price || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, discounted_price: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField label="Valid Until" hint="Last date this deal stays active." className="sm:col-span-2">
                    <PopupDateField
                      value={editForm.expiry_date || ""}
                      onChange={(next) => setEditForm((prev) => ({ ...prev, expiry_date: next }))}
                      placeholder="Select expiry date"
                    />
                  </FormField>
                </>
              ) : null}

              {listingType === "services" ? (
                <>
                  <FormField label="Price Min" hint="Minimum price for this service." example="25">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.price_min || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, price_min: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                  <FormField label="Price Max" hint="Maximum price for this service." example="120">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.price_max || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, price_max: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </FormField>
                </>
              ) : null}

              </div>
            </div>
            <div className="shrink-0 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/90">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {editError ? <p className="text-sm font-medium text-rose-600">{editError}</p> : <span />}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {editSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>,
        document.body
          )
        : null}

      {reviewListing
        ? createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 p-3 sm:p-6">
          <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[min(88dvh,820px)]">
            <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Review Event Submission</h3>
                <p className="text-sm text-slate-500">
                  Review details, optionally edit, then approve this event listing.
                </p>
              </div>
              <button type="button" onClick={closeReviewModal} className="text-sm font-semibold text-slate-500">
                Close
              </button>
              </div>
            </div>

            <div className="hide-scrollbar flex-1 overflow-y-auto overscroll-contain scroll-smooth px-5 py-4 pb-6">
              {!reviewEditing ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  {reviewDisplayItems.length ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {reviewDisplayItems.map((item) => (
                        <div key={`${item.label}-${item.value}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                          {item.type === "link" ? (
                            <a
                              href={item.href}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-flex text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                            >
                              {item.value}
                            </a>
                          ) : (
                            <p className="mt-1 text-sm text-slate-700">{item.value}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">No event details were provided by the organizer.</p>
                  )}
                </div>
              ) : (
                <form className="popup-modal grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label="Event Title" hint="Use a clear title attendees can understand." example="Summer Startup Mixer" className="sm:col-span-2">
                  <input
                    value={reviewForm.title || ""}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Description" hint="Summarize event details and attendee expectations." className="sm:col-span-2">
                  <textarea
                    rows={3}
                    value={reviewForm.description || ""}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Schedule Type" hint="Choose single date, multiple dates, or a date range." className="sm:col-span-2">
                  <PopupSelect
                    value={reviewForm.schedule_type || "single"}
                    onChange={(next) => setReviewForm((prev) => ({ ...prev, schedule_type: next }))}
                    options={[
                      { value: "single", label: "Single Date Event" },
                      { value: "multiple", label: "Multiple Dates Event" },
                      { value: "range", label: "Date Range Event" }
                    ]}
                  />
                </FormField>
                {(reviewForm.schedule_type || "single") === "single" ? (
                  <FormField label="Event Date" hint="Primary event date." className="sm:col-span-2">
                    <PopupDateField
                      value={reviewForm.event_date || ""}
                      onChange={(next) => setReviewForm((prev) => ({ ...prev, event_date: next }))}
                      placeholder="Select event date"
                    />
                  </FormField>
                ) : null}
                {(reviewForm.schedule_type || "single") === "range" ? (
                  <>
                    <FormField label="Start Date" hint="First day of the event range.">
                      <PopupDateField
                        value={reviewForm.event_start_date || ""}
                        onChange={(next) => setReviewForm((prev) => ({ ...prev, event_start_date: next }))}
                        placeholder="Select start date"
                      />
                    </FormField>
                    <FormField label="End Date" hint="Last day of the event range.">
                      <PopupDateField
                        value={reviewForm.event_end_date || ""}
                        onChange={(next) => setReviewForm((prev) => ({ ...prev, event_end_date: next }))}
                        placeholder="Select end date"
                      />
                    </FormField>
                  </>
                ) : null}
                {(reviewForm.schedule_type || "single") === "multiple" ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                    <p className="text-sm font-semibold text-slate-900">Select Multiple Dates</p>
                    <p className="mt-0.5 text-xs text-slate-500">Click dates in the calendar to add or remove them.</p>
                    <div className="mt-3 overflow-x-auto">
                      <DatePicker
                        inline
                        selected={parseDateValue(reviewForm.event_dates?.[0])}
                        onChange={(date) => {
                          if (!date) {
                            return;
                          }
                          const value = formatDateValue(date);
                          setReviewForm((prev) => {
                            const currentDates = Array.isArray(prev.event_dates) ? prev.event_dates : [];
                            const exists = currentDates.includes(value);
                            const nextDates = exists
                              ? currentDates.filter((item) => item !== value)
                              : [...currentDates, value].sort();
                            return {
                              ...prev,
                              event_dates: nextDates
                            };
                          });
                        }}
                        minDate={new Date()}
                        monthsShown={2}
                        dayClassName={(date) =>
                          (Array.isArray(reviewForm.event_dates) ? reviewForm.event_dates : []).includes(
                            formatDateValue(date)
                          )
                            ? "multi-selected-day"
                            : undefined
                        }
                        calendarClassName="airbnb-calendar"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Array.isArray(reviewForm.event_dates) && reviewForm.event_dates.length ? (
                        reviewForm.event_dates.map((dateItem) => (
                          <button
                            key={dateItem}
                            type="button"
                            onClick={() =>
                              setReviewForm((prev) => ({
                                ...prev,
                                event_dates: (Array.isArray(prev.event_dates) ? prev.event_dates : []).filter(
                                  (item) => item !== dateItem
                                )
                              }))
                            }
                            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                          >
                            {dateItem} ×
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No dates selected yet.</p>
                      )}
                    </div>
                  </div>
                ) : null}
                <FormField label="Event Time" hint="Optional local start time." example="18:30">
                  <input
                    type="time"
                    value={reviewForm.event_time || ""}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, event_time: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="City" hint="Select where this event is hosted.">
                  <PopupSelect
                    value={reviewForm.city_id || ""}
                    onChange={(next) => setReviewForm((prev) => ({ ...prev, city_id: next }))}
                    placeholder="Select City"
                    options={cities.map((city) => ({ value: city.value, label: city.label }))}
                  />
                </FormField>
                <FormField label="Category" hint="Pick the most relevant event category.">
                  <PopupSelect
                    value={reviewForm.category_id || ""}
                    onChange={(next) => setReviewForm((prev) => ({ ...prev, category_id: next }))}
                    placeholder="Select Category"
                    options={categories.map((cat) => ({ value: cat.value, label: cat.label }))}
                  />
                </FormField>
                <FormField label="Venue Name" hint="Venue where the event is hosted." example="Downtown Convention Center" className="sm:col-span-2">
                  <input
                    value={reviewForm.venue_name || ""}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, venue_name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Venue Address" hint="Full address for attendee navigation." example="123 Main St, Austin, TX" className="sm:col-span-2">
                  <input
                    value={reviewForm.venue_address || ""}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, venue_address: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Google Maps Link" hint="Optional direct map URL." example="https://maps.google.com/..." className="sm:col-span-2">
                  <input
                    value={reviewForm.google_maps_link || ""}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, google_maps_link: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Ticket Link" hint="Optional external ticketing page URL." example="https://tickets.example.com/event-123">
                  <input
                    value={reviewForm.ticket_link || ""}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, ticket_link: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Cover image URL" hint="Primary banner image." example="https://images.example.com/event.jpg">
                  <input
                    value={reviewForm.image_url || ""}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, image_url: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <div className="space-y-2 sm:col-span-2">
                  <p className="text-sm font-semibold text-slate-900">Additional banner images</p>
                  <p className="text-xs text-slate-500">Optional carousel URLs (max 12).</p>
                  <div className="space-y-2">
                    {(reviewForm.gallery_image_urls || []).map((row, idx) => (
                      <div key={`rv-gal-${idx}`} className="flex gap-2">
                        <input
                          type="url"
                          value={row}
                          onChange={(e) =>
                            setReviewForm((prev) => {
                              const next = [...(prev.gallery_image_urls || [])];
                              next[idx] = e.target.value;
                              return { ...prev, gallery_image_urls: next };
                            })
                          }
                          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setReviewForm((prev) => ({
                              ...prev,
                              gallery_image_urls: (prev.gallery_image_urls || []).filter((_, i) => i !== idx)
                            }))
                          }
                          className="shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      disabled={(reviewForm.gallery_image_urls || []).length >= 12}
                      onClick={() =>
                        setReviewForm((prev) => ({
                          ...prev,
                          gallery_image_urls: [...(prev.gallery_image_urls || []), ""]
                        }))
                      }
                      className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    >
                      + Add image URL
                    </button>
                  </div>
                </div>
                <FormField label="Price (USD)" hint="Ticket price per attendee." example="29.99">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={reviewForm.price || ""}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Duration (Hours)" hint="Total event length in hours." example="4">
                  <input
                    type="number"
                    min="1"
                    value={reviewForm.duration_hours || ""}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, duration_hours: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Age Limit" hint="Audience age guidance for this event.">
                  <PopupSelect
                    value={reviewForm.age_limit || "All Ages"}
                    onChange={(next) => setReviewForm((prev) => ({ ...prev, age_limit: next }))}
                    options={[
                      { value: "All Ages", label: "All Ages" },
                      { value: "5 yrs +", label: "5 yrs +" },
                      { value: "12 yrs +", label: "12 yrs +" },
                      { value: "18 yrs +", label: "18 yrs +" }
                    ]}
                  />
                </FormField>
                <FormField label="Languages" hint="Comma-separated spoken languages." example="English, Spanish" className="sm:col-span-2">
                  <input
                    value={reviewForm.languages || ""}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, languages: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Genres" hint="Comma-separated genres or themes." example="Jazz, Soul" className="sm:col-span-2">
                  <input
                    value={reviewForm.genres || ""}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, genres: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:col-span-2">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={Boolean(reviewForm.is_yay_deal_event)}
                      onChange={(e) =>
                        setReviewForm((prev) => ({
                          ...prev,
                          is_yay_deal_event: e.target.checked,
                          deal_event_discount_code: e.target.checked ? prev.deal_event_discount_code : ""
                        }))
                      }
                      className="mt-1 h-4 w-4 rounded border-amber-300 text-slate-900 focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-sm font-semibold text-slate-900">Yay! Deal Event</span>
                      <p className="mt-1 text-xs text-slate-600">
                        Premium deal-style listing; guests must log in to see the discount code on the public site.
                      </p>
                    </div>
                  </label>
                  {reviewForm.is_yay_deal_event ? (
                    <FormField label="Discount code" hint="As submitted by the organizer." className="mt-4">
                      <input
                        value={reviewForm.deal_event_discount_code || ""}
                        onChange={(e) =>
                          setReviewForm((prev) => ({ ...prev, deal_event_discount_code: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                        autoComplete="off"
                      />
                    </FormField>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                  <p className="text-sm font-semibold text-slate-900">Event Highlights</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {eventHighlightOptions.map((option) => {
                      const selected = Array.isArray(reviewForm.event_highlights)
                        ? reviewForm.event_highlights.includes(option)
                        : false;
                      return (
                        <label
                          key={option}
                          className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) =>
                              setReviewForm((prev) => ({
                                ...prev,
                                event_highlights: e.target.checked
                                  ? [...(Array.isArray(prev.event_highlights) ? prev.event_highlights : []), option]
                                  : (Array.isArray(prev.event_highlights) ? prev.event_highlights : []).filter(
                                      (item) => item !== option
                                    )
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                          />
                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                </form>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/90">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                {reviewError ? <p className="text-sm font-medium text-rose-600">{reviewError}</p> : <span />}
                <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => handleReject(reviewListing)}
                className="min-h-10 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 lg:min-h-0 lg:px-4 lg:py-2 lg:text-sm"
              >
                Reject Event
              </button>
              <button
                type="button"
                onClick={() => setReviewEditing((prev) => !prev)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {reviewEditing ? "Cancel Edit" : "Edit"}
              </button>
              <button
                type="button"
                onClick={handleApproveEventFromReview}
                disabled={reviewSaving}
                className="min-h-10 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-60 lg:min-h-0 lg:px-4 lg:py-2 lg:text-sm"
              >
                {reviewSaving ? "Approving..." : "Approve Event"}
              </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
          )
        : null}

      {viewListing
        ? createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 p-3 sm:p-6">
          <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[min(88dvh,760px)]">
            <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {viewListingType === "events"
                      ? "View Event Submission"
                      : viewListingType === "influencers"
                        ? "Review Influencer Profile Submission"
                        : viewListingType === "dealers"
                          ? "Review Dealer Profile Submission"
                          : "Review Deal Submission"}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Validate details and take moderation action.
                  </p>
                </div>
                <button type="button" onClick={closeViewModal} className="text-[11px] font-semibold text-slate-500">
                  Close
                </button>
              </div>
            </div>
            <div className="hide-scrollbar flex-1 overflow-y-auto overscroll-contain px-4 py-3 lg:px-5 lg:py-4">
              {viewListingType === "events" ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{viewListing.title || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.description || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {hasDisplayValue(viewListing.event_date) ? formatDateUS(viewListing.event_date) : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Time</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.event_time ? String(viewListing.event_time).slice(0, 5) : "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">City</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.city_name || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.category_name || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Venue</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.venue_name || viewListing.venue || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Yay! Deal Event</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {viewListing.is_yay_deal_event === 1 ||
                      viewListing.is_yay_deal_event === true ||
                      String(viewListing.is_yay_deal_event || "") === "1"
                        ? "Yes"
                        : "No"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Discount code</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {viewListing.is_yay_deal_event === 1 ||
                      viewListing.is_yay_deal_event === true ||
                      String(viewListing.is_yay_deal_event || "") === "1"
                        ? hasDisplayValue(viewListing.deal_event_discount_code)
                          ? viewListing.deal_event_discount_code
                          : "—"
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Price</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {hasDisplayValue(viewListing.price) ? formatCurrency(Number(viewListing.price || 0)) : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                    <p className="mt-1 text-sm text-slate-700 uppercase">{viewListing.status || "-"}</p>
                  </div>
                  {hasDisplayValue(viewListing.image_url) ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cover image</p>
                      <a
                        href={viewListing.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                      >
                        View Image
                      </a>
                    </div>
                  ) : null}
                  {Array.isArray(viewListing.gallery_image_urls) && viewListing.gallery_image_urls.length ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Additional images</p>
                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                        {viewListing.gallery_image_urls.map((u) => (
                          <li key={u}>
                            <a href={u} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 hover:underline">
                              Open
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : viewListingType === "influencers" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{viewListing.name || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bio</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.bio || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">City</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.city_name || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.category_name || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact Email</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.contact_email || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                    <p className="mt-1 text-sm text-slate-700 uppercase">{viewListing.status || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Instagram URL</p>
                    {hasDisplayValue(parseInfluencerSocialLinks(viewListing.social_links).instagram) ? (
                      <a
                        href={parseInfluencerSocialLinks(viewListing.social_links).instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                      >
                        Open Instagram
                      </a>
                    ) : (
                      <p className="mt-1 text-sm text-slate-700">-</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">YouTube URL</p>
                    {hasDisplayValue(parseInfluencerSocialLinks(viewListing.social_links).youtube) ? (
                      <a
                        href={parseInfluencerSocialLinks(viewListing.social_links).youtube}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                      >
                        Open YouTube
                      </a>
                    ) : (
                      <p className="mt-1 text-sm text-slate-700">-</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Instagram Followers</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.followers_count != null ? Number(viewListing.followers_count).toLocaleString() : "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">YouTube Subscribers</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.youtube_subscribers_count != null ? Number(viewListing.youtube_subscribers_count).toLocaleString() : "-"}</p>
                  </div>
                  {hasDisplayValue(viewListing.profile_image_url) ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile Image</p>
                      <a
                        href={viewListing.profile_image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                      >
                        View Image
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : viewListingType === "dealers" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Business Name</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{viewListing.name || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Business Email</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.business_email || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Business Mobile</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.business_mobile || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.location_text || viewListing.city_name || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.category_name || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">About / Bio</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.bio || viewListing.description || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Website / Social Link</p>
                    {hasDisplayValue(viewListing.website_or_social_link) ? (
                      <a
                        href={viewListing.website_or_social_link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                      >
                        Open Link
                      </a>
                    ) : (
                      <p className="mt-1 text-sm text-slate-700">-</p>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                    <p className="mt-1 text-sm text-slate-700 uppercase">{viewListing.status || "-"}</p>
                  </div>
                  {hasDisplayValue(viewListing.profile_image_url) ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile Image / Logo</p>
                      <a
                        href={viewListing.profile_image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                      >
                        View Image
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{viewListing.title || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.description || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Provider</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.provider_name || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                    <p className="mt-1 text-sm text-slate-700 uppercase">{viewListing.status || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">City</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.city_name || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.category_name || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Original Price</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {hasDisplayValue(viewListing.original_price) ? formatCurrency(Number(viewListing.original_price || 0)) : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Discounted Price</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {hasDisplayValue(viewListing.discounted_price) ? formatCurrency(Number(viewListing.discounted_price || 0)) : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expiry Date</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {hasDisplayValue(viewListing.expiry_date) ? formatDateUS(viewListing.expiry_date) : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Offer Type</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.offer_type || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Offer Value</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {hasDisplayValue(viewListing.offer_value) ? String(viewListing.offer_value) : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Promo Code</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.promo_code || "-"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Premium</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {viewListing.is_premium === 1 || viewListing.is_premium === true ? "Yes" : "No"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Minimum Spend</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {hasDisplayValue(viewListing.minimum_spend) ? formatCurrency(Number(viewListing.minimum_spend || 0)) : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Max Discount Cap</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {hasDisplayValue(viewListing.max_discount_amount) ? formatCurrency(Number(viewListing.max_discount_amount || 0)) : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Terms & Conditions</p>
                    <p className="mt-1 text-sm text-slate-700">{viewListing.terms_text || "-"}</p>
                  </div>
                  {hasDisplayValue(viewListing.deal_link) ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deal Link</p>
                      <a
                        href={viewListing.deal_link}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                      >
                        Open Link
                      </a>
                    </div>
                  ) : null}
                  {hasDisplayValue(viewListing.image_url) ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Image URL</p>
                      <a
                        href={viewListing.image_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                      >
                        View Image
                      </a>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3">
              <div className="flex flex-wrap justify-end gap-2">
                {viewListing.status === "pending" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        closeViewModal();
                        handleReject(viewListing);
                      }}
                      className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await updateAdminListingStatus({
                          type: viewListingType,
                          id: viewListing.id,
                          status: "approved"
                        });
                        await loadListings();
                        await loadAnalytics();
                        setAdminMessage("Approved successfully.");
                        window.setTimeout(() => setAdminMessage(""), 3000);
                        closeViewModal();
                      }}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                    >
                      {viewListingType === "events"
                        ? "Approve Event"
                        : viewListingType === "dealers"
                          ? "Approve Dealer Profile"
                          : "Accept"}
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    closeViewModal();
                    openEditModal(viewListing);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
          )
        : null}

      {adminMessage ? (
        <div className="pointer-events-none fixed right-4 top-20 z-[90] w-full max-w-sm">
          <div className="pointer-events-auto rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-xl">
            <p className="text-sm font-semibold text-emerald-700">{adminMessage}</p>
          </div>
        </div>
      ) : null}

      {rejectListing
        ? createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/45 p-3 sm:p-6">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h4 className="text-base font-semibold text-slate-900">
                Reject {rejectListingType.slice(0, -1)} Submission
              </h4>
              <p className="mt-1 text-sm text-slate-500">
                Add a clear reason for the submitter.
              </p>
            </div>
            <div className="px-5 py-4">
              <textarea
                rows={5}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
              />
              {rejectError ? <p className="mt-2 text-sm font-medium text-rose-600">{rejectError}</p> : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
              <button
                type="button"
                onClick={closeRejectModal}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReject}
                disabled={rejectSaving}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {rejectSaving ? "Rejecting..." : `Reject ${rejectListingType.slice(0, -1)}`}
              </button>
            </div>
          </div>
        </div>,
        document.body
          )
        : null}
    </motion.div>
  );
}

export default AdminDashboardPage;
