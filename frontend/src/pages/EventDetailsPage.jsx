import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiCalendar, FiClock, FiExternalLink, FiMapPin, FiUser } from "react-icons/fi";
import { CheckCircle, Clock, Globe, Music, Users } from "lucide-react";
import { fetchEventById } from "../services/eventService";
import { createBooking } from "../services/bookingService";
import { formatCurrency } from "../utils/format";
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
  const { user, isAuthenticated } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [bookingDate, setBookingDate] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    name: "",
    email: "",
    phone: ""
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingError, setBookingError] = useState("");

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
    setBookingForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.mobile_number || ""
    });
  }, [user]);

  useEffect(() => {
    if (event?.event_date) {
      setBookingDate(String(event.event_date).slice(0, 10));
    }
  }, [event]);

  const submitBooking = async (e) => {
    e.preventDefault();
    setBookingError("");
    setBookingMessage("");
    try {
      setBookingLoading(true);
      await createBooking({
        event_id: Number(event.id),
        attendee_count: Number(attendeeCount),
        booking_date: String(event.event_date).slice(0, 10),
        name: bookingForm.name,
        email: bookingForm.email,
        phone: bookingForm.phone
      });
      setShowBookingForm(false);
      setBookingMessage("Booking request submitted successfully.");
    } catch (err) {
      const apiMessage = err?.response?.data?.message;
      setBookingError(apiMessage || "Could not reserve tickets. Please check your details.");
    } finally {
      setBookingLoading(false);
    }
  };

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
        className="aspect-[16/7] w-full rounded-3xl object-cover"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.7fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm text-slate-500">{event.city_name || "City"}</p>
          <h1 className="text-3xl font-bold leading-tight text-slate-900">{event.title}</h1>

          <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <p className="inline-flex items-center gap-2">
              <FiCalendar className="text-slate-500" />
              {event.event_date}
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
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {event.description || "No event description provided yet."}
            </p>
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

          {highlights.length > 0 ? (
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

          <Link to="/events" className="mt-5 inline-block text-sm font-semibold text-brand-600">
            Browse More Events
          </Link>
        </div>

        <motion.aside
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="sticky top-28 h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Booking</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{formatCurrency(event.price || 0)}</p>
          <p className="mt-1 text-sm text-slate-500">per ticket</p>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Event Date
              </span>
              <input
                type="date"
                value={bookingDate}
                readOnly
                disabled
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Guests / Attendees
              </span>
              <select
                value={attendeeCount}
                onChange={(e) => setAttendeeCount(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              >
                {Array.from({ length: 10 }).map((_, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {idx + 1} {idx === 0 ? "guest" : "guests"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <span className="mt-4 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {event.category_name || "General"}
          </span>

          {!isAuthenticated ? (
            <Link
              to="/login"
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Login to Reserve Tickets
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setShowBookingForm((prev) => !prev)}
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              {showBookingForm ? "Close Booking Form" : "Reserve Tickets"}
            </button>
          )}

          {showBookingForm ? (
            <motion.form
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onSubmit={submitBooking}
              className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
            >
              <input
                required
                placeholder="Name"
                value={bookingForm.name}
                onChange={(e) => setBookingForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={bookingForm.email}
                onChange={(e) => setBookingForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
              <input
                required
                placeholder="Phone number"
                value={bookingForm.phone}
                onChange={(e) => setBookingForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {bookingLoading ? "Reserving..." : "Confirm Reservation"}
              </button>
            </motion.form>
          ) : null}

          {bookingMessage ? <p className="mt-3 text-sm font-medium text-emerald-700">{bookingMessage}</p> : null}
          {bookingError ? <p className="mt-3 text-sm font-medium text-rose-600">{bookingError}</p> : null}

          <p className="mt-4 text-xs text-slate-500">You won&apos;t be charged yet</p>
          {event.ticket_link ? (
            <a
              href={event.ticket_link}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <FiExternalLink />
              Open Ticket Link
            </a>
          ) : null}
        </motion.aside>
      </div>
    </motion.div>
  );
}

export default EventDetailsPage;
