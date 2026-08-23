import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { SeatsioDesigner } from "@seatsio/seatsio-react";
import SeatingSideToast from "../components/seating/SeatingSideToast";
import {
  fetchOrganizerSeatingDesigner,
  saveOrganizerSeatingConfig
} from "../services/seatingService";
import { useRouteContentReady } from "../context/RouteContentReadyContext";

const TOAST_VISIBLE_MS = 3400;

/** Standalone seating designer page (same Publish-then-Save rules as the modal). */
export default function SeatingDesignerPage() {
  const { eventId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [config, setConfig] = useState(null);
  const [chartKey, setChartKey] = useState("");
  const [showPublishFirstDialog, setShowPublishFirstDialog] = useState(false);
  const savingRef = useRef(false);
  const publishedThisSessionRef = useRef(false);
  const ignoreChartUpdatesUntilRef = useRef(0);
  const toastTimerRef = useRef(null);

  useRouteContentReady(loading || saving);

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

  useEffect(() => () => clearToastTimer(), [clearToastTimer]);

  const load = useCallback(async () => {
    if (!eventId) {
      return;
    }
    setLoading(true);
    setError("");
    setToast(null);
    clearToastTimer();
    publishedThisSessionRef.current = false;
    setShowPublishFirstDialog(false);
    try {
      const data = await fetchOrganizerSeatingDesigner(eventId);
      setConfig(data);
      setChartKey(String(data?.chart_key || "").trim());
    } catch (err) {
      setError(err.response?.data?.message || "Could not load seating designer. Sign in and try again.");
    } finally {
      setLoading(false);
    }
  }, [eventId, clearToastTimer]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(
    async (key) => {
      const nextKey = String(key || chartKey || "").trim();
      if (!eventId || !nextKey || savingRef.current) {
        return;
      }
      savingRef.current = true;
      setSaving(true);
      setError("");
      try {
        const saved = await saveOrganizerSeatingConfig(eventId, {
          seating_mode: "reserved",
          chart_key: nextKey
        });
        setChartKey(String(saved?.chart_key || nextKey).trim());
        showToast("Seating chart saved and linked to this event.", "success");
      } catch (err) {
        setError(err.response?.data?.message || "Could not save seating chart.");
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [eventId, chartKey, showToast]
  );

  function handleSaveClick() {
    if (!publishedThisSessionRef.current) {
      setShowPublishFirstDialog(true);
      return;
    }
    if (!chartKey) {
      setShowPublishFirstDialog(true);
      return;
    }
    void persist(chartKey);
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Seating designer</p>
          <h1 className="text-sm font-bold text-slate-900">Event #{eventId}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving || !chartKey}
            onClick={handleSaveClick}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save seating chart"}
          </button>
          <Link
            to="/dashboard/user?host=events"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            Back to dashboard
          </Link>
        </div>
      </header>
      {error ? (
        <p className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">{error}</p>
      ) : null}
      <p className="border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
        Draw seats, click <strong>Publish</strong> in the toolbar, then click <strong>Save seating chart</strong>.
      </p>
      <div className="min-h-0 flex-1 bg-white" style={{ minHeight: "calc(100vh - 110px)" }}>
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading designer…</div>
        ) : null}
        {!loading && config?.secret_key ? (
          <SeatsioDesigner
            key={`${eventId}-${config.chart_key || "new"}`}
            secretKey={config.secret_key}
            chartKey={config.chart_key || undefined}
            region={config.region || "na"}
            openLatestDrawing
            onChartCreated={(key) => {
              setChartKey(String(key || "").trim());
              publishedThisSessionRef.current = false;
            }}
            onChartUpdated={(key) => {
              if (key) {
                setChartKey(String(key).trim());
              }
              if (Date.now() < ignoreChartUpdatesUntilRef.current) {
                return;
              }
              if (publishedThisSessionRef.current) {
                publishedThisSessionRef.current = false;
                showToast(
                  "You have unpublished changes. Click Publish in the toolbar, then Save seating chart.",
                  "warn"
                );
              }
            }}
            onChartPublished={(key) => {
              const next = String(key || chartKey || "").trim();
              setChartKey(next);
              publishedThisSessionRef.current = true;
              ignoreChartUpdatesUntilRef.current = Date.now() + 2500;
              setShowPublishFirstDialog(false);
              void persist(next);
            }}
            onDesignerRenderingFailed={() => {
              setError("The seating designer couldn’t load. Please reload and try again.");
            }}
          />
        ) : null}
      </div>

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
    </div>
  );
}
