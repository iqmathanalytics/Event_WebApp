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
  submitting = false,
  initialSelectedSeats = [],
  existingHoldToken = "",
  existingEventKey = ""
}) {
  const chartRef = useRef(null);
  const heldLabelsRef = useRef([]);
  const holdTokenRef = useRef("");
  const eventKeyRef = useRef("");
  const eventIdRef = useRef(eventId);
  const loadGenerationRef = useRef(0);
  const skipReleaseOnCloseRef = useRef(false);
  const initialSeatsRef = useRef([]);

  const [chartConfig, setChartConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [holdToken, setHoldToken] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const isEditingSelection = Boolean(initialSelectedSeats?.length && existingHoldToken);
  const preselectedLabels = useMemo(
    () => (initialSelectedSeats || []).map((seat) => seat.label).filter(Boolean),
    [initialSelectedSeats]
  );

  eventIdRef.current = eventId;

  useEffect(() => {
    if (!open || !eventId) {
      chartRef.current = null;
      holdTokenRef.current = "";
      eventKeyRef.current = "";
      heldLabelsRef.current = [];
      initialSeatsRef.current = [];
      setChartConfig(null);
      setSelectedSeats([]);
      setHoldToken("");
      setLoadError("");
      setLoading(false);
      setConfirming(false);
      return undefined;
    }

    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    let cancelled = false;
    const editing = isEditingSelection;

    setLoading(true);
    setLoadError("");
    setChartConfig(null);
    setConfirming(false);

    if (editing) {
      initialSeatsRef.current = [...initialSelectedSeats];
      heldLabelsRef.current = [...preselectedLabels];
      holdTokenRef.current = existingHoldToken;
      eventKeyRef.current = existingEventKey || "";
      skipReleaseOnCloseRef.current = true;
      setSelectedSeats([...initialSelectedSeats]);
      setHoldToken(existingHoldToken);
    } else {
      initialSeatsRef.current = [];
      heldLabelsRef.current = [];
      holdTokenRef.current = "";
      eventKeyRef.current = "";
      skipReleaseOnCloseRef.current = false;
      setSelectedSeats([]);
      setHoldToken("");
    }

    fetchPublicSeatingChart(eventId, {
      holdToken: editing ? existingHoldToken : undefined
    })
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

  const updateLocalSelection = useCallback(async () => {
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

  const handleConfirm = useCallback(async () => {
    const chart = chartRef.current;
    const eventKey = eventKeyRef.current;
    const token = holdTokenRef.current;
    const currentEventId = eventIdRef.current;
    if (!chart?.listSelectedObjects || !eventKey || !token || !currentEventId) {
      return;
    }

    setConfirming(true);
    setLoadError("");
    try {
      const objects = await chart.listSelectedObjects();
      const seats = objects.map(mapSelectedObject);
      const labels = seats.map((seat) => seat.label).filter(Boolean);
      if (!labels.length) {
        setLoadError("Select at least one seat.");
        return;
      }

      const previousLabels = initialSeatsRef.current.map((seat) => seat.label).filter(Boolean);
      const remove = previousLabels.filter((label) => !labels.includes(label));
      const add = labels.filter((label) => !previousLabels.includes(label));

      await syncSeatsioHold(currentEventId, {
        eventKey,
        holdToken: token,
        add,
        remove
      });

      heldLabelsRef.current = labels;
      setSelectedSeats(seats);
      skipReleaseOnCloseRef.current = true;
      onConfirm?.({
        holdToken: token,
        selectedSeats: seats,
        eventKey,
        chartCategoryKeys: chartConfig?.chart_category_keys || [],
        chartPricing: chartConfig?.pricing || [],
        holdExpiresAt: chartConfig?.hold_expires_at || null
      });
    } catch (err) {
      setLoadError(err.response?.data?.message || err.message || "Could not hold the selected seats.");
    } finally {
      setConfirming(false);
    }
  }, [chartConfig, onConfirm]);

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

  const unavailableCategories = useMemo(() => {
    return (chartConfig?.blocked_category_keys || [])
      .map((key) => Number(key))
      .filter((key) => Number.isFinite(key));
  }, [chartConfig]);

  const canConfirm = Boolean(selectedSeats.length && !confirming && !submitting);
  const showChart = !loading && !loadError && Boolean(chartConfig?.workspace_key && chartConfig?.event_key);

  const restoreSelectionOnChart = useCallback(async () => {
    const chart = chartRef.current;
    if (!chart || !preselectedLabels.length) {
      await updateLocalSelection();
      return;
    }
    try {
      if (typeof chart.trySelectObjects === "function") {
        await chart.trySelectObjects(preselectedLabels);
      } else if (typeof chart.selectObjects === "function") {
        await chart.selectObjects(preselectedLabels);
      }
    } catch (_err) {
      /* selection may already be applied via selectedObjects */
    }
    await updateLocalSelection();
  }, [preselectedLabels, updateLocalSelection]);

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
          <p className="text-sm text-slate-600">Pick seats on the chart, then click Confirm seats to reserve them.</p>
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
          disabled={!canConfirm}
          onClick={() => void handleConfirm()}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Ticket className="h-4 w-4" />
          {confirming || submitting ? "Confirming…" : "Confirm seats"}
        </button>
      </div>
    </div>
  );

  return (
    <SeatingModalShell
      open={open}
      onClose={onClose}
      title={eventTitle ? `Choose seats — ${eventTitle}` : "Choose your seats"}
      subtitle={
        isEditingSelection
          ? "Your current seats are shown on the chart. Adjust and confirm to update your selection."
          : "Seats are only reserved after you click Confirm seats."
      }
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
              key={`${chartConfig.event_key}-${isEditingSelection ? "edit" : "new"}-${preselectedLabels.join("|")}`}
              workspaceKey={chartConfig.workspace_key}
              event={chartConfig.event_key}
              region={chartConfig.region || "na"}
              session="none"
              selectedObjects={isEditingSelection ? preselectedLabels : undefined}
              selectableObjects={isEditingSelection ? preselectedLabels : undefined}
              pricing={pricing}
              priceFormatter={(price) => formatCurrency(price)}
              maxSelectedObjects={maxSeats}
              unavailableCategories={unavailableCategories.length ? unavailableCategories : undefined}
              onRenderStarted={(chart) => {
                chartRef.current = chart;
              }}
              onChartRendered={() => {
                setLoadError("");
                void restoreSelectionOnChart();
              }}
              onChartRenderingFailed={() => {
                setLoadError("Could not render the seating chart. Please try again.");
              }}
              onObjectSelected={updateLocalSelection}
              onObjectDeselected={updateLocalSelection}
            />
          </div>
        ) : null}
      </div>
    </SeatingModalShell>
  );
}
