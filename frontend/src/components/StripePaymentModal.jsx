import { lazy, Suspense, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { buildStripeReturnUrl } from "../utils/stripePaymentReturn";

const StripePaymentCheckout = lazy(() =>
  import("./stripePaymentCheckoutBundle").then((mod) => ({ default: mod.StripePaymentCheckout }))
);

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
  const returnUrl = useMemo(() => {
    if (!eventId) {
      return window.location.href.split("?")[0];
    }
    return buildStripeReturnUrl(eventId);
  }, [eventId, open]);

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
      className="fixed inset-0 z-[380] flex items-end justify-center p-0 lg:items-start lg:p-4 lg:pt-[14vh]"
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

      <div className="stripe-payment-modal relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-t-[1.35rem] border border-slate-200 bg-white shadow-xl lg:rounded-xl">
        <div className="flex shrink-0 flex-col border-b border-slate-100">
          <div className="flex justify-center pt-2.5 lg:hidden" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-slate-300" />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 pb-3.5 pt-2 lg:py-3.5">
            <div>
              <h2 id="stripe-payment-title" className="text-base font-bold text-slate-900">
                Complete payment
              </h2>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-[#E31C5F]">{totalLabel}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-11 w-11 shrink-0 place-content-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:h-9 lg:w-9"
              aria-label="Close"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#E31C5F]" />
              </div>
            }
          >
            <StripePaymentCheckout
              publishableKey={publishableKey}
              clientSecret={clientSecret}
              totalLabel={totalLabel}
              returnUrl={returnUrl}
              paymentIntentId={paymentIntentId}
              onClose={onClose}
              onError={onError}
              onSuccess={onSuccess}
            />
          </Suspense>
        </div>
      </div>

      <style>{`
        .stripe-payment-modal {
          height: min(100dvh, 100%);
          max-height: 96dvh;
          margin-top: auto;
          padding-bottom: env(safe-area-inset-bottom);
        }
        @media (min-width: 1024px) {
          .stripe-payment-modal {
            height: min(580px, calc(100vh - 3rem));
            max-height: min(580px, calc(100vh - 3rem));
            margin-top: 0;
            padding-bottom: 0;
          }
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
