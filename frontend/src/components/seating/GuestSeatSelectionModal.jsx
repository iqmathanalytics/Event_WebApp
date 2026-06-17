import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ticket } from "lucide-react";
import { SeatsioSeatingChart } from "@seatsio/seatsio-react";
import SeatingModalShell from "./SeatingModalShell";
import { formatCurrency } from "../../utils/format";
import {
  fetchPublicSeatingChart,
  releaseSeatsioHold,
  syncSeatsioHold
} from "../../services/seatingService";
import { clearSeatsioBrowserSession } from "../../utils/seatsioBrowserSession";

function mapSelectedObject(object) {
  return {
    label: object.label,
    category: object.category?.key ?? object.category,
    category_label: object.category?.label || object.categoryLabel || null,
    price: Number(object.pricing?.price ?? object.price) || 0
  };
}

function diffLabels(previous = [], next = []) {
  const prevSet = new Set(previous);
  const nextSet = new Set(next);
  return {
    add: next.filter((label) => !prevSet.has(label)),
    remove: previous.filter((label) => !nextSet.has(label))
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
  const heldLabelsRef = useRef([]);
  const holdTokenRef = useRef("");
  const eventKeyRef = useRef("");
  const eventIdRef = useRef(eventId);
  const syncInFlightRef = useRef(false);
  const loadGenerationRef = useRef(0);
  const skipReleaseOnCloseRef = useRef(false);

  const [chartConfig, setChartConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [holdToken, setHoldToken] = useState("");
  const [syncingHold, setSyncingHold] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  eventIdRef.current = eventId;

  const releaseHeldSeats = useCallback(async () => {
    const labels = [...heldLabelsRef.current];
    const token = holdTokenRef.current;
    const eventKey = eventKeyRef.current;
    const currentEventId = eventIdRef.current;
    heldLabelsRef.current = [];
    if (!labels.length || !token || !eventKey || !currentEventId) {
      return;
    }
    try {
      await releaseSeatsioHold(currentEventId, { eventKey, holdToken: token, labels });
    } catch (_err) {
      /* seats may already be released */
    }
  }, []);

  useEffect(() => {
    if (!open || !eventId) {
      chartRef.current = null;
      holdTokenRef.current = "";
      eventKeyRef.current = "";
      heldLabelsRef.current = [];
      setChartConfig(null);
      setSelectedSeats([]);
      setHoldToken("");
      setLoadError("");
      setLoading(false);
      setSyncingHold(false);
      return undefined;
    }

    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    let cancelled = false;

    setLoading(true);
    setLoadError("");
    setChartConfig(null);
    setSelectedSeats([]);
    setHoldToken("");
    holdTokenRef.current = "";
    eventKeyRef.current = "";
    heldLabelsRef.current = [];
    clearSeatsioBrowserSession();

    fetchPublicSeatingChart(eventId)
      .then((config) => {
        if (cancelled || generation !== loadGenerationRef.current) {
          return;
        }
        if (!config?.workspace_key || !config?.event_key || !config?.hold_token) {
          throw new Error("Seating session is incomplete. Ask the organizer to publish and save the chart.");
        }
        holdTokenRef.current = config.hold_token;
        eventKeyRef.current = config.event_key;
        setHoldToken(config.hold_token);
        setChartConfig(config);
      })
      .catch((err) => {
        if (cancelled || generation !== loadGenerationRef.current) {
          return;
        }
        setLoadError(err.response?.data?.message || err.message || "Could not load the seating chart.");
      })
      .finally(() => {
        if (!cancelled && generation === loadGenerationRef.current) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (generation === loadGenerationRef.current && !skipReleaseOnCloseRef.current) {
        const labels = [...heldLabelsRef.current];
        const token = holdTokenRef.current;
        const eventKey = eventKeyRef.current;
        const currentEventId = eventIdRef.current;
        heldLabelsRef.current = [];
        if (labels.length && token && eventKey && currentEventId) {
          void releaseSeatsioHold(currentEventId, { eventKey, holdToken: token, labels });
        }
      }
      skipReleaseOnCloseRef.current = false;
    };
  }, [open, eventId, reloadKey]);

  const syncServerHolds = useCallback(async (nextLabels) => {
    const eventKey = eventKeyRef.current;
    const token = holdTokenRef.current;
    const currentEventId = eventIdRef.current;
    if (!eventKey || !token || !currentEventId || syncInFlightRef.current) {
      return;
    }

    const { add, remove } = diffLabels(heldLabelsRef.current, nextLabels);
    if (!add.length && !remove.length) {
      return;
    }

    syncInFlightRef.current = true;
    setSyncingHold(true);
    try {
      await syncSeatsioHold(currentEventId, { eventKey, holdToken: token, add, remove });
      heldLabelsRef.current = nextLabels;
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message || "Could not hold the selected seats.");
      throw err;
    } finally {
      syncInFlightRef.current = false;
      setSyncingHold(false);
    }
  }, []);

  const syncSelection = useCallback(async () => {
    const chart = chartRef.current;
    if (!chart?.listSelectedObjects) {
      return;
    }
    try {
      const objects = await chart.listSelectedObjects();
      const seats = objects.map(mapSelectedObject);
      const labels = seats.map((seat) => seat.label).filter(Boolean);
      await syncServerHolds(labels);
      setSelectedSeats(seats);
    } catch (_err) {
      /* loadError is set in syncServerHolds */
    }
  }, [syncServerHolds]);

  const subtotal = useMemo(() => {
    const perDay = selectedSeats.reduce((sum, seat) => sum + Number(seat.price || 0), 0);
    return perDay * Math.max(1, totalDays);
  }, [selectedSeats, totalDays]);

  const pricing = useMemo(() => {
    return (chartConfig?.pricing || []).map((row) => ({
      category: row.category,
      price: Number(row.price) || 0
    }));
  }, [chartConfig]);

  const canConfirm = Boolean(holdToken && selectedSeats.length && !syncingHold);
  const showChart = !loading && !loadError && Boolean(chartConfig?.workspace_key && chartConfig?.event_key);

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
        {syncingHold ? <p className="mt-1 text-xs text-slate-500">Updating seat hold…</p> : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={async () => {
            await releaseHeldSeats();
            onClose?.();
          }}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canConfirm || submitting}
          onClick={() => {
            skipReleaseOnCloseRef.current = true;
            onConfirm?.({
              holdToken: holdTokenRef.current || holdToken,
              selectedSeats,
              eventKey: eventKeyRef.current || chartConfig?.event_key || ""
            });
          }}
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
              onClick={() => {
                setLoadError("");
                setReloadKey((value) => value + 1);
              }}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : null}
        {showChart ? (
          <div className="h-full min-h-[480px] w-full">
            <SeatsioSeatingChart
              key={chartConfig.event_key}
              workspaceKey={chartConfig.workspace_key}
              event={chartConfig.event_key}
              region={chartConfig.region || "na"}
              session="none"
              pricing={pricing}
              priceFormatter={(price) => formatCurrency(price)}
              maxSelectedObjects={maxSeats}
              onRenderStarted={(chart) => {
                chartRef.current = chart;
              }}
              onChartRendered={() => {
                setLoadError("");
              }}
              onChartRenderingFailed={() => {
                setLoadError("Could not render the seating chart. Please try again.");
              }}
              onObjectSelected={syncSelection}
              onObjectDeselected={syncSelection}
            />
          </div>
        ) : null}
      </div>
    </SeatingModalShell>
  );
}
