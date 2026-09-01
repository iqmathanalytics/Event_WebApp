import { formatCurrency, formatDateUS } from "../utils/format";
import { formatBookingSeatsLabel } from "../utils/bookingSeats";
import BookingPaymentSummary from "./BookingPaymentSummary";
import BookingPaymentBadge from "./BookingPaymentBadge";
import { BookingAmountPaidCell } from "./BookingPaymentTableCells";
import ScrollableTableFrame from "./ScrollableTableFrame";

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
  "sticky top-0 z-[1] bg-slate-50 px-3.5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 whitespace-nowrap first:pl-4 last:pr-4";
const thRightClass = `${thClass} text-right`;
const tdClass = "px-3.5 py-3 align-middle text-slate-700 first:pl-4 last:pr-4";
const tdMutedClass = `${tdClass} text-slate-600`;
const tdRightClass = `${tdClass} text-right tabular-nums`;

/**
 * Mobile/card booking list — same content for organizer and shared viewers.
 */
export function OrganizerBookingsMobileCards({ rows, loading, rowKeyPrefix = "book-card" }) {
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
              <p className="min-w-0 text-sm font-semibold leading-snug text-slate-900">{item.event_title}</p>
              {isGuestBooking(item) ? (
                <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                  Guest
                </span>
              ) : (
                <span className="shrink-0 text-xs font-medium text-slate-500">Registered</span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-600">
              {item.name}
              {item.email ? <span className="text-slate-400"> · {item.email}</span> : null}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600">
              <p>
                <span className="font-semibold text-slate-700">Phone:</span> {item.phone || "—"}
              </p>
              <p>
                <span className="font-semibold text-slate-700">Guests:</span> {item.attendee_count}
              </p>
              <p className="col-span-2">
                <span className="font-semibold text-slate-700">Dates:</span> {formatSelectedDates(item)}
              </p>
              {seatsLabel ? (
                <p className="col-span-2">
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
            </div>
          </article>
        );
      })}
    </div>
  );
}

/**
 * Desktop bookings table shared by organizer Event Bookings and shared-event view.
 * Stripe reference column intentionally omitted.
 */
export function OrganizerBookingsDesktopTable({ rows, loading, rowKeyPrefix = "book-row" }) {
  return (
    <ScrollableTableFrame minWidthClass="min-w-[1120px]" maxHeightClass="max-h-[min(65vh,40rem)]">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className={thClass}>Type</th>
            <th className={thClass}>Event Name</th>
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
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td className={`${tdMutedClass} py-6`} colSpan={13}>
                Loading bookings…
              </td>
            </tr>
          ) : null}
          {!loading && !rows?.length ? (
            <tr>
              <td className={`${tdMutedClass} py-6`} colSpan={13}>
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
                    <td className={`${tdClass} max-w-[220px] font-medium text-slate-900`}>
                      <span className="line-clamp-2" title={item.event_title || ""}>
                        {item.event_title}
                      </span>
                    </td>
                    <td className={`${tdMutedClass} max-w-[140px]`}>
                      <span className="block truncate" title={item.name || ""}>
                        {item.name}
                      </span>
                    </td>
                    <td className={`${tdMutedClass} max-w-[180px]`}>
                      <span className="block truncate" title={item.email || ""}>
                        {item.email}
                      </span>
                    </td>
                    <td className={`${tdMutedClass} whitespace-nowrap`}>{item.phone || "—"}</td>
                    <td className={`${tdMutedClass} whitespace-nowrap tabular-nums`}>{item.attendee_count}</td>
                    <td className={`${tdMutedClass} max-w-[140px]`}>
                      <span className="line-clamp-2" title={seatsLabel || ""}>
                        {seatsLabel || "—"}
                      </span>
                    </td>
                    <td className={`${tdMutedClass} max-w-[160px]`}>
                      <span className="line-clamp-2" title={formatSelectedDates(item)}>
                        {formatSelectedDates(item)}
                      </span>
                    </td>
                    <td className={`${tdRightClass} font-semibold text-slate-900 whitespace-nowrap`}>
                      {formatCurrency(item.total_amount || 0)}
                    </td>
                    <td className={tdClass}>
                      <BookingPaymentBadge status={item?.payment_status} />
                      {item?.coupon_code ? (
                        <p className="mt-1 text-[10px] font-medium text-slate-500">{item.coupon_code}</p>
                      ) : null}
                    </td>
                    <BookingAmountPaidCell
                      booking={item}
                      className="px-3.5 py-3 text-right align-middle text-slate-700 first:pl-4 last:pr-4"
                    />
                    <td className={tdClass}>
                      {item.vendor_code ? (
                        <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-900">
                          {item.vendor_code}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className={`${tdMutedClass} whitespace-nowrap`}>
                      {item.created_at ? formatDateUS(String(item.created_at).slice(0, 10)) : "—"}
                    </td>
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
export default function OrganizerBookingsTable({ rows, loading, rowKeyPrefix = "book" }) {
  return (
    <>
      <div className="md:hidden">
        <OrganizerBookingsMobileCards rows={rows} loading={loading} rowKeyPrefix={`${rowKeyPrefix}-card`} />
      </div>
      <div className="hidden md:block">
        <OrganizerBookingsDesktopTable rows={rows} loading={loading} rowKeyPrefix={`${rowKeyPrefix}-row`} />
      </div>
    </>
  );
}
