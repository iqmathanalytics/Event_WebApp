import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LayoutGrid, Save } from "lucide-react";
import { SeatsioDesigner } from "@seatsio/seatsio-react";
import SeatingModalShell from "./SeatingModalShell";
import SeatingSideToast from "./SeatingSideToast";
import {
  fetchOrganizerSeatingDesigner,
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
  onSaved
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [config, setConfig] = useState(null);
  const [designerEpoch, setDesignerEpoch] = useState(0);
  const [showPublishFirstDialog, setShowPublishFirstDialog] = useState(false);
  const savingRef = useRef(false);
  const latestChartKeyRef = useRef("");
  const publishedThisSessionRef = useRef(false);
  const ignoreChartUpdatesUntilRef = useRef(0);
  const toastTimerRef = useRef(null);

  const markPublished = useCallback((value) => {
    publishedThisSessionRef.current = Boolean(value);
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

  const loadDesigner = useCallback(async () => {
    if (!eventId) {
      return;
    }
    setLoading(true);
    setError("");
    setToast(null);
    clearToastTimer();
    setShowPublishFirstDialog(false);
    markPublished(false);
    try {
      const data = await fetchOrganizerSeatingDesigner(eventId);
      setConfig(data);
      latestChartKeyRef.current = String(data?.chart_key || "").trim();
    } catch (err) {
      setError(err.response?.data?.message || "Could not load seating designer.");
    } finally {
      setLoading(false);
    }
  }, [eventId, markPublished, clearToastTimer]);

  useEffect(() => {
    if (open && eventId) {
      loadDesigner();
    }
    if (!open) {
      setConfig(null);
      setError("");
      setToast(null);
      clearToastTimer();
      setShowPublishFirstDialog(false);
      markPublished(false);
      latestChartKeyRef.current = "";
    }
  }, [open, eventId, loadDesigner, markPublished, clearToastTimer]);

  useEffect(() => () => clearToastTimer(), [clearToastTimer]);

  const persistChart = useCallback(
    async (chartOrKey) => {
      if (!eventId || savingRef.current) {
        return null;
      }
      const chartKey = chartKeyFromPayload(chartOrKey) || latestChartKeyRef.current;
      if (!chartKey) {
        setShowPublishFirstDialog(true);
        return null;
      }

      savingRef.current = true;
      setSaving(true);
      setError("");
      try {
        const saved = await saveOrganizerSeatingConfig(eventId, {
          seating_mode: "reserved",
          chart_key: chartKey
        });
        latestChartKeyRef.current = String(saved?.chart_key || chartKey).trim();
        setConfig((prev) => ({
          ...(prev || {}),
          ...saved,
          chart_key: latestChartKeyRef.current,
          secret_key: prev?.secret_key,
          region: prev?.region || saved?.region,
          workspace_key: prev?.workspace_key
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
    [eventId, onSaved, showToast]
  );

  async function handleSave() {
    if (!publishedThisSessionRef.current) {
      setShowPublishFirstDialog(true);
      return;
    }
    const chartKey = latestChartKeyRef.current || config?.chart_key;
    if (!chartKey) {
      setShowPublishFirstDialog(true);
      return;
    }
    await persistChart(chartKey);
  }

  function handleChartCreated(chartOrKey) {
    const key = chartKeyFromPayload(chartOrKey);
    if (!key) {
      return;
    }
    latestChartKeyRef.current = key;
    setConfig((prev) => ({ ...prev, chart_key: key }));
    markPublished(false);
    showToast("Add seats, then Publish in the toolbar before saving.", "info");
  }

  function handleChartPublished(chartOrKey) {
    const key = chartKeyFromPayload(chartOrKey) || latestChartKeyRef.current;
    if (key) {
      latestChartKeyRef.current = key;
      setConfig((prev) => ({ ...prev, chart_key: key }));
    }
    markPublished(true);
    ignoreChartUpdatesUntilRef.current = Date.now() + 2500;
    setShowPublishFirstDialog(false);
    void persistChart(key);
  }

  function handleChartUpdated(chartOrKey) {
    const key = chartKeyFromPayload(chartOrKey);
    if (key) {
      latestChartKeyRef.current = key;
    }
    if (Date.now() < ignoreChartUpdatesUntilRef.current) {
      return;
    }
    if (publishedThisSessionRef.current) {
      markPublished(false);
      showToast("You have unpublished changes. Click Publish in the toolbar, then Save seating chart.", "warn");
    }
  }

  function reloadDesigner() {
    setError("");
    setToast(null);
    clearToastTimer();
    setShowPublishFirstDialog(false);
    markPublished(false);
    setDesignerEpoch((n) => n + 1);
    void loadDesigner();
  }

  const footer = (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-xs text-slate-600">
        Draw seats, click <strong>Publish</strong> in the toolbar, then click <strong>Save seating chart</strong>.
      </p>
      <div className="flex shrink-0 flex-wrap gap-1.5">
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
          disabled={saving || !(latestChartKeyRef.current || config?.chart_key)}
          onClick={() => void handleSave()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save seating chart"}
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
        subtitle="Use the full-screen Seats.io designer to draw seats, rows, sections, and categories."
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
                  key={`${eventId}-${config.chart_key || "new"}-${designerEpoch}`}
                  secretKey={config.secret_key}
                  chartKey={config.chart_key || undefined}
                  region={config.region || "na"}
                  openLatestDrawing
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

      {showPublishFirstDialog
        ? createPortal(
            <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/55 p-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="publish-first-title"
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
              >
                <h3 id="publish-first-title" className="text-lg font-semibold text-slate-900">
                  Publish your chart first
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Click <strong>Publish</strong> in the Seats.io toolbar before saving. After Publish
                  succeeds, click <strong>Save seating chart</strong> to link it to your event.
                </p>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPublishFirstDialog(false)}
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
