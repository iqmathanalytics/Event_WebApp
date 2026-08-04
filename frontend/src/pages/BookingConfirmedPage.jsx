import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Ticket, Sparkles, MapPin } from "lucide-react";
import useAuth from "../hooks/useAuth";
import { formatCurrency, formatDateUS } from "../utils/format";

export const BOOKING_CONFIRMED_STORAGE_KEY = "bmt_booking_confirmed_v1";

const CONFETTI = [
  { left: "8%", delay: 0.05, color: "bg-rose-500", size: "h-2 w-2" },
  { left: "18%", delay: 0.12, color: "bg-amber-400", size: "h-1.5 w-1.5" },
  { left: "28%", delay: 0.02, color: "bg-emerald-400", size: "h-2.5 w-2.5" },
  { left: "42%", delay: 0.18, color: "bg-rose-400", size: "h-2 w-2" },
  { left: "55%", delay: 0.08, color: "bg-pink-500", size: "h-1.5 w-3" },
  { left: "68%", delay: 0.15, color: "bg-amber-500", size: "h-2 w-2" },
  { left: "78%", delay: 0.04, color: "bg-rose-600", size: "h-2.5 w-1.5" },
  { left: "88%", delay: 0.2, color: "bg-emerald-500", size: "h-2 w-2" }
];

function loadStoredSummary() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(BOOKING_CONFIRMED_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveStoredSummary(summary) {
  if (typeof window === "undefined") return;
  try {
    if (!summary) {
      window.sessionStorage.removeItem(BOOKING_CONFIRMED_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(BOOKING_CONFIRMED_STORAGE_KEY, JSON.stringify(summary));
  } catch {
    // ignore session storage failures
  }
}

function formatMoney(value) {
  return formatCurrency(Number(value || 0), { decimals: 2 });
}

export default function BookingConfirmedPage() {
  const { state } = useLocation();
  const reduceMotion = useReducedMotion();
  const { isAuthenticated } = useAuth();
  const [stored, setStored] = useState(() => loadStoredSummary());

  const summary = useMemo(() => {
    if (state && typeof state === "object") return state;
    return stored;
  }, [state, stored]);

  useEffect(() => {
    if (state && typeof state === "object") {
      saveStoredSummary(state);
      setStored(state);
    }
  }, [state]);

  const dates = Array.isArray(summary?.selectedDates) ? summary.selectedDates : [];
  const title = summary?.event?.title || "Your event";
  const venue = summary?.event?.venue || "";
  const hasSummary = Boolean(summary?.bookingId || summary?.event?.title || summary?.email);

  const paidText = summary?.paidWithCard
    ? `Payment received for ${formatMoney(summary?.totalAmount)}.`
    : `Booking saved for ${formatMoney(summary?.totalAmount)} � no card was required.`;

  const primaryHref = isAuthenticated ? "/dashboard/user" : "/events";
  const primaryLabel = isAuthenticated ? "Open my dashboard" : "Browse more events";

  return (
    <section className="relative isolate min-h-[70vh] overflow-hidden rounded-3xl border border-rose-100/80 bg-white px-5 py-10 shadow-[0_20px_50px_rgba(225,29,72,0.08)] sm:px-8 sm:py-14">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_12%,rgba(244,63,94,0.18),transparent_42%),radial-gradient(circle_at_88%_18%,rgba(251,113,133,0.16),transparent_40%),linear-gradient(180deg,#fff7f9_0%,#ffffff_55%,#fff1f5_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-1/3 h-56 w-56 rounded-full bg-rose-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-10 h-48 w-48 rounded-full bg-pink-300/25 blur-3xl" />

      {!reduceMotion
        ? CONFETTI.map((piece, idx) => (
            <motion.span
              key={`${piece.left}-${idx}`}
              aria-hidden
              className={`pointer-events-none absolute top-8 rounded-full ${piece.color} ${piece.size}`}
              style={{ left: piece.left }}
              initial={{ y: -12, opacity: 0, rotate: 0 }}
              animate={{ y: [0, 28, 12], opacity: [0, 1, 0.2], rotate: [0, 28, -12] }}
              transition={{ duration: 1.8, delay: piece.delay, ease: "easeOut" }}
            />
          ))
        : null}

      <div className="mx-auto w-full max-w-3xl space-y-7 text-center">
        <motion.div
          initial={reduceMotion ? false : { scale: 0.55, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 16 }}
          className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-100"
        >
          {!reduceMotion ? (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border-2 border-emerald-300/70"
              initial={{ scale: 0.7, opacity: 0.8 }}
              animate={{ scale: 1.55, opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          ) : null}
          <CheckCircle2 className="h-11 w-11" strokeWidth={2.6} aria-hidden />
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.45, delay: 0.08 }}
          className="space-y-3"
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Booking confirmed
          </p>
          <h1 className="text-balance font-['Sora'] text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            {hasSummary ? `You're going!` : "Booking confirmed"}
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {hasSummary ? (
              <>
                <span className="font-semibold text-slate-900">{title}</span>
                <span className="block sm:inline sm:before:content-['_|_']"> {paidText}</span>
              </>
            ) : (
              "Your tickets are saved. Open your dashboard to see bookings anytime."
            )}
          </p>
        </motion.div>

        {hasSummary ? (
          <motion.div
            initial={reduceMotion ? false : { y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.55, delay: 0.14 }}
            className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
          >
            {!reduceMotion ? (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-rose-100/50 to-transparent"
                initial={{ x: "-120%" }}
                animate={{ x: "320%" }}
                transition={{ duration: 1.2, delay: 0.35, ease: "easeInOut" }}
              />
            ) : null}

            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-rose-600" aria-hidden />
                <p className="text-sm font-semibold text-slate-900">Your ticket stub</p>
              </div>
              {summary?.paidWithCard ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  Paid
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Confirmed
                </span>
              )}
            </div>

            <div className="space-y-4 px-5 py-5">
              <div>
                <p className="font-['Sora'] text-lg font-bold text-slate-900">{title}</p>
                {venue ? (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {venue}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Booking ID</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {summary?.bookingId || "Sent to your email"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Amount</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{formatMoney(summary?.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email</p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-900">
                    {summary?.email || "On your account"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tickets / days</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {summary?.attendeeCount || 1} ticket{(summary?.attendeeCount || 1) === 1 ? "" : "s"} �{" "}
                    {summary?.totalDays || dates.length || 1} day
                    {(summary?.totalDays || dates.length || 1) === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              {dates.length ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Show dates</p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {dates.map((d) => (
                      <li key={d} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
                        {formatDateUS(d)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {summary?.checkInCode ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
                  Your entry QR code was sent to <strong>{summary?.email || "your email"}</strong>. Show it at venue
                  check-in.
                </p>
              ) : null}
            </div>
          </motion.div>
        ) : (
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-600">
            We couldn�t find booking details for this session. If you just completed a purchase, open your dashboard
            or check your confirmation email.
          </div>
        )}

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.38, delay: 0.22 }}
          className="mx-auto flex w-full max-w-md flex-col gap-3"
        >
          <Link
            to={primaryHref}
            className="inline-flex w-full items-center justify-center rounded-full bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:bg-brand-700"
          >
            {primaryLabel}
          </Link>
          {!isAuthenticated ? (
            <p className="text-xs leading-relaxed text-slate-600">
              Want all tickets in one place? Create your account from the confirmation email to view bookings in your
              dashboard.
            </p>
          ) : (
            <Link to="/events" className="text-sm font-medium text-slate-700 underline-offset-4 hover:underline">
              Continue browsing events
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  );
}
