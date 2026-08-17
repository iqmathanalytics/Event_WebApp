import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, LayoutGrid, Save } from "lucide-react";
import { SeatsioDesigner } from "@seatsio/seatsio-react";
import SeatingModalShell from "./SeatingModalShell";
import {
  fetchOrganizerSeatingDesigner,
  saveOrganizerSeatingConfig
} from "../../services/seatingService";

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
  const [success, setSuccess] = useState("");
  const [hint, setHint] = useState("");
  const [config, setConfig] = useState(null);
  const [designerEpoch, setDesignerEpoch] = useState(0);
  const [showPublishFirstDialog, setShowPublishFirstDialog] = useState(false);
  const [publishedThisSession, setPublishedThisSession] = useState(false);
  const savingRef = useRef(false);
  const latestChartKeyRef = useRef("");

  const loadDesigner = useCallback(async () => {
    if (!eventId) {
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    setHint("");
    setShowPublishFirstDialog(false);
    setPublishedThisSession(false);
    try {
      const data = await fetchOrganizerSeatingDesigner(eventId);
      setConfig(data);
      latestChartKeyRef.current = String(data?.chart_key || "").trim();
    } catch (err) {
      setError(err.response?.data?.message || "Could not load seating designer.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (open && eventId) {
      loadDesigner();
    }
    if (!open) {
      setConfig(null);
      setError("");
      setSuccess("");
      setHint("");
      setShowPublishFirstDialog(false);
      setPublishedThisSession(false);
      latestChartKeyRef.current = "";
    }
  }, [open, eventId, loadDesigner]);

  const persistChart = useCallback(
    async (chartOrKey, { quiet = false } = {}) => {
      if (!eventId || savingRef.current) {
        return null;
      }
      const chartKey = chartKeyFromPayload(chartOrKey) || latestChartKeyRef.current;
      if (!chartKey) {
        if (!quiet) {
          setError("Draw at least one seat, click Publish in the Seats.io toolbar, then Save.");
        }
        return null;
      }

      savingRef.current = true;
      setSaving(true);
      if (!quiet) {
        setError("");
        setHint("");
      }
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
        if (!quiet) {
          setSuccess("Seating chart saved and linked to this event.");
          setHint("");
        }
        onSaved?.(saved);
        return saved;
      } catch (err) {
        if (!quiet) {
          setError(err.response?.data?.message || "Could not save seating chart.");
        }
        return null;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [eventId, onSaved]
  );

  async function handleSave() {
    const chartKey = latestChartKeyRef.current || config?.chart_key;
    if (!chartKey) {
      setShowPublishFirstDialog(true);
      return;
    }
    // Require Publish in this session unless the chart was already linked to the event.
    if (!publishedThisSession && !config?.event_key) {
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
    setPublishedThisSession(false);
    setHint("Add your seats, then click Publish in the toolbar. When that’s done, click Save seating chart.");
    // Do not auto-save empty charts — Seats.io rejects unpublished empty drawings.
  }

  function handleChartPublished(chartOrKey) {
    const key = chartKeyFromPayload(chartOrKey) || latestChartKeyRef.current;
    if (key) {
      latestChartKeyRef.current = key;
      setConfig((prev) => ({ ...prev, chart_key: key }));
    }
    setPublishedThisSession(true);
    setShowPublishFirstDialog(false);
    setHint("");
    void persistChart(key);
  }

  function reloadDesigner() {
    setError("");
    setSuccess("");
    setHint("");
    setShowPublishFirstDialog(false);
    setPublishedThisSession(false);
    setDesignerEpoch((n) => n + 1);
    void loadDesigner();
  }

  function openCleanDesignerWindow() {
    if (!eventId) {
      return;
    }
    const url = `${window.location.origin}/seating-designer/${encodeURIComponent(eventId)}`;
    window.open(url, `seating-designer-${eventId}`, "noopener,noreferrer,width=1400,height=900");
  }

  const footer = (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-xs text-slate-600">
        Draw seats, click <strong>Publish</strong> in the toolbar, then click <strong>Save seating chart</strong>.
      </p>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        <button
          type="button"
          onClick={openCleanDesignerWindow}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
          title="Open designer in a separate window"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in new window
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
        {hint && !error ? (
          <div className="m-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {hint}
          </div>
        ) : null}
        {success && !error ? (
          <div className="m-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
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
                onChartUpdated={(chartOrKey) => {
                  const key = chartKeyFromPayload(chartOrKey);
                  if (key) {
                    latestChartKeyRef.current = key;
                  }
                }}
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
