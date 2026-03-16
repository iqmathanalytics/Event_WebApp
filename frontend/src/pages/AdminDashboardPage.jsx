import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
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

  const handleApprove = async (item) => {
    await updateAdminListingStatus({
      type: "events",
      id: item.id,
      status: "approved"
    });
    await loadListings();
    await loadAnalytics();
  };

  const handleReject = async (item) => {
    const note = window.prompt("Rejection note (optional):") || "";
    await updateAdminListingStatus({
      type: "events",
      id: item.id,
      status: "rejected",
      note
    });
    await loadListings();
    await loadAnalytics();
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
      setEditForm({
        title: item.title || "",
        description: item.description || "",
        city_id: item.city_id ? String(item.city_id) : "",
        category_id: item.category_id ? String(item.category_id) : "",
        price: item.price ?? "",
        event_date: item.event_date ? String(item.event_date).slice(0, 10) : ""
      });
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

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingListing) {
      return;
    }

    setEditError("");
    try {
      setEditSaving(true);
      const payload = {};
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
                    <th className="px-4 py-3">Booking Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingBookings ? (
                    <tr>
                      <td className="px-4 py-3 text-slate-500" colSpan={6}>
                        Loading bookings...
                      </td>
                    </tr>
                  ) : null}
                  {!loadingBookings && bookingRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-3 text-slate-500" colSpan={6}>
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

      {editingListing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="hide-scrollbar max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit {listingType.slice(0, -1)}</h3>
              <button type="button" onClick={closeEditModal} className="text-sm font-semibold text-slate-500">
                Close
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    type="date"
                    value={editForm.event_date || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, event_date: e.target.value }))}
                    className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
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

              {editError ? (
                <p className="text-sm font-medium text-rose-600 sm:col-span-2">{editError}</p>
              ) : null}

              <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
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
            </form>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

export default AdminDashboardPage;
