import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import useFavorites from "../hooks/useFavorites";
import { fetchMyBookings } from "../services/bookingService";
import { formatCurrency } from "../utils/format";

function getDisplayPrice(item) {
  if (item.listing_type === "event") {
    return item.event_price;
  }
  if (item.listing_type === "deal") {
    return item.deal_price;
  }
  if (item.listing_type === "service") {
    return item.service_price;
  }
  return null;
}

function formatReadableDate(value) {
  if (!value) {
    return "Date not available";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(parsed);
}

function getLocationUrl(booking) {
  if (booking.google_maps_link) {
    return booking.google_maps_link;
  }
  if (booking.venue_address || booking.venue_name) {
    const query = booking.venue_address || booking.venue_name;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  return null;
}

function UserDashboardPage() {
  const { favorites, loading, toggleFavorite } = useFavorites();
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState("");
  const [bookingFilter, setBookingFilter] = useState("upcoming");

  useEffect(() => {
    let active = true;
    async function loadBookings() {
      try {
        setLoadingBookings(true);
        setBookingsError("");
        const response = await fetchMyBookings();
        if (active) {
          setBookings(response?.data || []);
        }
      } catch (_err) {
        if (active) {
          setBookings([]);
          setBookingsError("Could not load your bookings right now.");
        }
      } finally {
        if (active) {
          setLoadingBookings(false);
        }
      }
    }

    loadBookings();
    return () => {
      active = false;
    };
  }, []);

  const filteredBookings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bookings.filter((item) => {
      if (bookingFilter === "all") {
        return true;
      }
      const eventDate = new Date(item.event_date);
      if (Number.isNaN(eventDate.getTime())) {
        return bookingFilter === "all";
      }
      eventDate.setHours(0, 0, 0, 0);
      if (bookingFilter === "upcoming") {
        return eventDate >= today;
      }
      return eventDate < today;
    });
  }, [bookings, bookingFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-4"
    >
      <h1 className="text-2xl font-bold">My Dashboard</h1>
      <p className="text-sm text-slate-600">Track your bookings, saved listings, and account activity in one place.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">My Registered Events</p>
          <p className="mt-1 text-2xl font-bold">{bookings.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Favorites</p>
          <p className="mt-1 text-2xl font-bold">{favorites.length}</p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold">My Registered Events</h2>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setBookingFilter("upcoming")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                bookingFilter === "upcoming" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              Upcoming Events
            </button>
            <button
              type="button"
              onClick={() => setBookingFilter("past")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                bookingFilter === "past" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              Past Events
            </button>
            <button
              type="button"
              onClick={() => setBookingFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                bookingFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              All
            </button>
          </div>
        </div>

        {loadingBookings ? <p className="text-sm text-slate-500">Loading your bookings...</p> : null}
        {bookingsError ? <p className="text-sm text-rose-600">{bookingsError}</p> : null}

        {!loadingBookings && !bookingsError && bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h3 className="text-base font-semibold text-slate-900">
              You haven&apos;t registered for any events yet.
            </h3>
            <Link
              to="/events"
              className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Explore Events
            </Link>
          </div>
        ) : null}

        {!loadingBookings && !bookingsError && bookings.length > 0 && filteredBookings.length === 0 ? (
          <p className="text-sm text-slate-500">No bookings match the selected filter.</p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredBookings.map((booking) => {
            const locationUrl = getLocationUrl(booking);
            return (
              <article
                key={booking.booking_id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft"
              >
                <img
                  src={booking.event_image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900"}
                  alt={booking.event_title}
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="space-y-2 p-4">
                  <h3 className="text-base font-bold text-slate-900">{booking.event_title}</h3>
                  <p className="text-sm text-slate-600">
                    {booking.city || "City"} • {booking.venue_name || "Venue to be announced"}
                  </p>
                  {booking.venue_address ? (
                    <p className="text-xs text-slate-500">{booking.venue_address}</p>
                  ) : null}
                  <p className="text-sm text-slate-600">
                    {formatReadableDate(booking.event_date)} •{" "}
                    {booking.event_time ? String(booking.event_time).slice(0, 5) : "Time not specified"}
                  </p>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    <p>
                      Guests: <span className="font-semibold">{booking.attendee_count}</span>
                    </p>
                    <p>
                      Booked On: <span className="font-semibold">{formatReadableDate(booking.booking_date)}</span>
                    </p>
                    <p>
                      Price: <span className="font-semibold">{formatCurrency(booking.price || 0)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      to={`/events/${booking.event_id}`}
                      className="inline-flex flex-1 items-center justify-center rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                    >
                      View Event
                    </Link>
                    {locationUrl ? (
                      <a
                        href={locationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        View Location
                      </a>
                    ) : (
                      <span className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400">
                        View Location
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400"
                    title="Cancel Booking coming soon"
                  >
                    Cancel Booking (Coming Soon)
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Saved Items</h2>
        {loading ? <p className="text-sm text-slate-500">Loading favorites...</p> : null}
        {!loading && favorites.length === 0 ? (
          <p className="text-sm text-slate-500">You have no saved listings yet.</p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {favorites.map((item) => {
            const displayPrice = getDisplayPrice(item);
            return (
              <article key={item.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <img
                  src={item.image_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600"}
                  alt={item.title}
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase text-slate-500">{item.listing_type}</p>
                  <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.category_name || "Category"} • {item.city_name || "City"}
                  </p>
                  {displayPrice !== null ? (
                    <p className="mt-1 text-xs font-semibold text-slate-700">{formatCurrency(displayPrice)}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="self-start rounded-md border border-slate-300 px-2 py-1 text-xs"
                  onClick={() =>
                    toggleFavorite({
                      listingType: item.listing_type,
                      listingId: item.listing_id
                    })
                  }
                >
                  Remove
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}

export default UserDashboardPage;
