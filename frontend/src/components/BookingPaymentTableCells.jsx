import BookingPaymentBadge from "./BookingPaymentBadge";
import { bookingAmountPaidDollars, formatStripeReference } from "../utils/bookingPayment";
import { formatCurrency } from "../utils/format";

export function BookingPaymentStatusCell({ booking }) {
  return (
    <td className="px-2 py-2 align-top">
      <BookingPaymentBadge status={booking?.payment_status} />
      {booking?.coupon_code ? (
        <p className="mt-1 text-[10px] text-slate-500">{booking.coupon_code}</p>
      ) : null}
    </td>
  );
}

export function BookingAmountPaidCell({ booking, className = "px-2 py-2 text-right text-slate-600 align-top" }) {
  return (
    <td className={className}>
      <p>{formatCurrency(bookingAmountPaidDollars(booking))}</p>
      {Number(booking?.total_amount) !== bookingAmountPaidDollars(booking) && booking?.subtotal_amount != null ? (
        <p className="text-[10px] text-slate-500">Order {formatCurrency(booking.total_amount)}</p>
      ) : null}
    </td>
  );
}

export function BookingStripeRefCell({ booking, className = "px-2 py-2 text-slate-600 align-top" }) {
  const ref = booking?.stripe_payment_intent_id;
  return (
    <td className={className}>
      {ref ? (
        <span className="font-mono text-[10px]" title={ref}>
          {formatStripeReference(ref)}
        </span>
      ) : (
        <span className="text-slate-400">—</span>
      )}
    </td>
  );
}

/** Admin table variant with px-4 padding */
export function AdminBookingPaymentStatusCell({ booking }) {
  return (
    <td className="px-4 py-3 align-top">
      <BookingPaymentBadge status={booking?.payment_status} />
      {booking?.coupon_code ? (
        <p className="mt-1 text-[10px] text-slate-500">{booking.coupon_code}</p>
      ) : null}
    </td>
  );
}

export function AdminBookingAmountPaidCell({ booking }) {
  return <BookingAmountPaidCell booking={booking} className="px-4 py-3 text-right text-slate-600 align-top" />;
}

export function AdminBookingStripeRefCell({ booking }) {
  return <BookingStripeRefCell booking={booking} className="px-4 py-3 text-slate-600 align-top" />;
}
