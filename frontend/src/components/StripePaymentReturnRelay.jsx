import { useEffect } from "react";
import { clearStripeReturnParams, STRIPE_PAYMENT_MESSAGE } from "../utils/stripePaymentReturn";

/** Shown in a Cash App / wallet popup after redirect — notifies opener and closes. */
export default function StripePaymentReturnRelay({ paymentIntentId, redirectStatus }) {
  useEffect(() => {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          type: STRIPE_PAYMENT_MESSAGE,
          paymentIntentId,
          redirectStatus: redirectStatus || "succeeded"
        },
        window.location.origin
      );
    }
    clearStripeReturnParams();
    const closeTimer = window.setTimeout(() => {
      window.close();
    }, 600);
    return () => window.clearTimeout(closeTimer);
  }, [paymentIntentId, redirectStatus]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Payment received</p>
      <p className="mt-2 text-sm text-slate-600">Returning you to your booking…</p>
      <p className="mt-4 text-xs text-slate-500">You can close this window if it does not close automatically.</p>
    </div>
  );
}
