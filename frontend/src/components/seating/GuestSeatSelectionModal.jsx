import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ticket } from "lucide-react";
import { SeatsioSeatingChart } from "@seatsio/seatsio-react";
import SeatingModalShell from "./SeatingModalShell";
import { formatCurrency } from "../../utils/format";
import { fetchPublicSeatingChart } from "../../services/seatingService";
import { clearSeatsioBrowserSession } from "../../utils/seatsioBrowserSession";

function mapSelectedObject(object) {
  return {
    label: object.label,
    category: object.category?.key ?? object.category,
    category_label: object.category?.label || object.categoryLabel || null,
    price: Number(object.pricing?.price ?? object.price) || 0
  };
}

export default function GuestSeatSelectionModal({
  open,
  onClose,
  onConfirm,
  eventId,
  eventTitle,
  maxSeats = 20,
  totalDays = 1,
  submitting = false
}) {
  const chartRef = useRef(null);
  const holdTokenRef = useRef("");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [holdToken, setHoldToken] = useState("");
  const [chartEpoch, setChartEpoch] = useState(0);

  const loadSession = useCallback(async () => {
    if (!eventId) {
      return;
    }
    setLoading(true);
    setLoadError("");
    setSession(null);
    setSelectedSeats([]);
    setHoldToken("");
    holdTokenRef.current = "";
    clearSeatsioBrowserSession();
    try {
      const config = await fetchPublicSeatingChart(eventId);
      if (!config?.workspace_key || !config?.event_key || !config?.hold_token) {
        throw new Error("Seating session is incomplete. Ask the organizer to save the chart again.");
      }
      setSession(config);
      holdTokenRef.current = config.hold_token;
      setHoldToken(config.hold_token);
      setChartEpoch((value) => value + 1);
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message || "Could not load the seating chart.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (open && eventId) {
      void loadSession();
      return;
    }
    chartRef.current = null;
    holdTokenRef.current = "";
    setSession(null);
    setSelectedSeats([]);
    setHoldToken("");
    setLoadError("");
    setLoading(false);
  }, [open, eventId, loadSession]);

  const subtotal = useMemo(() => {
    const perDay = selectedSeats.reduce((sum, seat) => sum + Number(seat.price || 0), 0);
    return perDay * Math.max(1, totalDays);
  }, [selectedSeats, totalDays]);

  const syncSelection = useCallback(async () => {
    const chart = chartRef.current;
    if (!chart?.listSelectedObjects) {
      return;
    }
    try {
      const objects = await chart.listSelectedObjects();
      setSelectedSeats(objects.map(mapSelectedObject));
    } catch (_err) {
      /* ignore */
    }
  }, []);

  const pricing = useMemo(() => {
    return (session?.pricing || []).map((row) => ({
      category: row.category,
      price: Number(row.price) || 0
    }));
  }, [session]);

  const canConfirm = Boolean(holdToken && selectedSeats.length);

  const footer = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        {selectedSeats.length ? (
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {selectedSeats.length} seat{selectedSeats.length === 1 ? "" : "s"} · {formatCurrency(subtotal)}
              {totalDays > 1 ? ` (${totalDays} show days)` : ""}
            </p>
            <p className="mt-1 truncate text-xs text-slate-600">
              {selectedSeats.map((s) => s.label).join(", ")}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Tap or click seats on the chart to select them.</p>
        )}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canConfirm || submitting}
          onClick={() =>
            onConfirm?.({
              holdToken: holdTokenRef.current || holdToken,
              selectedSeats,
              eventKey: session?.event_key || ""
            })
          }
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Ticket className="h-4 w-4" />
          {submitting ? "Confirming…" : "Confirm seats"}
        </button>
      </div>
    </div>
  );

  return (
    <SeatingModalShell
      open={open}
      onClose={onClose}
      title={eventTitle ? `Choose seats — ${eventTitle}` : "Choose your seats"}
      subtitle="Available seats are selectable. Your selection is held for about 15 minutes."
      footer={footer}
      size="full"
    >
      <div className="h-[min(68vh,640px)] p-2 sm:p-3">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-600">
            Loading seating chart…
          </div>
        ) : null}
        {!loading && loadError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-rose-700">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadSession()}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : null}
        {!loading && !loadError && session?.workspace_key && session?.event_key && session?.hold_token ? (
          <SeatsioSeatingChart
            key={`${session.event_key}:${session.hold_token}:${chartEpoch}`}
            workspaceKey={session.workspace_key}
            event={session.event_key}
            region={session.region || "na"}
            session="manual"
            holdToken={session.hold_token}
            pricing={pricing}
            priceFormatter={(price) => formatCurrency(price)}
            maxSelectedObjects={maxSeats}
            onRenderStarted={(chart) => {
              chartRef.current = chart;
            }}
            onSessionInitialized={({ token }) => {
              const resolved = token || session.hold_token;
              holdTokenRef.current = resolved;
              setHoldToken(resolved);
            }}
            onHoldTokenExpired={() => {
              setLoadError("Your seat hold expired. Starting a fresh session…");
              void loadSession();
            }}
            onObjectSelected={syncSelection}
            onObjectDeselected={syncSelection}
          />
        ) : null}
      </div>
    </SeatingModalShell>
  );
}
