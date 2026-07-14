import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, ScanLine } from "lucide-react";
import { checkInAdminTicket, verifyAdminTicket } from "../services/adminService";
import { formatCurrency, formatDateUS } from "../utils/format";
import { normalizeCheckInCodeInput } from "../utils/bookingCheckIn";

const SCANNER_ID = "admin-ticket-scanner";
const SCAN_COOLDOWN_MS = 2000;

function TicketDetails({ booking }) {
  if (!booking) {
    return null;
  }
  const dates = (booking.selected_dates || []).map((d) => formatDateUS(d)).join(", ");

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Booking</p>
          <p className="text-lg font-bold text-slate-900">{booking.booking_ref}</p>
        </div>
        {booking.already_checked_in ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Checked in
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
            Valid — not checked in yet
          </span>
        )}
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500">Event</dt>
          <dd className="font-semibold text-slate-900">{booking.event_title}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Guest</dt>
          <dd className="font-semibold text-slate-900">{booking.guest_name}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Email</dt>
          <dd className="break-all text-slate-800">{booking.guest_email}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Tickets</dt>
          <dd className="font-semibold text-slate-900">{booking.attendee_count}</dd>
        </div>
        {booking.selected_seats_label ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">Seats</dt>
            <dd className="font-medium text-slate-800">{booking.selected_seats_label}</dd>
          </div>
        ) : null}
        {dates ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">Show date(s)</dt>
            <dd className="font-medium text-slate-800">{dates}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs text-slate-500">Total</dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {formatCurrency(booking.total_amount)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Type</dt>
          <dd className="font-medium text-slate-800">
            {booking.is_guest_booking ? "Guest checkout" : "Registered user"}
          </dd>
        </div>
      </dl>
      {Array.isArray(booking.ticket_items) && booking.ticket_items.length ? (
        <ul className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
          {booking.ticket_items.map((item, index) => (
            <li key={`${item.level_id || index}-${index}`}>
              {item.level_name || item.name || "Ticket"} × {item.quantity || 1}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function AdminVerifyTicketPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [codeInput, setCodeInput] = useState(() => searchParams.get("code") || "");
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef(null);
  const verifyRequestIdRef = useRef(0);
  const lastVerifiedCodeRef = useRef("");
  const lastScanAtRef = useRef(0);
  const mountedCodeHandledRef = useRef(false);

  const syncCodeInUrl = useCallback(
    (code) => {
      if (!code) {
        return;
      }
      if (searchParams.get("code") === code) {
        return;
      }
      setSearchParams({ code }, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const runVerify = useCallback(
    async (rawCode, { updateUrl = true } = {}) => {
      const code = normalizeCheckInCodeInput(rawCode);
      if (!code) {
        setBooking(null);
        setError("Enter or scan a ticket code.");
        return null;
      }
      if (lastVerifiedCodeRef.current === code && booking) {
        return booking;
      }

      const requestId = verifyRequestIdRef.current + 1;
      verifyRequestIdRef.current = requestId;
      setLoading(true);
      setError("");
      setSuccess("");

      try {
        const res = await verifyAdminTicket(code);
        if (verifyRequestIdRef.current !== requestId) {
          return null;
        }
        const nextBooking = res?.data ?? null;
        setBooking(nextBooking);
        setCodeInput(code);
        lastVerifiedCodeRef.current = code;
        if (updateUrl) {
          syncCodeInUrl(code);
        }
        return nextBooking;
      } catch (err) {
        if (verifyRequestIdRef.current !== requestId) {
          return null;
        }
        setBooking(null);
        lastVerifiedCodeRef.current = "";
        setError(err?.response?.data?.message || "Could not verify this ticket.");
        return null;
      } finally {
        if (verifyRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [booking, syncCodeInUrl]
  );

  useEffect(() => {
    if (mountedCodeHandledRef.current) {
      return;
    }
    const initial = searchParams.get("code");
    if (!initial) {
      return;
    }
    mountedCodeHandledRef.current = true;
    void runVerify(initial, { updateUrl: false });
  }, [runVerify, searchParams]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (_err) {
        /* already stopped */
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setScannerReady(false);
  }, []);

  const startScanner = useCallback(async () => {
    setError("");
    setSuccess("");
    setScannerReady(false);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(SCANNER_ID, { verbose: false });
      }
      setScanning(true);
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 12, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
        (decoded) => {
          const now = Date.now();
          if (now - lastScanAtRef.current < SCAN_COOLDOWN_MS) {
            return;
          }
          const code = normalizeCheckInCodeInput(decoded);
          if (!code || code === lastVerifiedCodeRef.current) {
            return;
          }
          lastScanAtRef.current = now;
          void stopScanner().then(() => runVerify(code));
        },
        () => {}
      );
      setScannerReady(true);
    } catch (_err) {
      await stopScanner();
      setError("Camera access failed. Allow camera permission or enter the code manually.");
    }
  }, [runVerify, stopScanner]);

  useEffect(() => () => {
    void stopScanner();
  }, [stopScanner]);

  const handleCheckIn = async () => {
    const code = normalizeCheckInCodeInput(codeInput);
    if (!code) {
      setError("Enter or scan a ticket code first.");
      return;
    }
    if (!booking) {
      setError("Look up the ticket first, then check in.");
      return;
    }
    if (booking.already_checked_in) {
      setSuccess("This guest is already checked in.");
      return;
    }

    setCheckingIn(true);
    setError("");
    setSuccess("");
    try {
      const res = await checkInAdminTicket(code);
      const payload = res?.data;
      const nextBooking = payload?.booking ?? null;
      if (nextBooking) {
        setBooking(nextBooking);
        lastVerifiedCodeRef.current = code;
      } else if (booking) {
        setBooking({ ...booking, already_checked_in: true });
      }
      setSuccess(res?.message || payload?.message || "Guest checked in successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || "Check-in failed.");
    } finally {
      setCheckingIn(false);
    }
  };

  const showCheckIn = Boolean(booking && !booking.already_checked_in);

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard/admin"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Admin
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Verify ticket QR</h1>
          <p className="text-sm text-slate-600">
            Scan the QR from the guest&apos;s email, then check them in at the door.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-sm font-semibold text-slate-800" htmlFor="ticket-code-input">
          Ticket code
        </label>
        <p className="mt-1 text-xs text-slate-500">
          <strong className="font-semibold text-slate-700">Look up</strong> loads booking details.{" "}
          <strong className="font-semibold text-slate-700">Check in guest</strong> (below) marks entry at the venue.
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="ticket-code-input"
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runVerify(codeInput);
              }
            }}
            placeholder="Paste code or scan below"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => void runVerify(codeInput)}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Looking up…" : "Look up ticket"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {scanning ? (
            <button
              type="button"
              onClick={() => void stopScanner()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Stop camera
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={() => void startScanner()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
            >
              <ScanLine className="h-4 w-4" aria-hidden />
              Scan QR
            </button>
          )}
        </div>

        <div
          id={SCANNER_ID}
          className={`mt-3 overflow-hidden rounded-xl bg-slate-900/95 ${scanning ? "min-h-[280px]" : "hidden"}`}
        />
        {scanning && !scannerReady ? (
          <p className="mt-2 text-center text-xs text-slate-500">Starting camera…</p>
        ) : null}
      </div>

      {loading && !booking ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Loading ticket details…
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {success}
        </p>
      ) : null}

      <TicketDetails booking={booking} />

      {showCheckIn ? (
        <button
          type="button"
          disabled={checkingIn || loading}
          onClick={() => void handleCheckIn()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {checkingIn ? "Checking in…" : "Check in guest"}
        </button>
      ) : null}
    </div>
  );
}
