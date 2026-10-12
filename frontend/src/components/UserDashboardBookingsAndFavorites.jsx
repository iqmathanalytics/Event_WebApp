import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ExternalLink, Heart, MapPin, Tag, Ticket } from "lucide-react";
import { formatCurrency, formatDateUS, formatTime12Hour } from "../utils/format";
import { paymentStatusMeta } from "../utils/bookingPayment";
import BookingPaymentBadge from "./BookingPaymentBadge";
import { bookingAmountPaidDollars } from "../utils/bookingPayment";
import { formatBookingSeatsLabel } from "../utils/bookingSeats";
import { dealDetailPath, eventDetailPath, influencerDetailPath } from "../utils/listingPaths";
import { thumbImageUrl } from "../utils/displayImage";
import { resolveTicketLevelPalette } from "../utils/ticketLevelPalettes";
import { resendMyBookingEmail } from "../services/bookingService";

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
    <span className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200/80 lg:text-[11px]">
      <Tag className="h-3 w-3 shrink-0" aria-hidden />
      Saved {formatCurrency(discount)}
      {code ? <span className="font-mono text-xs lg:text-[10px]">{code}</span> : null}
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
            className={`inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs leading-tight lg:text-[11px] ${palette.cardIdle}`}
            title={line.level_name}
          >
            <span className={`shrink-0 rounded px-1 py-px text-xs font-bold uppercase lg:text-[9px] ${palette.badge}`}>
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

function TicketMeta({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 px-3 py-2.5">
      <p className="flex items-center gap-1 text-xs font-semibold text-slate-500">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-snug text-slate-900">{value}</p>
    </div>
  );
}

function TicketDetailsSheet({ open, onClose, booking, eventUrl, mapUrl, venueLine, ticketCount, seatsLabel, paidAmount, datesLabel, timeLabel, onResend, resendBusy, resendStatus, bookingId }) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onDesktop = () => {
      if (desktop.matches) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onDesktop);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [open, onClose]);

  const status = paymentStatusMeta(booking.payment_status);
  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ticket-details-title"
            className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl"
            initial={reduceMotion ? { opacity: 0 } : { y: 28, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { y: 20, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto">
              <div className="relative h-36 bg-slate-900">
                {booking.event_image ? (
                  <img src={thumbImageUrl(booking.event_image)} alt="" className="h-full w-full object-cover" />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-slate-950/10" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase ${status.className}`}>
                    {status.label}
                  </span>
                  <h3 id="ticket-details-title" className="mt-2 text-xl font-bold leading-tight">
                    {booking.event_title || "Event"}
                  </h3>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-2">
                  <TicketMeta icon={CalendarDays} label="When" value={timeLabel ? `${datesLabel} · ${timeLabel}` : datesLabel} />
                  <TicketMeta icon={Ticket} label="Tickets" value={`${ticketCount} ${ticketCount === 1 ? "ticket" : "tickets"}`} />
                </div>
                <div className="rounded-2xl border border-slate-200 px-3 py-3">
                  <p className="text-xs font-semibold text-slate-500">Amount</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatCurrency(paidAmount)}</p>
                  <BookingDiscountSummary booking={booking} />
                </div>
                <BookingTicketTiers booking={booking} />
                {seatsLabel ? <TicketMeta icon={Ticket} label="Seats" value={seatsLabel} /> : null}
                {venueLine ? <TicketMeta icon={MapPin} label="Venue" value={venueLine} /> : null}
                {booking.city ? <p className="text-sm text-slate-600">{booking.city}</p> : null}
                {booking.organizer_name ? <p className="text-sm text-slate-600">Hosted by {booking.organizer_name}</p> : null}
                {booking.has_ticket_qr && booking.check_in_code ? (
                  <p className="rounded-2xl bg-amber-50 px-3 py-3 text-sm text-amber-950">
                    Your entry QR code was sent to your email. Show that QR at the venue for check-in.
                  </p>
                ) : null}
                {resendStatus ? (
                  <p className={`text-sm font-medium ${resendStatus.ok ? "text-emerald-700" : "text-rose-600"}`}>{resendStatus.message}</p>
                ) : null}
              </div>
            </div>
            <div className="space-y-2 border-t border-slate-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="grid grid-cols-2 gap-2">
                <Link to={eventUrl} className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-600 px-3 text-sm font-semibold text-white">
                  View event
                </Link>
                {mapUrl ? (
                  <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 px-3 text-sm font-semibold text-slate-800">
                    Open map
                  </a>
                ) : (
                  <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 px-3 text-sm font-semibold text-slate-800">
                    Close
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => void onResend()}
                disabled={resendBusy || !bookingId}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-semibold text-slate-800 disabled:opacity-60"
              >
                {resendBusy ? "Sending…" : "Resend ticket email"}
              </button>
              {mapUrl ? (
                <button type="button" onClick={onClose} className="inline-flex min-h-11 w-full items-center justify-center text-sm font-semibold text-slate-600">
                  Close
                </button>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

function UserBookingCard({ booking }) {
  const [resendBusy, setResendBusy] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);
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
  const seatsLabel = formatBookingSeatsLabel(booking);
  const paidAmount = bookingAmountPaidDollars(booking);
  const hasDiscount = Number(booking.discount_amount) > 0;
  const bookingId = booking.booking_id ?? booking.id;

  const venueLine = [booking.venue_name, booking.venue_address].filter(Boolean).join(" · ");
  const datesLabel = formatBookingDates(booking);
  const timeLabel = booking.event_time ? formatTime12Hour(booking.event_time) : "";
  const [detailsOpen, setDetailsOpen] = useState(false);
  const status = paymentStatusMeta(booking.payment_status);

  const onResend = async () => {
    if (!bookingId || resendBusy) {
      return;
    }
    setResendBusy(true);
    setResendStatus(null);
    try {
      await resendMyBookingEmail(bookingId);
      setResendStatus({ ok: true, message: "Confirmation email resent" });
    } catch (err) {
      setResendStatus({
        ok: false,
        message: err?.response?.data?.message || "Could not resend email."
      });
    } finally {
      setResendBusy(false);
      window.setTimeout(() => setResendStatus(null), 4000);
    }
  };

  return (
    <>
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft lg:hidden">
      <Link to={eventUrl} className="relative block h-40 bg-slate-900">
        {thumb ? (
          <img src={thumbImageUrl(thumb)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Ticket className="h-8 w-8 text-white/70" aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
          <p className="text-2xl font-bold tabular-nums leading-none">{formatCurrency(paidAmount)}</p>
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase ${status.className}`}>{status.label}</span>
        </div>
      </Link>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-lg font-bold leading-snug text-slate-900">{booking.event_title || "Event"}</h3>
          {booking.city ? <p className="mt-1 text-sm text-slate-600">{booking.city}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <TicketMeta icon={CalendarDays} label="When" value={timeLabel ? `${datesLabel} · ${timeLabel}` : datesLabel} />
          <TicketMeta icon={Ticket} label="Tickets" value={`${ticketCount} ${ticketCount === 1 ? "ticket" : "tickets"}`} />
        </div>
        {seatsLabel ? <TicketMeta icon={Ticket} label="Seats" value={seatsLabel} /> : null}
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white"
        >
          View ticket details
        </button>
      </div>
    </article>
    <TicketDetailsSheet
      open={detailsOpen}
      onClose={() => setDetailsOpen(false)}
      booking={booking}
      eventUrl={eventUrl}
      mapUrl={mapUrl}
      venueLine={venueLine}
      ticketCount={ticketCount}
      seatsLabel={seatsLabel}
      paidAmount={paidAmount}
      datesLabel={datesLabel}
      timeLabel={timeLabel}
      onResend={onResend}
      resendBusy={resendBusy}
      resendStatus={resendStatus}
      bookingId={bookingId}
    />
    <article className="hidden rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-sm ring-1 ring-slate-900/[0.03] transition hover:border-slate-300 sm:p-3 lg:block">
      <div className="flex gap-2.5 sm:gap-3">
        <Link to={eventUrl} className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg sm:h-[4.25rem] sm:w-[4.25rem]">
          {thumb ? (
            <img src={thumbImageUrl(thumb)} alt="" className="h-full w-full object-cover" />
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
                <p className="truncate text-xs text-slate-500 lg:text-[11px]">{booking.city}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="text-sm font-bold tabular-nums leading-none text-slate-900">
                {formatCurrency(paidAmount)}
              </span>
              <BookingPaymentBadge status={booking.payment_status} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 lg:text-[11px]">
            <span className="inline-flex items-center gap-0.5 font-medium text-slate-700">
              <CalendarDays className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
              {formatBookingDates(booking)}
            </span>
            <span className="text-slate-300">|</span>
            <span>
              {`${ticketCount} ${ticketCount === 1 ? "ticket" : "tickets"}`}
            </span>
            {seatsLabel ? (
              <>
                <span className="text-slate-300">|</span>
                <span className="truncate font-medium text-slate-700" title={seatsLabel}>
                  Seats: {seatsLabel}
                </span>
              </>
            ) : null}
            <Link
              to={eventUrl}
              className="ml-auto inline-flex min-h-11 shrink-0 items-center font-semibold text-brand-700 hover:underline sm:ml-0 lg:min-h-0"
            >
              View event
            </Link>
          </div>

          <BookingTicketTiers booking={booking} />

          {hasDiscount ? <BookingDiscountSummary booking={booking} /> : null}

          {booking.has_ticket_qr && booking.check_in_code ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              Your entry QR code was sent to your email. Show that QR at the venue for check-in.
            </p>
          ) : null}

          {(venueLine || booking.organizer_name || mapUrl) && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 lg:text-[11px]">
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

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => void onResend()}
              disabled={resendBusy || !bookingId}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 lg:min-h-0 lg:px-2.5 lg:py-1.5 lg:text-[11px]"
            >
              {resendBusy ? "Sending…" : "Resend ticket email"}
            </button>
            {resendStatus ? (
              <span className={`text-xs font-medium lg:text-[11px] ${resendStatus.ok ? "text-emerald-700" : "text-rose-600"}`}>
                {resendStatus.message}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
    </>
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
    <img src={thumbImageUrl(thumb)} alt="" className="h-full w-full object-cover" />
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
                <span className="rounded bg-slate-100 px-1.5 py-px text-xs font-bold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200/80 lg:text-[9px]">
                  {listingTypeLabel(item.listing_type)}
                </span>
                {priceLabel ? (
                  <span className="text-xs font-bold tabular-nums text-slate-800 lg:text-[11px]">{priceLabel}</span>
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
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-500 transition hover:bg-rose-50 lg:min-h-0 lg:min-w-0 lg:p-1.5"
              aria-label={`Remove ${item.title || "listing"} from favourites`}
            >
              <Heart className="h-3.5 w-3.5 fill-current" aria-hidden />
            </button>
          </div>

          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 lg:text-[11px]">
            {item.city_name ? <span className="truncate font-medium text-slate-600">{item.city_name}</span> : null}
            {item.city_name && item.category_name ? <span className="text-slate-300">·</span> : null}
            {item.category_name ? <span className="truncate">{item.category_name}</span> : null}
            {href ? (
              <Link to={href} className="ml-auto inline-flex min-h-11 shrink-0 items-center font-semibold text-brand-700 hover:underline lg:min-h-0">
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 lg:text-[11px]">Book My Tickets</p>
            <h2 id="dashboard-my-tickets-heading" className="mt-0.5 text-lg font-bold text-slate-900">
              My tickets &amp; bookings
            </h2>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Event reservations and payment status for tickets you booked on the site.
            </p>
          </div>
          <div className="hide-scrollbar flex w-full min-w-0 shrink-0 flex-nowrap gap-1.5 overflow-x-auto rounded-xl bg-slate-50 p-1 lg:w-auto">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onBookingFilterChange(opt.value)}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-3 text-xs font-semibold transition lg:min-h-0 lg:min-w-0 lg:py-1.5 ${
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
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 lg:min-h-0 lg:py-2 lg:text-xs"
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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 lg:text-[11px]">Saved</p>
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
                Save any event, deal, or creator with the heart icon to keep it here for quick access.
              </p>
              <Link
                to="/events"
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 lg:min-h-0 lg:py-2 lg:text-xs"
              >
                Explore events
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
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
