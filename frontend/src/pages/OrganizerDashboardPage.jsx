import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import { FiCalendar, FiClipboard, FiMapPin, FiTrendingUp, FiUsers } from "react-icons/fi";
import { createEvent, deleteEvent, fetchMyEvents, updateEvent } from "../services/eventService";
import { exportOrganizerBookings, fetchOrganizerBookings } from "../services/bookingService";
import { categories, cities } from "../utils/filterOptions";
import { formatCurrency } from "../utils/format";
import { downloadBlob } from "../utils/fileDownload";
import AirbnbDatePickerPanel from "../components/AirbnbDatePickerPanel";
import FilterPopupField from "../components/FilterPopupField";
import OrganizerSidebar from "../components/OrganizerSidebar";

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
  ticket_link: "",
  price: "",
  image_url: "",
  duration_hours: "",
  age_limit: "All Ages",
  languages: "",
  genres: "",
  event_highlights: []
};

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

function OrganizerDashboardPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [overviewBookings, setOverviewBookings] = useState([]);
  const [bookingRows, setBookingRows] = useState([]);
  const [loadingOverviewBookings, setLoadingOverviewBookings] = useState(false);
  const [loadingBookingRows, setLoadingBookingRows] = useState(false);
  const [bookingFilters, setBookingFilters] = useState({ event_id: "", date: "" });
  const [bookingEventQuery, setBookingEventQuery] = useState("");
  const bookingFilterRef = useRef(null);
  const [activeBookingPanel, setActiveBookingPanel] = useState(null);

  useEffect(() => {
    const onDocClick = (event) => {
      if (!bookingFilterRef.current?.contains(event.target)) {
        setActiveBookingPanel(null);
      }
    };
    window.addEventListener("click", onDocClick);
    return () => window.removeEventListener("click", onDocClick);
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const totalEventsCreated = rows.length;
    const totalBookingsReceived = overviewBookings.length;
    const upcomingEvents = rows.filter((item) => String(item.event_date).slice(0, 10) >= today).length;
    const totalAttendees = overviewBookings.reduce(
      (sum, item) => sum + Number(item.attendee_count || 0),
      0
    );
    return {
      totalEventsCreated,
      totalBookingsReceived,
      upcomingEvents,
      totalAttendees
    };
  }, [rows, overviewBookings]);

  const bookingsOverTimeData = useMemo(() => {
    const grouped = overviewBookings.reduce((acc, item) => {
      const key = String(item.booking_date).slice(0, 10);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [overviewBookings]);

  const bookingsPerEventData = useMemo(() => {
    const grouped = overviewBookings.reduce((acc, item) => {
      const key = item.event_title || `Event #${item.event_id}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([event, bookings]) => ({ event, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 8);
  }, [overviewBookings]);

  const attendeeDistributionData = useMemo(() => {
    const grouped = overviewBookings.reduce((acc, item) => {
      const key = item.event_title || `Event #${item.event_id}`;
      acc[key] = (acc[key] || 0) + Number(item.attendee_count || 0);
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [overviewBookings]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingEvent(null);
  };

  const openCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

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
      ticket_link: event.ticket_link || "",
      price: event.price ?? "",
      image_url: event.image_url || "",
      duration_hours: event.duration_hours ?? "",
      age_limit: event.age_limit || "All Ages",
      languages: event.languages || "",
      genres: event.genres || "",
      event_highlights: parseHighlights(event.event_highlights)
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetchMyEvents();
      setRows(response?.data || []);
    } catch (_err) {
      setRows([]);
      setError("Could not load your events. Please try again.");
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
    loadEvents();
    loadOverviewBookings();
    loadFilteredBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      const venueMapsUrl = normalizeOptionalUrl(form.google_maps_link, "Google Maps");
      const ticketUrl = normalizeOptionalUrl(form.ticket_link, "ticket");
      const imageUrl = normalizeOptionalUrl(form.image_url, "image");

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
        ticket_link: ticketUrl,
        image_url: imageUrl,
        price: form.price === "" ? 0 : Number(form.price),
        duration_hours: form.duration_hours === "" ? undefined : Number(form.duration_hours),
        age_limit: form.age_limit || undefined,
        languages: form.languages.trim() || undefined,
        genres: form.genres.trim() || undefined,
        event_highlights: form.event_highlights
      };

      if (editingEvent) {
        await updateEvent(editingEvent.id, payload);
        setSuccess("Event updated and submitted for admin approval.");
      } else {
        await createEvent(payload);
        setSuccess("Event submitted for admin approval.");
      }
      closeForm();
      await refreshData();
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]"
    >
      <OrganizerSidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <section className="space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Organizer Dashboard</h1>
            <p className="text-sm text-slate-600">
              Track event performance, booking activity, and submissions in one place.
            </p>
          </div>
          {activeSection === "my-events" ? (
            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-soft"
            >
              Create New Event
            </button>
          ) : null}
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
          {activeSection === "overview" ? (
            <motion.section
              key="overview"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <motion.div whileHover={{ y: -3 }} className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
                  <p className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <FiClipboard /> Total Events Created
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalEventsCreated}</p>
                </motion.div>
                <motion.div whileHover={{ y: -3 }} className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
                  <p className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <FiTrendingUp /> Total Bookings Received
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.totalBookingsReceived}</p>
                </motion.div>
                <motion.div whileHover={{ y: -3 }} className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
                  <p className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <FiCalendar /> Upcoming Events
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-700">{stats.upcomingEvents}</p>
                </motion.div>
                <motion.div whileHover={{ y: -3 }} className="rounded-xl border border-slate-200 bg-white p-4 shadow-soft">
                  <p className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <FiUsers /> Total Attendees
                  </p>
                  <p className="mt-1 text-2xl font-bold text-brand-700">{stats.totalAttendees}</p>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                  <h3 className="text-sm font-semibold text-slate-900">Bookings Over Time</h3>
                  {loadingOverviewBookings ? (
                    <div className="mt-3 h-64 animate-pulse rounded-xl bg-slate-100" />
                  ) : bookingsOverTimeData.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">No booking data available yet.</p>
                  ) : (
                    <div className="mt-3 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={bookingsOverTimeData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="date" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="count"
                            name="Bookings"
                            stroke="#e11d48"
                            strokeWidth={2}
                            isAnimationActive
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                  <h3 className="text-sm font-semibold text-slate-900">Bookings Per Event</h3>
                  {loadingOverviewBookings ? (
                    <div className="mt-3 h-64 animate-pulse rounded-xl bg-slate-100" />
                  ) : bookingsPerEventData.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">No booking data available yet.</p>
                  ) : (
                    <div className="mt-3 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bookingsPerEventData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="event" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="bookings" fill="#0f172a" isAnimationActive />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                <h3 className="text-sm font-semibold text-slate-900">Attendee Distribution</h3>
                {loadingOverviewBookings ? (
                  <div className="mt-3 h-72 animate-pulse rounded-xl bg-slate-100" />
                ) : attendeeDistributionData.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No attendee data available yet.</p>
                ) : (
                  <div className="mt-3 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip />
                        <Legend />
                        <Pie
                          data={attendeeDistributionData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={110}
                          label
                          isAnimationActive
                        >
                          {attendeeDistributionData.map((entry, index) => (
                            <Cell
                              // eslint-disable-next-line react/no-array-index-key
                              key={`${entry.name}-${index}`}
                              fill={["#e11d48", "#0f172a", "#0284c7", "#16a34a", "#7c3aed", "#f59e0b"][index % 6]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </motion.section>
          ) : null}

          {activeSection === "my-events" ? (
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
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="px-2 py-2">Event Title</th>
                        <th className="px-2 py-2">Date</th>
                        <th className="px-2 py-2">City</th>
                        <th className="px-2 py-2">Price</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-2 py-2 font-medium text-slate-900">{item.title}</td>
                          <td className="px-2 py-2 text-slate-600">{String(item.event_date).slice(0, 10)}</td>
                          <td className="px-2 py-2 text-slate-600">{item.city_name || "-"}</td>
                          <td className="px-2 py-2 text-slate-600">{formatCurrency(item.price || 0)}</td>
                          <td className="px-2 py-2">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${getStatusBadgeClass(item.status)}`}
                            >
                              {item.status}
                            </span>
                            <p className="mt-1 text-xs text-slate-500">{getStatusNote(item.status, item.review_note)}</p>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-2">
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
                </div>
              ) : null}
            </motion.section>
          ) : null}

          {activeSection === "bookings" ? (
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
                    rows.find((item) => String(item.id) === String(bookingFilters.event_id))?.title || "All Events"
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
                      {rows
                        .filter((item) =>
                          bookingEventQuery.trim()
                            ? String(item.title || "")
                                .toLowerCase()
                                .includes(bookingEventQuery.trim().toLowerCase())
                            : true
                        )
                        .map((item) => (
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
                      {rows.filter((item) =>
                        bookingEventQuery.trim()
                          ? String(item.title || "")
                              .toLowerCase()
                              .includes(bookingEventQuery.trim().toLowerCase())
                          : true
                      ).length === 0 ? (
                        <p className="px-2.5 py-3 text-sm text-slate-500">No events found.</p>
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
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-2 py-2">Event Name</th>
                      <th className="px-2 py-2">Attendee Name</th>
                      <th className="px-2 py-2">Email</th>
                      <th className="px-2 py-2">Phone</th>
                      <th className="px-2 py-2">Guests</th>
                      <th className="px-2 py-2">Selected Dates</th>
                      <th className="px-2 py-2">Total Amount</th>
                      <th className="px-2 py-2">Booking Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingBookingRows ? (
                      <tr>
                        <td className="px-2 py-2 text-slate-500" colSpan={8}>
                          Loading bookings...
                        </td>
                      </tr>
                    ) : null}
                    {!loadingBookingRows && bookingRows.length === 0 ? (
                      <tr>
                        <td className="px-2 py-2 text-slate-500" colSpan={8}>
                          No bookings match the selected filters.
                        </td>
                      </tr>
                    ) : null}
                    {!loadingBookingRows
                      ? bookingRows.map((item) => (
                          <tr key={item.id} className="border-b border-slate-100">
                            <td className="px-2 py-2 font-medium text-slate-900">{item.event_title}</td>
                            <td className="px-2 py-2 text-slate-600">{item.name}</td>
                            <td className="px-2 py-2 text-slate-600">{item.email}</td>
                            <td className="px-2 py-2 text-slate-600">{item.phone}</td>
                            <td className="px-2 py-2 text-slate-600">{item.attendee_count}</td>
                            <td className="px-2 py-2 text-slate-600">
                              {Array.isArray(item.selected_dates) && item.selected_dates.length
                                ? item.selected_dates.join(", ")
                                : "-"}
                            </td>
                            <td className="px-2 py-2 text-slate-600">{formatCurrency(item.total_amount || 0)}</td>
                            <td className="px-2 py-2 text-slate-600">{String(item.booking_date).slice(0, 10)}</td>
                          </tr>
                        ))
                      : null}
                  </tbody>
                </table>
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </section>

      {isFormOpen
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-900/45 p-4 sm:items-center">
              <div className="hide-scrollbar max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
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

                <form noValidate onSubmit={submitForm} className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
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
              <input
                required
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
              />
              <textarea
                required
                rows={4}
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
              />
              <select
                value={form.schedule_type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    schedule_type: e.target.value
                  }))
                }
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
              >
                <option value="single">Single Date Event</option>
                <option value="multiple">Multiple Dates Event</option>
                <option value="range">Date Range Event</option>
              </select>
              {form.schedule_type === "single" ? (
                <input
                  type="date"
                  required
                  value={form.event_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, event_date: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
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
                          {dateItem} ×
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
                  <input
                    type="date"
                    required
                    value={form.event_start_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, event_start_date: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                  <input
                    type="date"
                    required
                    value={form.event_end_date}
                    onChange={(e) => setForm((prev) => ({ ...prev, event_end_date: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </>
              ) : null}
              <input
                type="time"
                value={form.event_time}
                onChange={(e) => setForm((prev) => ({ ...prev, event_time: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                <p className="text-sm font-semibold text-slate-900">Event Location</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    required
                    placeholder="Venue Name"
                    value={form.venue_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, venue_name: e.target.value }))}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm sm:col-span-2"
                  />
                  <input
                    placeholder="Venue Address"
                    value={form.venue_address}
                    onChange={(e) => setForm((prev) => ({ ...prev, venue_address: e.target.value }))}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm sm:col-span-2"
                  />
                  <input
                    type="url"
                    placeholder="Google Maps Link"
                    value={form.google_maps_link}
                    onChange={(e) => setForm((prev) => ({ ...prev, google_maps_link: e.target.value }))}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm sm:col-span-2"
                  />
                </div>
              </div>
              <select
                required
                value={form.city_id}
                onChange={(e) => setForm((prev) => ({ ...prev, city_id: e.target.value }))}
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
                required
                value={form.category_id}
                onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              <input
                type="url"
                placeholder="Ticket Link"
                value={form.ticket_link}
                onChange={(e) => setForm((prev) => ({ ...prev, ticket_link: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Price"
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
              <input
                type="number"
                min="1"
                max="168"
                placeholder="Duration (Hours)"
                value={form.duration_hours}
                onChange={(e) => setForm((prev) => ({ ...prev, duration_hours: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
              <select
                value={form.age_limit}
                onChange={(e) => setForm((prev) => ({ ...prev, age_limit: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="All Ages">All Ages</option>
                <option value="5 yrs +">5 yrs +</option>
                <option value="12 yrs +">12 yrs +</option>
                <option value="18 yrs +">18 yrs +</option>
              </select>
              <input
                placeholder="Languages (comma separated)"
                value={form.languages}
                onChange={(e) => setForm((prev) => ({ ...prev, languages: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
              />
              <input
                placeholder="Genres (comma separated)"
                value={form.genres}
                onChange={(e) => setForm((prev) => ({ ...prev, genres: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
              />
              <input
                type="url"
                placeholder="Image Upload URL"
                value={form.image_url}
                onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm sm:col-span-2"
              />
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
            <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4">
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
    </motion.div>
  );
}

export default OrganizerDashboardPage;
