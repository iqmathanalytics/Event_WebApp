import { useState } from "react";
import { formatCurrency, formatDateUS } from "../utils/format";
import { formatBookingSeatsLabel } from "../utils/bookingSeats";
import BookingPaymentSummary from "./BookingPaymentSummary";
import BookingPaymentBadge from "./BookingPaymentBadge";
import { BookingAmountPaidCell } from "./BookingPaymentTableCells";
import ScrollableTableFrame from "./ScrollableTableFrame";
import { resendOrganizerBookingEmail } from "../services/bookingService";

function isGuestBooking(item) {
  return (
    item?.is_guest_booking === 1 ||
    item?.is_guest_booking === true ||
    String(item?.is_guest_booking || "") === "1" ||
    item?.user_id == null
  );
}

function formatSelectedDates(item) {
  if (Array.isArray(item?.selected_dates) && item.selected_dates.length) {
    return item.selected_dates.map((value) => formatDateUS(value)).join(", ");
  }
  return "—";
}

const thClass =
  "sticky top-0 z-[1] bg-slate-50 px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 first:pl-4 last:pr-4";
const thRightClass = `${thClass} text-right`;
const tdClass = "px-3.5 py-3.5 align-top text-slate-700 first:pl-4 last:pr-4";
const tdMutedClass = `${tdClass} text-slate-600`;
const tdRightClass = `${tdClass} text-right tabular-nums`;

function ResendTicketEmailButton({ bookingId, guestEmail, onDone }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  const onResend = async () => {
    if (!bookingId || busy) {
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await resendOrganizerBookingEmail(bookingId);
      setStatus({ ok: true, message: guestEmail ? `Sent to ${guestEmail}` : "Email resent" });
      onDone?.({ ok: true });
    } catch (err) {
      const message = err?.response?.data?.message || "Could not resend email.";
      setStatus({ ok: false, message });
      onDone?.({ ok: false, message });
    } finally {
      setBusy(false);
      window.setTimeout(() => setStatus(null), 4000);
    }
  };

  return (
    <div className="min-w-[7.5rem]">
      <button
        type="button"
        onClick={() => void onResend()}
        disabled={busy}
        className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
        title="Resend ticket confirmation email to the attendee"
      >
        {busy ? "Sending…" : "Resend email"}
      </button>
      {status ? (
        <p className={`mt-1 text-[10px] font-medium leading-snug ${status.ok ? "text-emerald-700" : "text-rose-600"}`}>
          {status.message}
        </p>
      ) : null}
    </div>
  );
}

function CellText({ children, title, className = "" }) {
  return (
    <span className={`block break-words whitespace-normal leading-snug ${className}`} title={title || undefined}>
      {children}
    </span>
  );
}

/**
 * Mobile/card booking list — same content for organizer and shared viewers.
 */
export function OrganizerBookingsMobileCards({
  rows,
  loading,
  rowKeyPrefix = "book-card",
  allowResend = false,
  hideEventColumn = false
}) {
  if (loading) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 text-sm text-slate-500">
        Loading bookings…
      </p>
    );
  }
  if (!rows?.length) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-3.5 text-sm text-slate-500">
        No bookings match the selected filters.
      </p>
    );
  }
  return (
    <div className="space-y-2.5">
      {rows.map((item) => {
        const seatsLabel = formatBookingSeatsLabel(item);
        return (
          <article
            key={`${rowKeyPrefix}-${item.id}`}
            className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-sm font-semibold leading-snug text-slate-900 break-words">
                {hideEventColumn ? item.name : item.event_title}
              </p>
              {isGuestBooking(item) ? (
                <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                  Guest
                </span>
              ) : (
                <span className="shrink-0 text-xs font-medium text-slate-500">Registered</span>
              )}
            </div>
            {!hideEventColumn ? (
              <p className="mt-1.5 text-xs leading-snug text-slate-600 break-words">
                {item.name}
                {item.email ? <span className="text-slate-400"> · {item.email}</span> : null}
              </p>
            ) : item.email ? (
              <p className="mt-1.5 text-xs leading-snug text-slate-600 break-words">{item.email}</p>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs leading-snug text-slate-600">
              <p>
                <span className="font-semibold text-slate-700">Phone:</span> {item.phone || "—"}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Guests:</span> {item.attendee_count}
              </p>
              <p className="col-span-2 break-words">
                <span className="font-semibold text-slate-700">Dates:</span> {formatSelectedDates(item)}
              </p>
              {seatsLabel ? (
                <p className="col-span-2 break-words">
                  <span className="font-semibold text-slate-700">Seats:</span> {seatsLabel}
                </p>
              ) : null}
              {item.vendor_code ? (
                <p className="col-span-2">
                  <span className="font-semibold text-slate-700">Vendor:</span>{" "}
                  <span className="font-semibold uppercase tracking-wide text-cyan-900">{item.vendor_code}</span>
                </p>
              ) : null}
              <p>
                <span className="font-semibold text-slate-700">Total:</span>{" "}
                {formatCurrency(item.total_amount || 0)}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Booked:</span>{" "}
                {item.created_at ? formatDateUS(String(item.created_at).slice(0, 10)) : "—"}
              </p>
              <div className="col-span-2 mt-1">
                <BookingPaymentSummary booking={item} />
              </div>
              {allowResend ? (
                <div className="col-span-2 mt-2 border-t border-slate-100 pt-2">
                  <ResendTicketEmailButton bookingId={item.id} guestEmail={item.email} />
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

/**
 * Desktop bookings table shared by organizer Event Bookings and shared-event view.
 */
export function OrganizerBookingsDesktopTable({
  rows,
  loading,
  rowKeyPrefix = "book-row",
  allowResend = false,
  compactEventColumn = false,
  readable = false
}) {
  const hideEventColumn = Boolean(compactEventColumn);
  const baseCols = hideEventColumn ? 12 : 13;
  const colCount = allowResend ? baseCols + 1 : baseCols;
  const wrapClass = readable ? "break-words whitespace-normal" : "";

  return (
    <ScrollableTableFrame
      minWidthClass={allowResend ? "min-w-[1280px]" : hideEventColumn ? "min-w-[1080px]" : "min-w-[1180px]"}
      maxHeightClass="max-h-[min(70vh,44rem)]"
    >
      <table className="w-full border-collapse table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[7%]" />
          {hideEventColumn ? null : <col className="w-[14%]" />}
          <col className="w-[11%]" />
          <col className="w-[14%]" />
          <col className="w-[9%]" />
          <col className="w-[5%]" />
          <col className="w-[9%]" />
          <col className="w-[10%]" />
          <col className="w-[7%]" />
          <col className="w-[8%]" />
          <col className="w-[7%]" />
          <col className="w-[6%]" />
          <col className="w-[7%]" />
          {allowResend ? <col className="w-[9%]" /> : null}
        </colgroup>
        <thead>
          <tr className="border-b border-slate-200">
            <th className={thClass}>Type</th>
            {hideEventColumn ? null : <th className={thClass}>Event Name</th>}
            <th className={thClass}>Attendee</th>
            <th className={thClass}>Email</th>
            <th className={thClass}>Phone</th>
            <th className={thClass}>Guests</th>
            <th className={thClass}>Seats</th>
            <th className={thClass}>Event Dates</th>
            <th className={thRightClass}>Total</th>
            <th className={thClass}>Payment</th>
            <th className={thRightClass}>Charged</th>
            <th className={thClass}>Vendor</th>
            <th className={thClass}>Booked</th>
            {allowResend ? <th className={thClass}>Ticket email</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td className={`${tdMutedClass} py-6`} colSpan={colCount}>
                Loading bookings…
              </td>
            </tr>
          ) : null}
          {!loading && !rows?.length ? (
            <tr>
              <td className={`${tdMutedClass} py-6`} colSpan={colCount}>
                No bookings match the selected filters.
              </td>
            </tr>
          ) : null}
          {!loading
            ? rows.map((item) => {
                const seatsLabel = formatBookingSeatsLabel(item);
                return (
                  <tr
                    key={`${rowKeyPrefix}-${item.id}`}
                    className="bg-white transition-colors hover:bg-slate-50/90"
                  >
                    <td className={tdClass}>
                      {isGuestBooking(item) ? (
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                          Guest
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">Registered</span>
                      )}
                    </td>
                    {hideEventColumn ? null : (
                      <td className={`${tdClass} font-medium text-slate-900`}>
                        <CellText title={item.event_title || ""} className={wrapClass}>
                          {item.event_title}
                        </CellText>
                      </td>
                    )}
                    <td className={tdMutedClass}>
                      <CellText title={item.name || ""} className={wrapClass}>
                        {item.name}
                      </CellText>
                    </td>
                    <td className={tdMutedClass}>
                      <CellText title={item.email || ""} className={`${wrapClass} text-[13px]`}>
                        {item.email}
                      </CellText>
                    </td>
                    <td className={tdMutedClass}>
                      <CellText className={wrapClass}>{item.phone || "—"}</CellText>
                    </td>
                    <td className={`${tdMutedClass} tabular-nums`}>{item.attendee_count}</td>
                    <td className={tdMutedClass}>
                      <CellText title={seatsLabel || ""} className={wrapClass}>
                        {seatsLabel || "—"}
                      </CellText>
                    </td>
                    <td className={tdMutedClass}>
                      <CellText title={formatSelectedDates(item)} className={wrapClass}>
                        {formatSelectedDates(item)}
                      </CellText>
                    </td>
                    <td className={`${tdRightClass} font-semibold text-slate-900`}>
                      {formatCurrency(item.total_amount || 0)}
                    </td>
                    <td className={tdClass}>
                      <BookingPaymentBadge status={item?.payment_status} />
                      {item?.coupon_code ? (
                        <p className="mt-1 break-words text-[10px] font-medium leading-snug text-slate-500">
                          {item.coupon_code}
                        </p>
                      ) : null}
                    </td>
                    <BookingAmountPaidCell
                      booking={item}
                      className="px-3.5 py-3.5 text-right align-top text-slate-700 first:pl-4 last:pr-4"
                    />
                    <td className={tdClass}>
                      {item.vendor_code ? (
                        <span className="inline-flex max-w-full break-words rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-900">
                          {item.vendor_code}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className={tdMutedClass}>
                      {item.created_at ? formatDateUS(String(item.created_at).slice(0, 10)) : "—"}
                    </td>
                    {allowResend ? (
                      <td className={tdClass}>
                        <ResendTicketEmailButton bookingId={item.id} guestEmail={item.email} />
                      </td>
                    ) : null}
                  </tr>
                );
              })
            : null}
        </tbody>
      </table>
    </ScrollableTableFrame>
  );
}

/** Responsive wrapper: cards on small screens, table from md up. */
export default function OrganizerBookingsTable({
  rows,
  loading,
  rowKeyPrefix = "book",
  allowResend = false,
  compactEventColumn = false,
  readable = false
}) {
  return (
    <>
      <div className="md:hidden">
        <OrganizerBookingsMobileCards
          rows={rows}
          loading={loading}
          rowKeyPrefix={`${rowKeyPrefix}-card`}
          allowResend={allowResend}
          hideEventColumn={compactEventColumn}
        />
      </div>
      <div className="hidden md:block">
        <OrganizerBookingsDesktopTable
          rows={rows}
          loading={loading}
          rowKeyPrefix={`${rowKeyPrefix}-row`}
          allowResend={allowResend}
          compactEventColumn={compactEventColumn}
          readable={readable || compactEventColumn}
        />
      </div>
    </>
  );
}
