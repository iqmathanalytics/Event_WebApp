import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import { FiCalendar, FiMapPin, FiUsers } from "react-icons/fi";
import AdminSidebar from "../components/AdminSidebar";
import AnalyticsCards from "../components/AnalyticsCards";
import AdminFilters from "../components/AdminFilters";
import AdminListingsTable from "../components/AdminListingsTable";
import AirbnbDatePickerPanel from "../components/AirbnbDatePickerPanel";
import FilterPopupField from "../components/FilterPopupField";
import { categories, cities } from "../utils/filterOptions";
import {
  createTeamUser,
  deactivateTeamUser,
  deleteAdminListing,
  editAdminListing,
  fetchAdminAnalytics,
  fetchAdminListings,
  fetchAdminBookings,
  exportAdminBookings,
  fetchTeamUsers,
  updateAdminListingStatus
} from "../services/adminService";
import { downloadBlob } from "../utils/fileDownload";
import { formatCurrency } from "../utils/format";

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

function AdminDashboardPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [stats, setStats] = useState({});
  const [rows, setRows] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [teamRole, setTeamRole] = useState("organizer");
  const [teamRows, setTeamRows] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: "",
    email: "",
    mobile_number: "",
    password: "",
    role: "organizer"
  });
  const [teamMessage, setTeamMessage] = useState("");
  const [teamError, setTeamError] = useState("");
  const [creatingTeamUser, setCreatingTeamUser] = useState(false);
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
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [reviewListing, setReviewListing] = useState(null);
  const [reviewForm, setReviewForm] = useState({});
  const [reviewEditing, setReviewEditing] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [rejectListing, setRejectListing] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSaving, setRejectSaving] = useState(false);
  const [rejectError, setRejectError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
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
  const canApplyAdminFilters =
    filters.date !== appliedFilters.date ||
    filters.city !== appliedFilters.city ||
    filters.category !== appliedFilters.category;

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
    if (!reviewListing && !editingListing) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [reviewListing, editingListing]);

  const listingType = useMemo(
    () => (["overview", "team"].includes(activeSection) ? "events" : activeSection),
    [activeSection]
  );

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

  useEffect(() => {
    loadAnalytics();
    if (activeSection === "bookings") {
      loadBookings();
    } else if (activeSection !== "team") {
      loadListings();
    } else {
      loadTeam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, listingType, teamRole, appliedFilters, bookingFilters]);

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
    price: item.price ?? "",
    duration_hours: item.duration_hours ?? "",
    age_limit: item.age_limit || "All Ages",
    languages: item.languages || "",
    genres: item.genres || "",
    schedule_type: item.schedule_type || "single",
    event_highlights: parseHighlights(item.event_highlights)
  });

  const buildEventPayloadFromForm = (formValues) => {
    const payload = {};
    Object.entries(formValues).forEach(([key, value]) => {
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
      payload[key] = typeof value === "string" ? value.trim() : value;
    });
    if (payload.venue_name && !payload.venue) {
      payload.venue = payload.venue_name;
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
      pushText("Event Date", reviewForm.event_date);
    } else if ((reviewForm.schedule_type || "single") === "multiple") {
      if (Array.isArray(reviewForm.event_dates) && reviewForm.event_dates.length) {
        pushText("Selected Dates", reviewForm.event_dates.join(", "));
      }
    } else if ((reviewForm.schedule_type || "single") === "range") {
      const hasStart = hasDisplayValue(reviewForm.event_start_date);
      const hasEnd = hasDisplayValue(reviewForm.event_end_date);
      if (hasStart || hasEnd) {
        pushText(
          "Date Range",
          `${hasStart ? reviewForm.event_start_date : "Not provided"} to ${hasEnd ? reviewForm.event_end_date : "Not provided"}`
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
    pushLink("Google Maps", reviewForm.google_maps_link, "Open Map");
    pushLink("Ticket Link", reviewForm.ticket_link, "Open Ticket Page");
    pushLink("Image", reviewForm.image_url, "View Image");

    return items;
  }, [reviewListing, reviewForm]);

  const handleApprove = async (item) => {
    setReviewListing(item);
    setReviewForm(buildEventReviewForm(item));
    setReviewEditing(false);
    setReviewError("");
  };

  const handleReject = async (item) => {
    setRejectListing(item);
    setRejectReason("");
    setRejectError("");
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
      setEditForm({
        name: item.name || "",
        description: item.bio || "",
        city_id: item.city_id ? String(item.city_id) : "",
        category_id: item.category_id ? String(item.category_id) : ""
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
    setEditForm({});
    setEditError("");
  };

  const closeReviewModal = () => {
    setReviewListing(null);
    setReviewForm({});
    setReviewEditing(false);
    setReviewSaving(false);
    setReviewError("");
    setRejectListing(null);
    setRejectReason("");
    setRejectSaving(false);
    setRejectError("");
  };

  const closeRejectModal = () => {
    setRejectListing(null);
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
        type: "events",
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
      setAdminMessage("Event rejected with reason.");
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
      if (listingType === "events") {
        payload = buildEventPayloadFromForm(editForm);
      } else {
        Object.entries(editForm).forEach(([key, value]) => {
          if (value === "" || value === null || value === undefined) {
            return;
          }
          if (["city_id", "category_id", "price", "original_price", "discounted_price", "price_min", "price_max"].includes(key)) {
            payload[key] = Number(value);
          } else if (key === "description" && listingType === "influencers") {
            payload.bio = value;
          } else {
            payload[key] = typeof value === "string" ? value.trim() : value;
          }
        });
        delete payload.description;
        if (listingType !== "influencers" && editForm.description?.trim()) {
          payload.description = editForm.description.trim();
        }
      }

      await editAdminListing({ type: listingType, id: editingListing.id, payload });
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
        type: "events",
        id: reviewListing.id,
        status: "approved"
      });
      closeReviewModal();
      await loadListings();
      await loadAnalytics();
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

  const bookingEventOptions = useMemo(() => {
    const seen = new Set();
    return bookingRows.filter((item) => {
      const key = `${item.event_id}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [bookingRows]);

  const bookingOrganizerOptions = useMemo(() => {
    const seen = new Set();
    return bookingRows.filter((item) => {
      const key = `${item.organizer_id}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
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
      <AdminSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <section className="space-y-4">
        <header>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-slate-600">
            Monitor analytics, moderate events, and manage listings.
          </p>
        </header>

        {activeSection !== "team" && activeSection !== "bookings" ? (
          <AdminFilters
            filters={filters}
            onChange={onFilterChange}
            onApply={applyAdminFilters}
            onReset={resetAdminFilters}
            canApply={canApplyAdminFilters}
          />
        ) : null}

        <div>
          <h2 className="mb-2 text-lg font-semibold text-slate-900">Overview Stats</h2>
          {loadingStats ? (
            <p className="text-sm text-slate-500">Loading analytics...</p>
          ) : (
            <AnalyticsCards stats={stats} />
          )}
        </div>

        {activeSection !== "team" && activeSection !== "bookings" ? (
          <div>
            <h2 className="mb-2 text-lg font-semibold capitalize text-slate-900">
              {listingType} Management
            </h2>
            <AdminListingsTable
              rows={rows}
              loading={loadingRows}
              type={listingType}
              onApprove={handleApprove}
              onReject={handleReject}
              onDelete={handleDelete}
              onEdit={openEditModal}
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
              className="grid grid-cols-1 gap-2 rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-soft sm:grid-cols-2 lg:grid-cols-4"
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
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <FiMapPin className="text-slate-400" /> All Events
                    </button>
                    {filteredBookingEventOptions.map((item) => (
                      <button
                        key={`event-${item.event_id}`}
                        type="button"
                        onClick={() => {
                          setBookingFilters((prev) => ({ ...prev, event_id: String(item.event_id) }));
                          setActiveBookingPanel(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        <FiMapPin className="text-slate-400" /> {item.event_title}
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
                value={bookingFilters.date || "Any Date"}
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
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Attendee Count</th>
                    <th className="px-4 py-3">Selected Dates</th>
                    <th className="px-4 py-3">Total Amount</th>
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
                              ? item.selected_dates.join(", ")
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatCurrency(item.total_amount || 0)}</td>
                          <td className="px-4 py-3 text-slate-600">{String(item.booking_date).slice(0, 10)}</td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Team Management</h2>
            <form
              onSubmit={handleCreateTeamUser}
              className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
            >
              <input
                type="text"
                required
                placeholder="Name"
                value={teamForm.name}
                onChange={(e) => setTeamForm((prev) => ({ ...prev, name: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
              <input
                type="email"
                required
                placeholder="Email"
                value={teamForm.email}
                onChange={(e) => setTeamForm((prev) => ({ ...prev, email: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
              <input
                type="text"
                required
                placeholder="Mobile Number"
                value={teamForm.mobile_number}
                onChange={(e) => setTeamForm((prev) => ({ ...prev, mobile_number: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={teamForm.password}
                onChange={(e) => setTeamForm((prev) => ({ ...prev, password: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
              <select
                value={teamForm.role}
                onChange={(e) => setTeamForm((prev) => ({ ...prev, role: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="organizer">Create Organizer</option>
                <option value="admin">Create Admin</option>
              </select>
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

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Mobile</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTeam ? (
                    <tr>
                      <td className="px-4 py-3 text-slate-500" colSpan={6}>
                        Loading team users...
                      </td>
                    </tr>
                  ) : null}
                  {!loadingTeam && teamRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-3 text-slate-500" colSpan={6}>
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
                          <td className="px-4 py-3 uppercase text-slate-600">{user.role}</td>
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
                            {user.is_active ? (
                              <button
                                type="button"
                                onClick={() => handleDeactivate(user.id)}
                                className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <span className="text-xs text-slate-500">No action</span>
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 p-3 sm:p-6">
          <form
            onSubmit={handleSaveEdit}
            className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[min(88dvh,780px)]"
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
                <input
                  required
                  placeholder="Name"
                  value={editForm.name || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                />
              ) : (
                <input
                  required
                  placeholder="Title"
                  value={editForm.title || ""}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                />
              )}

              <textarea
                rows={3}
                placeholder={listingType === "influencers" ? "Bio" : "Description"}
                value={editForm.description || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
              />

              <select
                value={editForm.city_id || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, city_id: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="">Select City</option>
                {cities.map((city) => (
                  <option key={city.value} value={city.value}>
                    {city.label}
                  </option>
                ))}
              </select>

              <select
                value={editForm.category_id || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, category_id: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>

              {listingType === "events" ? (
                <>
                  <select
                    value={editForm.schedule_type || "single"}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, schedule_type: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                  >
                    <option value="single">Single Date Event</option>
                    <option value="multiple">Multiple Dates Event</option>
                    <option value="range">Date Range Event</option>
                  </select>
                  {(editForm.schedule_type || "single") === "single" ? (
                    <input
                      type="date"
                      value={editForm.event_date || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, event_date: e.target.value }))}
                      className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  ) : null}
                  {(editForm.schedule_type || "single") === "range" ? (
                    <>
                      <input
                        type="date"
                        value={editForm.event_start_date || ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, event_start_date: e.target.value }))}
                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                      <input
                        type="date"
                        value={editForm.event_end_date || ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, event_end_date: e.target.value }))}
                        className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
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
                  <input
                    type="time"
                    value={editForm.event_time || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, event_time: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price"
                    value={editForm.price || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, price: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                  <input
                    type="number"
                    min="1"
                    max="168"
                    placeholder="Duration (Hours)"
                    value={editForm.duration_hours || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, duration_hours: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                  <select
                    value={editForm.age_limit || "All Ages"}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, age_limit: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  >
                    <option value="All Ages">All Ages</option>
                    <option value="5 yrs +">5 yrs +</option>
                    <option value="12 yrs +">12 yrs +</option>
                    <option value="18 yrs +">18 yrs +</option>
                  </select>
                  <input
                    placeholder="Languages (comma separated)"
                    value={editForm.languages || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, languages: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                  />
                  <input
                    placeholder="Genres (comma separated)"
                    value={editForm.genres || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, genres: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                  />
                  <input
                    placeholder="Venue Name"
                    value={editForm.venue_name || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, venue_name: e.target.value, venue: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                  />
                  <input
                    placeholder="Venue Address"
                    value={editForm.venue_address || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, venue_address: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                  />
                  <input
                    placeholder="Google Maps Link"
                    value={editForm.google_maps_link || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, google_maps_link: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                  />
                  <input
                    placeholder="Ticket Link"
                    value={editForm.ticket_link || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, ticket_link: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                  <input
                    placeholder="Image URL"
                    value={editForm.image_url || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, image_url: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
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
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Original Price"
                    value={editForm.original_price || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, original_price: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Discounted Price"
                    value={editForm.discounted_price || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, discounted_price: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                  <input
                    type="date"
                    value={editForm.expiry_date || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, expiry_date: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                  />
                </>
              ) : null}

              {listingType === "services" ? (
                <>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price Min"
                    value={editForm.price_min || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, price_min: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price Max"
                    value={editForm.price_max || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, price_max: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
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
                <form className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={reviewForm.title || ""}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                  placeholder="Title"
                />
                <textarea
                  rows={3}
                  value={reviewForm.description || ""}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                  placeholder="Description"
                />
                <select
                  value={reviewForm.schedule_type || "single"}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, schedule_type: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                >
                  <option value="single">Single Date Event</option>
                  <option value="multiple">Multiple Dates Event</option>
                  <option value="range">Date Range Event</option>
                </select>
                {(reviewForm.schedule_type || "single") === "single" ? (
                  <input
                    type="date"
                    value={reviewForm.event_date || ""}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, event_date: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                ) : null}
                {(reviewForm.schedule_type || "single") === "range" ? (
                  <>
                    <input
                      type="date"
                      value={reviewForm.event_start_date || ""}
                      onChange={(e) => setReviewForm((prev) => ({ ...prev, event_start_date: e.target.value }))}
                      className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                    <input
                      type="date"
                      value={reviewForm.event_end_date || ""}
                      onChange={(e) => setReviewForm((prev) => ({ ...prev, event_end_date: e.target.value }))}
                      className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
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
                <input
                  type="time"
                  value={reviewForm.event_time || ""}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, event_time: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
                <select
                  value={reviewForm.city_id || ""}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, city_id: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="">Select City</option>
                  {cities.map((city) => (
                    <option key={city.value} value={city.value}>
                      {city.label}
                    </option>
                  ))}
                </select>
                <select
                  value={reviewForm.category_id || ""}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, category_id: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <input
                  value={reviewForm.venue_name || ""}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, venue_name: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                  placeholder="Venue Name"
                />
                <input
                  value={reviewForm.venue_address || ""}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, venue_address: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                  placeholder="Venue Address"
                />
                <input
                  value={reviewForm.google_maps_link || ""}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, google_maps_link: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                  placeholder="Google Maps Link"
                />
                <input
                  value={reviewForm.ticket_link || ""}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, ticket_link: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  placeholder="Ticket Link"
                />
                <input
                  value={reviewForm.image_url || ""}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, image_url: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  placeholder="Image URL"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={reviewForm.price || ""}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, price: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  placeholder="Price"
                />
                <input
                  type="number"
                  min="1"
                  value={reviewForm.duration_hours || ""}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, duration_hours: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  placeholder="Duration (hours)"
                />
                <select
                  value={reviewForm.age_limit || "All Ages"}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, age_limit: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="All Ages">All Ages</option>
                  <option value="5 yrs +">5 yrs +</option>
                  <option value="12 yrs +">12 yrs +</option>
                  <option value="18 yrs +">18 yrs +</option>
                </select>
                <input
                  placeholder="Languages (comma separated)"
                  value={reviewForm.languages || ""}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, languages: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                />
                <input
                  placeholder="Genres (comma separated)"
                  value={reviewForm.genres || ""}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, genres: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
                />
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
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
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
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
              <h4 className="text-base font-semibold text-slate-900">Reject Event Submission</h4>
              <p className="mt-1 text-sm text-slate-500">
                Add a clear reason. The organizer will see this message.
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
                {rejectSaving ? "Rejecting..." : "Reject Event"}
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
