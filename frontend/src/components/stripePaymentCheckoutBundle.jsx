import { useEffect, useMemo, useState } from "react";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Lock } from "lucide-react";
import { getWalletCheckoutEnvironment, getWalletCheckoutHint } from "../utils/walletCheckoutHint";
import { BRAND_NAME } from "../constants/brand";

export const stripeAppearance = {
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

function PaymentForm({
  clientSecret,
  onSuccess,
  onError,
  onClose,
  totalLabel,
  returnUrl
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [expressMethods, setExpressMethods] = useState(null);

  const expressReady = Boolean(
    expressMethods &&
      (expressMethods.applePay ||
        expressMethods.googlePay ||
        expressMethods.amazonPay ||
        expressMethods.link ||
        expressMethods.paypal)
  );
  const applePayInExpress = Boolean(expressMethods?.applePay);
  const googlePayInExpress = Boolean(expressMethods?.googlePay);
  const walletHint = expressMethods != null ? getWalletCheckoutHint(expressMethods) : null;

  const expressPaymentMethodOrder = useMemo(() => {
    const { isIOS } = getWalletCheckoutEnvironment();
    return isIOS ? ["applePay", "googlePay", "amazonPay"] : ["googlePay", "applePay", "amazonPay"];
  }, []);

  const confirmPayment = async (expressEvent) => {
    if (!stripe || !elements) {
      return { ok: false };
    }

    const { error: submitError } = await elements.submit();
    if (submitError) {
      const msg = submitError.message || "Please check your payment details.";
      setFormError(msg);
      onError(msg);
      expressEvent?.paymentFailed?.({ message: msg });
      return { ok: false };
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
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
      expressEvent?.paymentFailed?.({ message: msg });
      return { ok: false };
    }

    if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
      onSuccess(paymentIntent.id);
      return { ok: true };
    }

    const msg = "Payment was not completed. Please try again.";
    setFormError(msg);
    onError(msg);
    expressEvent?.paymentFailed?.({ message: msg });
    return { ok: false };
  };

  const handleExpressConfirm = async (expressEvent) => {
    setFormError("");
    try {
      setSubmitting(true);
      await confirmPayment(expressEvent);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      setSubmitting(true);
      await confirmPayment();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
      <div className="stripe-payment-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4">
        <ExpressCheckoutElement
          options={{
            buttonHeight: 48,
            buttonType: {
              applePay: "buy",
              googlePay: "buy"
            },
            paymentMethods: {
              applePay: "always",
              googlePay: "always",
              amazonPay: "auto",
              link: "never",
              paypal: "never"
            },
            paymentMethodOrder: expressPaymentMethodOrder,
            layout: {
              maxColumns: 1,
              maxRows: 4
            }
          }}
          onConfirm={(event) => void handleExpressConfirm(event)}
          onAvailablePaymentMethodsChange={({ availablePaymentMethods }) => {
            setExpressMethods(availablePaymentMethods ?? null);
          }}
        />

        {walletHint ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            {walletHint}
          </p>
        ) : null}

        {expressReady ? (
          <div className="relative my-4 flex items-center py-1">
            <div className="h-px flex-1 bg-slate-200" aria-hidden />
            <span className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Or pay with card
            </span>
            <div className="h-px flex-1 bg-slate-200" aria-hidden />
          </div>
        ) : null}

        <div className="stripe-payment-element">
          <PaymentElement
            options={{
              layout: { type: "accordion", defaultCollapsed: false, radios: "never" },
              wallets: {
                applePay: applePayInExpress ? "never" : "auto",
                googlePay: googlePayInExpress ? "never" : "auto"
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

export function StripePaymentCheckout({
  publishableKey,
  clientSecret,
  totalLabel,
  returnUrl,
  paymentIntentId,
  onClose,
  onError,
  onSuccess
}) {
  const [stripePromise, setStripePromise] = useState(null);

  useEffect(() => {
    if (!publishableKey) {
      return;
    }
    setStripePromise(loadStripe(publishableKey));
  }, [publishableKey]);

  if (!stripePromise) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#E31C5F]" />
      </div>
    );
  }

  return (
    <Elements
      key={clientSecret}
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: stripeAppearance,
        loader: "auto",
        business: { name: BRAND_NAME }
      }}
    >
      <PaymentForm
        clientSecret={clientSecret}
        totalLabel={totalLabel}
        returnUrl={returnUrl}
        onClose={onClose}
        onError={onError}
        onSuccess={(piId) => onSuccess(piId || paymentIntentId)}
      />
    </Elements>
  );
}
