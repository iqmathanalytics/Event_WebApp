import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, ScanLine, Ticket } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { checkInTicket, lookupCheckInTicket } from "../services/checkInService";
import { formatCurrency, formatDateUS } from "../utils/format";
import { normalizeCheckInCodeInput } from "../utils/bookingCheckIn";
import { useRouteContentReady } from "../context/RouteContentReadyContext";

const SCANNER_ID = "venue-check-in-scanner";
const SCAN_COOLDOWN_MS = 900;

function TicketCard({ booking }) {
  if (!booking) {
    return null;
  }
  const dates = (booking.selected_dates || []).map((d) => formatDateUS(d)).join(", ");

  return (
    <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Booking</p>
          <p className="text-lg font-bold text-slate-900">{booking.booking_ref}</p>
        </div>
        {booking.already_checked_in ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Checked in
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
            Valid — ready
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
          <dt className="text-xs text-slate-500">Tickets</dt>
          <dd className="font-semibold text-slate-900">{booking.attendee_count}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Total</dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {formatCurrency(booking.total_amount)}
          </dd>
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
      </dl>
    </div>
  );
}

export default function CheckInPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [codeInput, setCodeInput] = useState(() => searchParams.get("code") || "");
  const [booking, setBooking] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraHint, setCameraHint] = useState("Starting camera…");
  const scannerRef = useRef(null);
  const requestIdRef = useRef(0);
  const lastHandledCodeRef = useRef("");
  const lastScanAtRef = useRef(0);
  const runCheckInRef = useRef(null);
  const mountedCodeHandledRef = useRef(false);

  useRouteContentReady(false);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (!scanner) {
      return;
    }
    try {
      await scanner.stop();
    } catch (_err) {
      /* already stopped */
    }
    try {
      await scanner.clear();
    } catch (_err) {
      /* ignore */
    }
  }, []);

  const runCheckIn = useCallback(
    async (rawCode, { updateUrl = true } = {}) => {
      const code = normalizeCheckInCodeInput(rawCode);
      if (!code) {
        setError("Scan a ticket QR or enter a code.");
        return null;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setBusy(true);
      setError("");
      setSuccess("");
      setCodeInput(code);

      try {
        const res = await checkInTicket(code);
        if (requestIdRef.current !== requestId) {
          return null;
        }
        const payload = res?.data;
        const nextBooking = payload?.booking ?? null;
        lastHandledCodeRef.current = code;
        setBooking(nextBooking);
        setSuccess(res?.message || payload?.message || "Guest checked in.");
        if (updateUrl) {
          setSearchParams({ code }, { replace: true });
        }
        return nextBooking;
      } catch (err) {
        if (requestIdRef.current !== requestId) {
          return null;
        }
        setBooking(null);
        lastHandledCodeRef.current = "";
        setError(err?.response?.data?.message || "Check-in failed.");
        return null;
      } finally {
        if (requestIdRef.current === requestId) {
          setBusy(false);
        }
      }
    },
    [setSearchParams]
  );

  runCheckInRef.current = runCheckIn;

  const runLookupOnly = useCallback(
    async (rawCode) => {
      const code = normalizeCheckInCodeInput(rawCode);
      if (!code) {
        setError("Enter a ticket code.");
        return;
      }
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setBusy(true);
      setError("");
      setSuccess("");
      try {
        const res = await lookupCheckInTicket(code);
        if (requestIdRef.current !== requestId) {
          return;
        }
        setBooking(res?.data ?? null);
        setCodeInput(code);
        lastHandledCodeRef.current = code;
        setSearchParams({ code }, { replace: true });
      } catch (err) {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setBooking(null);
        setError(err?.response?.data?.message || "Could not look up this ticket.");
      } finally {
        if (requestIdRef.current === requestId) {
          setBusy(false);
        }
      }
    },
    [setSearchParams]
  );

  const startScanner = useCallback(async () => {
    setError("");
    setCameraHint("Starting camera…");
    try {
      const cameras = await Html5Qrcode.getCameras();
      const preferred =
        cameras.find((c) => /back|rear|environment/i.test(String(c.label || ""))) || cameras[0];
      if (!preferred?.id) {
        throw new Error("No camera");
      }
      if (scannerRef.current) {
        await stopScanner();
      }
      scannerRef.current = new Html5Qrcode(SCANNER_ID, {
        verbose: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true }
      });
      setScanning(true);
      await scannerRef.current.start(
        preferred.id,
        {
          fps: 24,
          qrbox: (viewW, viewH) => {
            const edge = Math.floor(Math.min(viewW, viewH) * 0.72);
            return { width: edge, height: edge };
          },
          aspectRatio: 1
        },
        (decoded) => {
          const now = Date.now();
          if (now - lastScanAtRef.current < SCAN_COOLDOWN_MS) {
            return;
          }
          const code = normalizeCheckInCodeInput(decoded);
          if (!code || code === lastHandledCodeRef.current) {
            return;
          }
          lastScanAtRef.current = now;
          void runCheckInRef.current?.(code, { updateUrl: true });
        },
        () => {}
      );
      setCameraHint("");
    } catch (_err) {
      await stopScanner();
      setCameraHint("");
      setError("Camera access failed. Allow camera permission or enter the code manually.");
    }
  }, [stopScanner]);

  useEffect(() => {
    void startScanner();
    return () => {
      void stopScanner();
    };
    // Mount once — camera should not restart on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mountedCodeHandledRef.current) {
      return;
    }
    const initial = searchParams.get("code");
    if (!initial) {
      return;
    }
    mountedCodeHandledRef.current = true;
    void runCheckIn(initial, { updateUrl: false });
  }, [runCheckIn, searchParams]);

  const showManualCheckIn = Boolean(booking && !booking.already_checked_in);

  return (
    <div className="min-h-screen bg-[linear-gradient(165deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)]">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 px-4 py-5 sm:py-8">
        <header className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
            <Ticket className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Book My Tickets
            </p>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Venue check-in</h1>
            <p className="mt-0.5 text-sm text-slate-600">
              Point the camera at the guest QR — check-in happens automatically.
            </p>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-lg">
          <div id={SCANNER_ID} className={`bg-black ${scanning ? "min-h-[280px]" : "hidden min-h-0"}`} />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-3 py-2.5">
            <p className="text-xs text-slate-300">
              {cameraHint || (scanning ? "Scanner live" : "Camera stopped")}
              {busy ? " · Working…" : ""}
            </p>
            {scanning ? (
              <button
                type="button"
                onClick={() => void stopScanner()}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
              >
                Stop camera
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startScanner()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
              >
                <ScanLine className="h-3.5 w-3.5" aria-hidden />
                Start camera
              </button>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
          <label className="block text-sm font-semibold text-slate-800" htmlFor="check-in-code">
            Or enter code
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="check-in-code"
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void runCheckIn(codeInput);
                }
              }}
              placeholder="Paste ticket code"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void runCheckIn(codeInput)}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? "…" : "Check in"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runLookupOnly(codeInput)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Look up
            </button>
          </div>
        </section>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
            role="status"
          >
            {success}
          </p>
        ) : null}

        <TicketCard booking={booking} />

        {showManualCheckIn ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void runCheckIn(codeInput)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Check in guest
          </button>
        ) : null}
      </div>
    </div>
  );
}
