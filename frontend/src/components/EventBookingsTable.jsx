import { formatCurrency, formatDateUS } from "../utils/format";
import { formatBookingSeatsLabel } from "../utils/bookingSeats";
import {
  BookingAmountPaidCell,
  BookingPaymentStatusCell,
  BookingStripeRefCell
} from "./BookingPaymentTableCells";
import ScrollableTableFrame from "./ScrollableTableFrame";

function GuestBadge({ booking }) {
  const isGuest =
    booking?.is_guest_booking === 1 ||
    booking?.is_guest_booking === true ||
    String(booking?.is_guest_booking || "") === "1" ||
    booking?.user_id == null;
  if (!isGuest) {
    return <span className="text-slate-500">Registered</span>;
  }
  return (
    <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
      Guest
    </span>
  );
}

const th = "px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 whitespace-nowrap";
const td = "px-3 py-2.5 text-sm text-slate-700 align-middle";

export default function EventBookingsTable({
  rows = [],
  loading = false,
  showEventColumn = true,
  emptyMessage = "No bookings yet."
}) {
  const colSpan = showEventColumn ? 13 : 12;

  return (
    <ScrollableTableFrame minWidthClass="min-w-[1280px]" className="hidden md:block">
      <table className="w-full table-fixed text-left text-sm">
        <colgroup>
          <col className="w-[96px]" />
          {showEventColumn ? <col className="w-[220px]" /> : null}
          <col className="w-[140px]" />
          <col className="w-[190px]" />
          <col className="w-[120px]" />
          <col className="w-[72px]" />
          <col className="w-[130px]" />
          <col className="w-[120px]" />
          <col className="w-[96px]" />
          <col className="w-[100px]" />
          <col className="w-[96px]" />
          <col className="w-[120px]" />
          <col className="w-[110px]" />
        </colgroup>
        <thead className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50">
          <tr>
            <th className={th}>Type</th>
            {showEventColumn ? <th className={th}>Event</th> : null}
            <th className={th}>Name</th>
            <th className={th}>Email</th>
            <th className={th}>Phone</th>
            <th className={th}>Guests</th>
            <th className={th}>Seats</th>
            <th className={th}>Dates</th>
            <th className={`${th} text-right`}>Total</th>
            <th className={th}>Payment</th>
            <th className={`${th} text-right`}>Charged</th>
            <th className={th}>Stripe</th>
            <th className={th}>Booked</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className={`${td} text-slate-500`} colSpan={colSpan}>
                Loading bookings…
              </td>
            </tr>
          ) : null}
          {!loading && rows.length === 0 ? (
            <tr>
              <td className={`${td} text-slate-500`} colSpan={colSpan}>
                {emptyMessage}
              </td>
            </tr>
          ) : null}
          {!loading
            ? rows.map((item) => {
                const seatsLabel = formatBookingSeatsLabel(item);
                return (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className={td}>
                      <GuestBadge booking={item} />
                    </td>
                    {showEventColumn ? (
                      <td className={`${td} font-medium text-slate-900`}>
                        <span className="line-clamp-2" title={item.event_title || ""}>
                          {item.event_title || "—"}
                        </span>
                      </td>
                    ) : null}
                    <td className={td}>
                      <span className="block truncate" title={item.name || ""}>
                        {item.name || "—"}
                      </span>
                    </td>
                    <td className={td}>
                      <span className="block truncate" title={item.email || ""}>
                        {item.email || "—"}
                      </span>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{item.phone || "—"}</td>
                    <td className={`${td} whitespace-nowrap`}>{item.attendee_count}</td>
                    <td className={td}>
                      <span className="line-clamp-2" title={seatsLabel || ""}>
                        {seatsLabel || "—"}
                      </span>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {Array.isArray(item.selected_dates) && item.selected_dates.length
                        ? item.selected_dates.map((value) => formatDateUS(value)).join(", ")
                        : item.booking_date
                          ? formatDateUS(item.booking_date)
                          : "—"}
                    </td>
                    <td className={`${td} text-right whitespace-nowrap`}>
                      {formatCurrency(item.total_amount || 0)}
                    </td>
                    <BookingPaymentStatusCell booking={item} />
                    <BookingAmountPaidCell booking={item} className={`${td} text-right`} />
                    <BookingStripeRefCell booking={item} className={td} />
                    <td className={`${td} whitespace-nowrap`}>
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
