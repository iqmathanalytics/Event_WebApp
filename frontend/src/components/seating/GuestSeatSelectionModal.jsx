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
  const loadGenerationRef = useRef(0);
  const [chartConfig, setChartConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [holdToken, setHoldToken] = useState("");
  const [chartEpoch, setChartEpoch] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open || !eventId) {
      chartRef.current = null;
      holdTokenRef.current = "";
      setChartConfig(null);
      setSelectedSeats([]);
      setHoldToken("");
      setLoadError("");
      setLoading(false);
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
    clearSeatsioBrowserSession();

    fetchPublicSeatingChart(eventId)
      .then((config) => {
        if (cancelled || generation !== loadGenerationRef.current) {
          return;
        }
        if (!config?.workspace_key || !config?.event_key) {
          throw new Error("Seating chart is incomplete. Ask the organizer to publish and save the chart.");
        }
        clearSeatsioBrowserSession();
        setChartConfig(config);
        setChartEpoch((value) => value + 1);
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
    };
  }, [open, eventId, reloadKey]);

  const restartChartSession = useCallback(() => {
    clearSeatsioBrowserSession();
    holdTokenRef.current = "";
    setHoldToken("");
    setSelectedSeats([]);
    setChartEpoch((value) => value + 1);
  }, []);

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
    return (chartConfig?.pricing || []).map((row) => ({
      category: row.category,
      price: Number(row.price) || 0
    }));
  }, [chartConfig]);

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
              eventKey: chartConfig?.event_key || ""
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
        {!loading && !loadError && chartConfig?.workspace_key && chartConfig?.event_key ? (
          <SeatsioSeatingChart
            key={`${chartConfig.event_key}:${chartEpoch}`}
            workspaceKey={chartConfig.workspace_key}
            event={chartConfig.event_key}
            region={chartConfig.region || "na"}
            session="start"
            pricing={pricing}
            priceFormatter={(price) => formatCurrency(price)}
            maxSelectedObjects={maxSeats}
            onRenderStarted={(chart) => {
              chartRef.current = chart;
            }}
            onSessionInitialized={({ token }) => {
              if (!token) {
                return;
              }
              holdTokenRef.current = token;
              setHoldToken(token);
            }}
            onHoldTokenExpired={() => {
              restartChartSession();
            }}
            onObjectSelected={syncSelection}
            onObjectDeselected={syncSelection}
          />
        ) : null}
      </div>
    </SeatingModalShell>
  );
}
