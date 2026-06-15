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
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save seating chart.");
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-600">
          Draw sections, rows, and categories. Match category numbers to ticket tiers (1 = first tier).
          Click <strong>Publish</strong> in the seats.io toolbar when your layout is ready, then save here.
        </p>
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
          disabled={saving || !config?.chart_key}
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save seating chart"}
        </button>
      </div>
    </div>
  );

  return (
    <SeatingModalShell
      open={open}
      onClose={onClose}
      title={eventTitle ? `Seating chart — ${eventTitle}` : "Design seating chart"}
      subtitle="Use the floor plan designer to lay out seats, tables, and general admission areas."
      footer={footer}
      size="full"
    >
      <div className="flex h-[min(68vh,640px)] flex-col">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">Loading designer…</div>
        ) : null}
        {error ? (
          <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
        {!loading && config?.secret_key ? (
          <div className="relative min-h-0 flex-1 overflow-hidden p-2 sm:p-3" style={{ minHeight: 520 }}>
            <div className="h-full w-full min-h-[520px]">
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
