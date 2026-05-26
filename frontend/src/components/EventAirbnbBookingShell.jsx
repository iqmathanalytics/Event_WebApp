import { Link } from "react-router-dom";
import { trackEventClick } from "../services/eventService";
import { trackEventTicketClick } from "../utils/googleAnalytics";
import { Ticket } from "lucide-react";
import { formatCurrency } from "../utils/format";
import { BRAND_NAME } from "../constants/brand";

export default function EventAirbnbBookingShell({
  event,
  ticketSalesMode,
  isGuest,
  scheduleLabel,
  timeLabel,
  pricePerDay
}) {
  const pillText =
    ticketSalesMode === "platform"
      ? `${BRAND_NAME} — your city's event guide`
      : "Tickets sold by the organizer";
  const priceLine =
    pricePerDay > 0 ? (
      <>
        <span className="underline decoration-2 underline-offset-4">{formatCurrency(pricePerDay)}</span>
        <span className="ml-1 text-base font-normal text-slate-900"> per ticket</span>
      </>
    ) : (
      <span className="text-xl font-semibold text-slate-900">Free event</span>
    );

  const guestRowLabel = isGuest
    ? `Sign in on ${BRAND_NAME}`
    : ticketSalesMode === "external"
      ? "Checkout continues off-site"
      : "—";

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_6px_20px_rgba(0,0,0,0.08)] ring-1 ring-slate-900/[0.04] sm:p-6">
      <div className="-mt-1 mb-4 flex justify-center sm:-mt-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
          <Ticket className="shrink-0 text-rose-500" size={14} strokeWidth={2} aria-hidden />
          {pillText}
        </div>
      </div>

      <div className="mb-5">
        <p className="text-2xl font-semibold leading-tight tracking-tight text-slate-900">{priceLine}</p>
        <p className="mt-1.5 text-sm text-slate-600">
          {ticketSalesMode === "platform"
            ? isGuest
              ? `Sign in to book tickets through ${BRAND_NAME}.`
              : `Complete your booking on ${BRAND_NAME} — we do not charge your card on this step.`
            : "You’ll leave Book My Tickets to buy tickets on the organizer’s site."}
        </p>
      </div>

      <div className="mb-4 overflow-hidden rounded-xl border border-slate-300">
        <div className="grid grid-cols-2 divide-x divide-slate-300">
          <button
            type="button"
            className="w-full cursor-default bg-white p-3.5 text-left outline-none"
            tabIndex={-1}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-900">Event date</p>
            <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-900">{scheduleLabel}</p>
          </button>
          <button type="button" className="w-full cursor-default bg-white p-3.5 text-left outline-none" tabIndex={-1}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-900">Time</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{timeLabel}</p>
          </button>
        </div>
        <div className="flex items-center justify-between border-t border-slate-300 bg-white px-3.5 py-3.5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-900">Tickets</p>
            <p className="mt-1 truncate text-sm font-medium text-slate-900">{guestRowLabel}</p>
          </div>
          <span className="shrink-0 text-slate-500" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </div>
      </div>

      <div className="mb-4 rounded-xl bg-slate-100 px-4 py-2.5 text-center text-sm text-slate-600">
        {ticketSalesMode === "platform"
          ? `No payment on ${BRAND_NAME} here — you’ll get a booking summary after you submit.`
          : "Price, fees, and refund rules are decided by the organizer, not Book My Tickets."}
      </div>

      {isGuest ? (
        <Link
          to="/login"
          className="flex w-full items-center justify-center rounded-full bg-[#E31C5F] py-3.5 text-center text-base font-semibold text-white transition hover:bg-[#D70466]"
        >
          {ticketSalesMode === "platform" ? "Sign in to book tickets" : "Sign in to continue"}
        </Link>
      ) : ticketSalesMode === "external" && event.ticket_link ? (
        <a
          href={event.ticket_link}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            if (event?.id) {
              trackEventTicketClick({ eventId: event.id, clickType: "external" });
              trackEventClick(event.public_slug || event.id).catch(() => {});
            }
          }}
          className="flex w-full items-center justify-center rounded-full bg-[#E31C5F] py-3.5 text-center text-base font-semibold text-white transition hover:bg-[#D70466]"
        >
          Buy tickets from organizer
        </a>
      ) : ticketSalesMode === "external" ? (
        <button
          type="button"
          disabled
          className="w-full cursor-not-allowed rounded-full bg-slate-200 py-3.5 text-center text-base font-semibold text-slate-500"
        >
          Organizer ticket link missing
        </button>
      ) : null}

      <p className="mt-3 text-center text-xs text-slate-600">{`Payment is not collected on ${BRAND_NAME} yet.`}</p>
    </div>
  );
}
