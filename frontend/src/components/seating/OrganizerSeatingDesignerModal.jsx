import { useCallback, useEffect, useState } from "react";
import { LayoutGrid, Save } from "lucide-react";
import { SeatsioDesigner } from "@seatsio/seatsio-react";
import SeatingModalShell from "./SeatingModalShell";
import {
  fetchOrganizerSeatingDesigner,
  saveOrganizerSeatingConfig
} from "../../services/seatingService";

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
  const [config, setConfig] = useState(null);

  const loadDesigner = useCallback(async () => {
    if (!eventId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrganizerSeatingDesigner(eventId);
      setConfig(data);
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
  }, [open, eventId, loadDesigner]);

  async function handleSave() {
    if (!eventId || !config?.chart_key) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await saveOrganizerSeatingConfig(eventId, {
        seating_mode: "reserved",
        chart_key: config.chart_key
      });
      setConfig((prev) => ({ ...prev, ...saved }));
      onSaved?.(saved);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save seating chart.");
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-xs text-slate-600">
        Draw the layout, click <strong>Publish</strong> in the Seats.io toolbar, then save the chart here.
      </p>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
        >
          Close
        </button>
        <button
          type="button"
          disabled={saving || !config?.chart_key}
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving..." : "Save seating chart"}
        </button>
      </div>
    </div>
  );

  return (
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
            <div className="h-full min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <SeatsioDesigner
                secretKey={config.secret_key}
                chartKey={config.chart_key}
                region={config.region || "na"}
                onChartCreated={(chart) => {
                  setConfig((prev) => ({ ...prev, chart_key: chart.key }));
                }}
                onChartUpdated={() => {
                  /* chart auto-saved in seats.io */
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
  );
}
