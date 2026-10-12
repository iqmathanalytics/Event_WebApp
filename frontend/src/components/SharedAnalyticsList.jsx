import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatDateUS } from "../utils/format";
import { fetchSharedOrganizerInsights } from "../services/organizerAnalyticsService";

export default function SharedAnalyticsList({ onOpenEvent, selectedEventId = null, reloadKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchSharedOrganizerInsights();
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setRows([]);
      setError(err?.response?.data?.message || "Could not load shared analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-[4.5rem] animate-pulse rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
        {error}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
        <p className="text-sm font-semibold text-slate-900">Nothing shared with you yet</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          When another organizer invites you and you accept the email invitation, the event will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const active = String(selectedEventId) === String(row.event_id);
        return (
          <motion.button
            key={row.share_id || row.event_id}
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => onOpenEvent?.(row)}
            className={`w-full min-h-11 rounded-2xl border px-4 py-3.5 text-left transition ${
              active
                ? "border-slate-900 bg-slate-900 text-white shadow-soft"
                : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`truncate text-sm font-semibold ${active ? "text-white" : "text-slate-900"}`}>
                  {row.title || `Event #${row.event_id}`}
                </p>
                <p className={`mt-1 text-xs leading-relaxed ${active ? "text-white/75" : "text-slate-500"}`}>
                  Shared by {row.owner?.name || row.owner?.email || "organizer"}
                  {row.event_date ? ` · ${formatDateUS(row.event_date)}` : ""}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  active ? "bg-white/15 text-white" : "bg-emerald-100 text-emerald-800"
                }`}
              >
                View only
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
