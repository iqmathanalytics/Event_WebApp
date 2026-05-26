import { formatCurrency, formatDateUS } from "../utils/format";
import {
  BookingAmountPaidCell,
  BookingPaymentStatusCell,
  BookingStripeRefCell
} from "./BookingPaymentTableCells";

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

export default function EventBookingsTable({
  rows = [],
  loading = false,
  showEventColumn = true,
  emptyMessage = "No bookings yet."
}) {
  const colSpan = showEventColumn ? 12 : 11;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-2 py-2">Type</th>
            {showEventColumn ? <th className="px-2 py-2">Event</th> : null}
            <th className="px-2 py-2">Name</th>
            <th className="px-2 py-2">Email</th>
            <th className="px-2 py-2">Phone</th>
            <th className="px-2 py-2">Guests</th>
            <th className="px-2 py-2">Dates</th>
            <th className="px-2 py-2 text-right">Total</th>
            <th className="px-2 py-2">Payment</th>
            <th className="px-2 py-2 text-right">Charged</th>
            <th className="px-2 py-2">Stripe</th>
            <th className="px-2 py-2">Booked</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="px-2 py-3 text-slate-500" colSpan={colSpan}>
                Loading bookings…
              </td>
            </tr>
          ) : null}
          {!loading && rows.length === 0 ? (
            <tr>
              <td className="px-2 py-3 text-slate-500" colSpan={colSpan}>
                {emptyMessage}
              </td>
            </tr>
          ) : null}
          {!loading
            ? rows.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-2 py-2">
                    <GuestBadge booking={item} />
                  </td>
                  {showEventColumn ? (
                    <td className="px-2 py-2 font-medium text-slate-900">{item.event_title || "—"}</td>
                  ) : null}
                  <td className="px-2 py-2 text-slate-700">{item.name || "—"}</td>
                  <td className="px-2 py-2 text-slate-700">{item.email || "—"}</td>
                  <td className="px-2 py-2 text-slate-700">{item.phone || "—"}</td>
                  <td className="px-2 py-2 text-slate-700">{item.attendee_count}</td>
                  <td className="px-2 py-2 text-slate-700">
                    {Array.isArray(item.selected_dates) && item.selected_dates.length
                      ? item.selected_dates.map((value) => formatDateUS(value)).join(", ")
                      : item.booking_date
                        ? formatDateUS(item.booking_date)
                        : "—"}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-700">
                    {formatCurrency(item.total_amount || 0)}
                  </td>
                  <BookingPaymentStatusCell booking={item} />
                  <BookingAmountPaidCell booking={item} />
                  <BookingStripeRefCell booking={item} />
                  <td className="px-2 py-2 text-slate-700">
                    {item.created_at ? formatDateUS(String(item.created_at).slice(0, 10)) : "—"}
                  </td>
                </tr>
              ))
            : null}
        </tbody>
      </table>
    </div>
  );
}
