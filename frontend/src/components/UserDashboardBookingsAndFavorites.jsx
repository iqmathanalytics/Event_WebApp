import { Link } from "react-router-dom";
import { CalendarDays, ExternalLink, Heart, MapPin, Tag, Ticket } from "lucide-react";
import { formatCurrency, formatDateUS } from "../utils/format";
import BookingPaymentBadge from "./BookingPaymentBadge";
import { bookingAmountPaidDollars } from "../utils/bookingPayment";
import { dealDetailPath, eventDetailPath, influencerDetailPath } from "../utils/listingPaths";
import { resolveTicketLevelPalette } from "../utils/ticketLevelPalettes";

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

function getFavoriteDetailsUrl(item) {
  if (!item) return null;
  const listingType = item.listing_type;
  const listingId = item.listing_id;
  if (!listingType || listingId == null) return null;

  const slug = item.public_slug || item.publicSlug;
  const displayTitle = item.title || item.listing_title || item.name || "";
  if (listingType === "event") {
    return eventDetailPath({ id: listingId, title: displayTitle, public_slug: slug });
  }
  if (listingType === "deal") {
    return dealDetailPath({ id: listingId, title: displayTitle, public_slug: slug });
  }
  if (listingType === "influencer") {
    return influencerDetailPath({ id: listingId, name: displayTitle, public_slug: slug });
  }
  return null;
}

function listingTypeLabel(type) {
  const map = {
    event: "Event",
    deal: "Deal",
    influencer: "Creator",
    service: "Service"
  };
  return map[type] || String(type || "Saved");
}

function formatBookingDates(booking) {
  const dates = Array.isArray(booking.selected_dates) ? booking.selected_dates.filter(Boolean) : [];
  if (dates.length) {
    return dates.map((d) => formatDateUS(d)).join(", ");
  }
  if (booking.booking_date) {
    return formatDateUS(booking.booking_date);
  }
  if (booking.event_date) {
    return formatDateUS(booking.event_date);
  }
  return "Date TBC";
}

function getBookingTicketLines(booking) {
  const items = Array.isArray(booking.ticket_items) ? booking.ticket_items : [];
  if (items.length) {
    return items;
  }
  const count = Number(booking.attendee_count) || 0;
  if (count > 0) {
    return [
      {
        level_id: "general",
        level_name: "General Admission",
        unit_price: 0,
        quantity: count
      }
    ];
  }
  return [];
}

function BookingDiscountSummary({ booking }) {
  const discount = Number(booking.discount_amount) || 0;
  if (discount <= 0) {
    return null;
  }
  const subtotal = Number(booking.subtotal_amount);
  const hasSubtotal = Number.isFinite(subtotal) && subtotal > 0;
  const code = String(booking.coupon_code || "").trim();

  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200/80">
      <Tag className="h-3 w-3 shrink-0" aria-hidden />
      Saved {formatCurrency(discount)}
      {code ? <span className="font-mono text-[10px]">{code}</span> : null}
      {hasSubtotal ? (
        <span className="text-emerald-700/90">
          (<span className="line-through">{formatCurrency(subtotal)}</span>)
        </span>
      ) : null}
    </span>
  );
}

function BookingTicketTiers({ booking }) {
  const lines = getBookingTicketLines(booking);
  const totalDays = Math.max(1, Number(booking.total_days) || 1);

  if (!lines.length) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-wrap gap-1">
      {lines.map((line, index) => {
        const palette = resolveTicketLevelPalette(
          { id: line.level_id, name: line.level_name, price: line.unit_price },
          index,
          lines.map((l) => ({ id: l.level_id, name: l.level_name, price: l.unit_price }))
        );
        const lineTotal =
          Number(line.unit_price) > 0 ? Number(line.unit_price) * line.quantity * totalDays : null;

        return (
          <span
            key={`${line.level_id}-${index}`}
            className={`inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-tight ${palette.cardIdle}`}
            title={line.level_name}
          >
            <span className={`shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase ${palette.badge}`}>
              {palette.tierLabel}
            </span>
            <span className={`truncate font-semibold ${palette.title}`}>{line.level_name}</span>
            <span className="shrink-0 tabular-nums text-slate-600">
              ×{line.quantity}
              {totalDays > 1 ? ` · ${totalDays}d` : ""}
              {lineTotal != null && lineTotal > 0 ? ` · ${formatCurrency(lineTotal)}` : ""}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function UserBookingCard({ booking }) {
  const eventUrl =
    booking.event_id != null
      ? eventDetailPath({
          id: booking.event_id,
          title: booking.event_title,
          public_slug: booking.event_public_slug
        })
      : "/events";
  const mapUrl = getLocationUrl(booking);
  const thumb = booking.event_image || null;
  const ticketCount = Number(booking.attendee_count) || 0;
  const paidAmount = bookingAmountPaidDollars(booking);
  const hasDiscount = Number(booking.discount_amount) > 0;

  const venueLine = [booking.venue_name, booking.venue_address].filter(Boolean).join(" · ");

  return (
    <article className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-sm ring-1 ring-slate-900/[0.03] transition hover:border-slate-300 sm:p-3">
      <div className="flex gap-2.5 sm:gap-3">
        <Link to={eventUrl} className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg sm:h-[4.25rem] sm:w-[4.25rem]">
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100">
              <Ticket className="h-6 w-6 text-slate-400" aria-hidden />
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold leading-tight text-slate-900 sm:text-[15px]">
                {booking.event_title || "Event"}
              </h3>
              {booking.city ? (
                <p className="truncate text-[11px] text-slate-500">{booking.city}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="text-sm font-bold tabular-nums leading-none text-slate-900">
                {formatCurrency(paidAmount)}
              </span>
              <BookingPaymentBadge status={booking.payment_status} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600">
            <span className="inline-flex items-center gap-0.5 font-medium text-slate-700">
              <CalendarDays className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
              {formatBookingDates(booking)}
            </span>
            <span className="text-slate-300">|</span>
            <span>
              {ticketCount} ticket{ticketCount === 1 ? "" : "s"}
            </span>
            <Link
              to={eventUrl}
              className="ml-auto shrink-0 font-semibold text-brand-700 hover:underline sm:ml-0"
            >
              View event
            </Link>
          </div>

          <BookingTicketTiers booking={booking} />

          {hasDiscount ? <BookingDiscountSummary booking={booking} /> : null}

          {(venueLine || booking.organizer_name || mapUrl) && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
              {venueLine ? (
                <span className="inline-flex min-w-0 max-w-full items-center gap-0.5 truncate">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                  <span className="truncate">{venueLine}</span>
                </span>
              ) : null}
              {booking.organizer_name ? (
                <span className="shrink-0 truncate">· {booking.organizer_name}</span>
              ) : null}
              {mapUrl ? (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-brand-700 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  Map
                </a>
              ) : null}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function FavoriteListingCard({ item, toggleFavorite }) {
  const href = getFavoriteDetailsUrl(item);
  const price = getDisplayPrice(item);
  const priceLabel =
    price != null && price !== "" && Number.isFinite(Number(price)) ? formatCurrency(Number(price)) : null;
  const thumb = item.image_url;
  const thumbClass =
    "relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg sm:h-[4.25rem] sm:w-[4.25rem]";

  const thumbNode = thumb ? (
    <img src={thumb} alt="" className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-slate-100">
      <Heart className="h-6 w-6 text-slate-400" aria-hidden />
    </div>
  );

  return (
    <li className="rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-sm ring-1 ring-slate-900/[0.03] transition hover:border-slate-300 sm:p-3">
      <div className="flex gap-2.5 sm:gap-3">
        {href ? (
          <Link to={href} className={thumbClass}>
            {thumbNode}
          </Link>
        ) : (
          <div className={`${thumbClass} bg-slate-100`}>{thumbNode}</div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-slate-100 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200/80">
                  {listingTypeLabel(item.listing_type)}
                </span>
                {priceLabel ? (
                  <span className="text-[11px] font-bold tabular-nums text-slate-800">{priceLabel}</span>
                ) : null}
              </div>
              {href ? (
                <Link
                  to={href}
                  className="mt-0.5 block truncate text-sm font-bold leading-tight text-slate-900 hover:text-brand-700 sm:text-[15px]"
                >
                  {item.title || "Listing"}
                </Link>
              ) : (
                <p className="mt-0.5 truncate text-sm font-bold leading-tight text-slate-900 sm:text-[15px]">
                  {item.title || "Listing"}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void toggleFavorite({ listingType: item.listing_type, listingId: item.listing_id })}
              className="shrink-0 rounded-full border border-slate-200 bg-white p-1.5 text-rose-500 transition hover:bg-rose-50"
              aria-label={`Remove ${item.title || "listing"} from favourites`}
            >
              <Heart className="h-3.5 w-3.5 fill-current" aria-hidden />
            </button>
          </div>

          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
            {item.city_name ? <span className="truncate font-medium text-slate-600">{item.city_name}</span> : null}
            {item.city_name && item.category_name ? <span className="text-slate-300">·</span> : null}
            {item.category_name ? <span className="truncate">{item.category_name}</span> : null}
            {href ? (
              <Link to={href} className="ml-auto shrink-0 font-semibold text-brand-700 hover:underline">
                Open listing
              </Link>
            ) : null}
          </p>
        </div>
      </div>
    </li>
  );
}

const FILTER_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All" }
];

export default function UserDashboardBookingsAndFavorites({
  filteredBookings,
  bookingsTotalCount,
  loadingBookings,
  bookingsError,
  bookingFilter,
  onBookingFilterChange,
  favorites,
  favoritesLoading,
  toggleFavorite
}) {
  return (
    <div className="space-y-4">
      <section
        aria-labelledby="dashboard-my-tickets-heading"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Book My Tickets</p>
            <h2 id="dashboard-my-tickets-heading" className="mt-0.5 text-lg font-bold text-slate-900">
              My tickets &amp; bookings
            </h2>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Event reservations and payment status for tickets you booked on the site.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5 rounded-xl bg-slate-50 p-1">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onBookingFilterChange(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  bookingFilter === opt.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {bookingsError ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            {bookingsError}
          </p>
        ) : null}

        <div className="mt-3 space-y-2">
          {loadingBookings ? (
            <p className="text-sm text-slate-500">Loading your bookings…</p>
          ) : filteredBookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center">
              <Ticket className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
              <p className="mt-2 text-sm font-medium text-slate-800">
                {bookingsTotalCount === 0
                  ? "No bookings yet"
                  : bookingFilter === "upcoming"
                    ? "No upcoming bookings"
                    : bookingFilter === "past"
                      ? "No past bookings in this view"
                      : "No bookings to show"}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {bookingsTotalCount === 0
                  ? "When you book tickets for an on-site event, your requests will appear here."
                  : "Try switching the filter above, or browse events to book another date."}
              </p>
              <Link
                to="/events"
                className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Browse events
              </Link>
            </div>
          ) : (
            filteredBookings.map((b) => <UserBookingCard key={b.booking_id ?? `${b.event_id}-${b.created_at}`} booking={b} />)
          )}
        </div>
      </section>

      <section
        aria-labelledby="dashboard-favorites-heading"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Saved</p>
          <h2 id="dashboard-favorites-heading" className="mt-0.5 text-lg font-bold text-slate-900">
            Favourite listings
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Events, deals, and creators you saved with the heart icon across Book My Tickets.
          </p>
        </div>

        <div className="mt-3">
          {favoritesLoading ? (
            <p className="text-sm text-slate-500">Loading your favourites…</p>
          ) : favorites.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center">
              <Heart className="mx-auto h-8 w-8 text-slate-300" aria-hidden />
              <p className="mt-2 text-sm font-medium text-slate-800">Nothing saved yet</p>
              <p className="mt-1 text-xs text-slate-600">
                Tap the heart on any event, deal, or creator card to keep it here for quick access.
              </p>
              <Link
                to="/events"
                className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Explore events
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {favorites.map((item) => (
                <FavoriteListingCard
                  key={`${item.listing_type}-${item.listing_id}`}
                  item={item}
                  toggleFavorite={toggleFavorite}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
