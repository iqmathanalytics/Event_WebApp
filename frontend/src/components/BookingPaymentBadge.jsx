import { paymentStatusMeta } from "../utils/bookingPayment";

export default function BookingPaymentBadge({ status, className = "" }) {
  const meta = paymentStatusMeta(status);
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.className} ${className}`}
    >
      {meta.label}
    </span>
  );
}
