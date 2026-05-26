/** Display helpers for event booking payment fields. */

export function paymentStatusMeta(status) {
  const key = String(status || "paid").toLowerCase();
  const map = {
    paid: { label: "Paid", className: "bg-emerald-100 text-emerald-800" },
    free: { label: "Free", className: "bg-slate-100 text-slate-700" },
    pending: { label: "Pending", className: "bg-amber-100 text-amber-800" },
    failed: { label: "Failed", className: "bg-rose-100 text-rose-800" },
    refunded: { label: "Refunded", className: "bg-violet-100 text-violet-800" }
  };
  return map[key] || { label: key, className: "bg-slate-100 text-slate-600" };
}

export function bookingAmountPaidDollars(row) {
  if (row?.amount_paid_cents != null && row.amount_paid_cents !== "") {
    return Number(row.amount_paid_cents) / 100;
  }
  return Number(row?.total_amount || 0);
}

export function formatStripeReference(id) {
  if (!id) {
    return "—";
  }
  const s = String(id);
  if (s.length <= 14) {
    return s;
  }
  return `${s.slice(0, 10)}…${s.slice(-6)}`;
}
