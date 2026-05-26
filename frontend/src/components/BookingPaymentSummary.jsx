import BookingPaymentBadge from "./BookingPaymentBadge";
import { bookingAmountPaidDollars, formatStripeReference } from "../utils/bookingPayment";
import { formatCurrency } from "../utils/format";

/** Payment row snippet for booking cards and table cells. */
export default function BookingPaymentSummary({ booking, showStripeRef = true, compact = false }) {
  const charged = bookingAmountPaidDollars(booking);
  const hasCoupon = Boolean(booking?.coupon_code);

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <BookingPaymentBadge status={booking?.payment_status} />
        <span className="text-xs text-slate-600">
          {formatCurrency(charged)}
          {hasCoupon ? ` · ${booking.coupon_code}` : ""}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1 text-xs text-slate-600">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-700">Payment:</span>
        <BookingPaymentBadge status={booking?.payment_status} />
        <span>
          <span className="font-semibold">Charged:</span> {formatCurrency(charged)}
        </span>
      </p>
      {hasCoupon ? (
        <p>
          <span className="font-semibold">Coupon:</span> {booking.coupon_code}
          {booking.discount_amount > 0 ? ` (−${formatCurrency(booking.discount_amount)})` : ""}
        </p>
      ) : null}
      {showStripeRef && booking?.stripe_payment_intent_id ? (
        <p className="font-mono text-[10px] text-slate-500" title={booking.stripe_payment_intent_id}>
          Stripe: {formatStripeReference(booking.stripe_payment_intent_id)}
        </p>
      ) : null}
    </div>
  );
}
