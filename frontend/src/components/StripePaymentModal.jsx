import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Lock, X } from "lucide-react";
import { buildStripeReturnUrl } from "../utils/stripePaymentReturn";

const stripeAppearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#E31C5F",
    colorText: "#0f172a",
    colorDanger: "#e11d48",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    fontSizeBase: "14px",
    spacingUnit: "3px",
    borderRadius: "8px"
  },
  rules: {
    ".Input": {
      border: "1px solid #cbd5e1",
      boxShadow: "none",
      padding: "10px 12px"
    },
    ".Label": {
      fontWeight: "600",
      fontSize: "13px",
      marginBottom: "4px"
    },
    ".AccordionItem": {
      border: "1px solid #e2e8f0",
      borderRadius: "10px",
      boxShadow: "none"
    },
    ".Block": {
      backgroundColor: "transparent",
      boxShadow: "none",
      padding: "0"
    }
  }
};

function PaymentForm({ onSuccess, onError, onClose, totalLabel, returnUrl }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!stripe || !elements) {
      return;
    }
    try {
      setSubmitting(true);
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: "if_required"
      });

      if (error) {
        const msg =
          error.type === "card_error" || error.type === "validation_error"
            ? error.message
            : "Payment could not be completed. Please try again.";
        setFormError(msg);
        onError(msg);
        return;
      }

      if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
        onSuccess(paymentIntent.id);
        return;
      }

      setFormError("Payment was not completed. Please try again.");
      onError("Payment was not completed.");
    } catch (err) {
      const msg = err?.message || "Payment failed. Please try again.";
      setFormError(msg);
      onError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
      {/* Only this section scrolls */}
      <div className="stripe-payment-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4">
        <div className="stripe-payment-element">
          <PaymentElement
            options={{
              layout: { type: "tabs" },
              paymentMethodOrder: ["apple_pay", "google_pay", "card"],
              wallets: {
                applePay: "auto",
                googlePay: "auto"
              }
            }}
          />
        </div>
        {formError ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {formError}
          </p>
        ) : null}
      </div>

      {/* Fixed footer — never scrolls away */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3.5 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-lg border border-slate-300 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!stripe || submitting}
            className="flex-1 rounded-lg bg-[#E31C5F] py-3 text-sm font-semibold text-white hover:bg-[#D70466] disabled:opacity-50"
          >
            {submitting ? "Processing…" : `Pay ${totalLabel}`}
          </button>
        </div>
        <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <Lock className="h-3 w-3" aria-hidden />
          Secured by Stripe
        </p>
      </div>
    </form>
  );
}

export default function StripePaymentModal({
  open,
  onClose,
  clientSecret,
  publishableKey,
  paymentIntentId,
  eventId,
  totalLabel,
  onSuccess,
  onError
}) {
  const [stripePromise, setStripePromise] = useState(null);

  const returnUrl = useMemo(() => {
    if (!eventId) {
      return window.location.href.split("?")[0];
    }
    return buildStripeReturnUrl(eventId);
  }, [eventId, open]);

  useEffect(() => {
    if (!open || !publishableKey) {
      return;
    }
    setStripePromise(loadStripe(publishableKey));
  }, [open, publishableKey]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !clientSecret || !publishableKey) {
    return null;
  }

  const modal = (
    <div
      className="fixed inset-0 z-[380] flex items-start justify-center p-4 pt-[12vh] sm:pt-[14vh]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stripe-payment-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]"
        aria-label="Close payment"
        onClick={onClose}
      />

      <div className="stripe-payment-modal relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
          <div>
            <h2 id="stripe-payment-title" className="text-base font-bold text-slate-900">
              Complete payment
            </h2>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-[#E31C5F]">{totalLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {stripePromise ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: stripeAppearance,
                loader: "auto"
              }}
            >
              <PaymentForm
                totalLabel={totalLabel}
                returnUrl={returnUrl}
                onClose={onClose}
                onError={onError}
                onSuccess={(piId) => onSuccess(piId || paymentIntentId)}
              />
            </Elements>
          ) : (
            <div className="flex flex-1 items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#E31C5F]" />
            </div>
          )}
        </div>
      </div>

      <style>{`
        .stripe-payment-modal {
          height: min(520px, calc(100vh - 3rem));
          max-height: min(520px, calc(100vh - 3rem));
        }
        .stripe-payment-element {
          width: 100%;
          overflow: visible !important;
        }
        .stripe-payment-element > div {
          width: 100% !important;
          max-width: 100% !important;
        }
        .stripe-payment-element iframe {
          max-width: 100% !important;
        }
      `}</style>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}
