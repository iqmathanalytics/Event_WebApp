import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LayoutGrid, Save } from "lucide-react";
import { SeatsioDesigner } from "@seatsio/seatsio-react";
import SeatingModalShell from "./SeatingModalShell";
import SeatingSideToast from "./SeatingSideToast";
import {
  fetchOrganizerSeatingDesigner,
  fetchOrganizerSeatingDesignerBootstrap,
  saveOrganizerSeatingConfig
} from "../../services/seatingService";

const TOAST_VISIBLE_MS = 3400;

function chartKeyFromPayload(chartOrKey) {
  if (!chartOrKey) {
    return "";
  }
  if (typeof chartOrKey === "string") {
    return String(chartOrKey).trim();
  }
  return String(chartOrKey.key || chartOrKey.chartKey || "").trim();
}

export default function OrganizerSeatingDesignerModal({
  open,
  onClose,
  eventId,
  eventTitle,
  initialChartKey = "",
  onSaved,
  onDraftChartReady
}) {
  const draftMode = !eventId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [config, setConfig] = useState(null);
  const [designerEpoch, setDesignerEpoch] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [activeChartKey, setActiveChartKey] = useState("");
  /** Chart key passed into SeatsioDesigner — set only when loading, never mid-session. */
  const [mountedChartKey, setMountedChartKey] = useState("");
  const savingRef = useRef(false);
  const latestChartKeyRef = useRef("");
  const toastTimerRef = useRef(null);
  const guideShownForOpenRef = useRef(false);
  /** Frozen when the modal opens so form updates mid-session do not remount the designer. */
  const sessionChartKeyRef = useRef("");

  const setChartKey = useCallback((key) => {
    const next = String(key || "").trim();
    latestChartKeyRef.current = next;
    setActiveChartKey(next);
  }, []);

  const clearToastTimer = useCallback(() => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, []);

  const showToast = useCallback(
    (message, tone = "info") => {
      clearToastTimer();
      setToast({ message, tone, id: Date.now() });
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
        toastTimerRef.current = null;
      }, TOAST_VISIBLE_MS);
    },
    [clearToastTimer]
  );

  const notifyDraftKey = useCallback(
    (key) => {
      const next = String(key || "").trim();
      if (!next || !draftMode) {
        return;
      }
      onDraftChartReady?.(next);
    },
    [draftMode, onDraftChartReady]
  );

  const loadDesigner = useCallback(async () => {
    setLoading(true);
    setError("");
    setToast(null);
    clearToastTimer();
    try {
      const data = eventId
        ? await fetchOrganizerSeatingDesigner(eventId)
        : await fetchOrganizerSeatingDesignerBootstrap();
      const preferredKey =
        String(sessionChartKeyRef.current || "").trim() ||
        String(data?.chart_key || "").trim() ||
        "";
      setConfig({
        ...data,
        chart_key: preferredKey || null
      });
      setMountedChartKey(preferredKey);
      setChartKey(preferredKey);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load seating designer.");
    } finally {
      setLoading(false);
    }
  }, [eventId, clearToastTimer, setChartKey]);

  useEffect(() => {
    if (open) {
      sessionChartKeyRef.current = String(initialChartKey || "").trim();
      void loadDesigner();
      if (!guideShownForOpenRef.current) {
        guideShownForOpenRef.current = true;
        setShowGuide(true);
      }
      return undefined;
    }
    setConfig(null);
    setError("");
    setToast(null);
    clearToastTimer();
    setShowGuide(false);
    guideShownForOpenRef.current = false;
    setChartKey("");
    setMountedChartKey("");
    sessionChartKeyRef.current = "";
    return undefined;
    // Only re-bootstrap when the modal opens/closes or the event id changes — not when
    // pending chart key updates mid-session from onChartCreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eventId, loadDesigner, clearToastTimer, setChartKey]);

  useEffect(() => () => clearToastTimer(), [clearToastTimer]);

  const persistChart = useCallback(
    async (chartOrKey) => {
      if (savingRef.current) {
        return null;
      }
      const chartKey = chartKeyFromPayload(chartOrKey) || latestChartKeyRef.current;
      if (!chartKey) {
        showToast("Pick a chart type and draw seats first.", "warn");
        return null;
      }

      if (!eventId) {
        notifyDraftKey(chartKey);
        showToast("Chart ready. Click Submit Event to save the listing.", "success");
        return { chart_key: chartKey };
      }

      savingRef.current = true;
      setSaving(true);
      setError("");
      try {
        const saved = await saveOrganizerSeatingConfig(eventId, {
          seating_mode: "reserved",
          chart_key: chartKey
        });
        const linkedKey = String(saved?.chart_key || chartKey).trim();
        setChartKey(linkedKey);
        setConfig((prev) => ({
          ...(prev || {}),
          chart_key: linkedKey,
          event_key: saved?.event_key || prev?.event_key,
          seating_mode: saved?.seating_mode || prev?.seating_mode
        }));
        showToast("Seating chart saved and linked to this event.", "success");
        onSaved?.(saved);
        return saved;
      } catch (err) {
        setError(err.response?.data?.message || "Could not save seating chart.");
        return null;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [eventId, onSaved, showToast, notifyDraftKey, setChartKey]
  );

  async function handleSave() {
    const chartKey = latestChartKeyRef.current || config?.chart_key;
    if (!chartKey) {
      showToast(
        draftMode
          ? "Choose a chart type, draw seats, then click Use this chart."
          : "Draw seats in the designer first.",
        "warn"
      );
      return;
    }
    const saved = await persistChart(chartKey);
    if (draftMode && saved?.chart_key) {
      onClose?.();
    }
  }

  function handleChartCreated(chartOrKey) {
    const key = chartKeyFromPayload(chartOrKey);
    if (!key) {
      return;
    }
    setChartKey(key);
    notifyDraftKey(key);
    showToast(
      draftMode
        ? "Chart created. Draw seats, then click Use this chart."
        : "Chart created. Draw seats, then click Save seating chart.",
      "info"
    );
  }

  function handleChartPublished(chartOrKey) {
    const key = chartKeyFromPayload(chartOrKey) || latestChartKeyRef.current;
    if (key) {
      setChartKey(key);
      notifyDraftKey(key);
    }
    void persistChart(key);
  }

  function handleChartUpdated(chartOrKey) {
    const key = chartKeyFromPayload(chartOrKey);
    if (!key) {
      return;
    }
    setChartKey(key);
    notifyDraftKey(key);
  }

  function reloadDesigner() {
    setError("");
    setToast(null);
    clearToastTimer();
    sessionChartKeyRef.current =
      latestChartKeyRef.current || sessionChartKeyRef.current || String(initialChartKey || "").trim();
    setDesignerEpoch((n) => n + 1);
    void loadDesigner();
  }

  const hasChartKey = Boolean(activeChartKey || mountedChartKey);

  const guideTitle = draftMode ? "Create seating chart" : "Edit seating chart";
  const guideBody = draftMode
    ? "First pick a chart type (Simple, With sections, or With zones). Draw your seats, then click Use this chart. The event listing is saved only when you click Submit Event — publishing the chart for buyers happens then."
    : "You are editing this event’s existing seating chart. Make your changes, then click Save seating chart. The chart is published for buyers when you save.";

  const footer = (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-xs text-slate-600">
        {draftMode
          ? "Pick a type → draw seats → Use this chart → Submit Event on the listing form."
          : "Edit this chart, then Save seating chart to update the linked event."}
      </p>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
        >
          How it works
        </button>
        <button
          type="button"
          onClick={reloadDesigner}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
        >
          Reload designer
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
        >
          Close
        </button>
        <button
          type="button"
          disabled={saving || !hasChartKey}
          onClick={() => void handleSave()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving..." : draftMode ? "Use this chart" : "Save seating chart"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <SeatingModalShell
        open={open}
        onClose={onClose}
        title={eventTitle ? `Seating chart - ${eventTitle}` : "Design seating chart"}
        subtitle={
          draftMode
            ? "Design the chart now. The event listing is saved only when you click Submit Event."
            : "Edit the seating chart linked to this event."
        }
        footer={footer}
        size="fullscreen"
      >
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-500">Loading designer...</div>
          ) : null}
          {error ? (
            <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}
          {!loading && config?.secret_key ? (
            <div className="min-h-0 flex-1 p-0.5 sm:p-1">
              <div
                className="h-full min-h-[70vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                style={{ minHeight: "70vh" }}
              >
                <SeatsioDesigner
                  key={`${eventId || "draft"}-${designerEpoch}`}
                  secretKey={config.secret_key}
                  chartKey={mountedChartKey || undefined}
                  region={config.region || "na"}
                  openLatestDrawing={Boolean(mountedChartKey)}
                  onChartCreated={handleChartCreated}
                  onChartUpdated={handleChartUpdated}
                  onChartPublished={handleChartPublished}
                  onDesignerRenderingFailed={() => {
                    setError("The seating designer couldn’t load. Please reload and try again.");
                  }}
                />
              </div>
            </div>
          ) : null}
          {!loading && !config?.secret_key && !error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-600">
              <LayoutGrid className="h-8 w-8 text-slate-400" />
              <p>Seats.io is not configured. Add API keys to the server environment.</p>
            </div>
          ) : null}
        </div>
      </SeatingModalShell>

      <SeatingSideToast toast={toast} />

      {showGuide
        ? createPortal(
            <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/55 p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="seating-guide-title"
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
              >
                <h3 id="seating-guide-title" className="text-lg font-semibold text-slate-900">
                  {guideTitle}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{guideBody}</p>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowGuide(false)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
