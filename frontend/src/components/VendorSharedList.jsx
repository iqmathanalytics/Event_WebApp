import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatDateUS } from "../utils/format";
import { fetchSharedVendorEvents } from "../services/vendorShareService";

export default function VendorSharedList({ onOpenEvent, selectedEventId = null, reloadKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchSharedVendorEvents();
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setRows([]);
      setError(err?.response?.data?.message || "Could not load shared partner links.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading shared links">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
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
        <p className="text-sm font-semibold text-slate-900">No partner links yet</p>
        <p className="mt-2 text-sm text-slate-600">
          When an organizer invites you and you accept, their event appears here with results from your link.
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
            transition={{ duration: 0.18 }}
            onClick={() => onOpenEvent?.(row)}
            className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-colors duration-200 ${
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
                <p className={`mt-1 text-xs ${active ? "text-white/75" : "text-slate-500"}`}>
                  From {row.owner?.name || row.owner?.email || "organizer"}
                  {row.event_date ? ` · ${formatDateUS(row.event_date)}` : ""}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  active ? "bg-white/15 text-white" : "bg-emerald-50 text-emerald-800"
                }`}
              >
                View
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

export function VendorStatCards({ visits, bookings }) {
  const cards = [
    {
      label: "Link visits",
      hint: "Every time someone opened your partner link (including repeats)",
      value: visits?.total_hits ?? 0
    },
    {
      label: "Unique visitors",
      hint: "Distinct browsers/sessions that opened the link",
      value: visits?.unique_sessions ?? 0
    },
    {
      label: "Bookings",
      hint: "Completed checkout orders from this link",
      value: bookings?.total_bookings ?? 0
    },
    {
      label: "Guests",
      hint: "Total tickets/attendees across those bookings",
      value: bookings?.total_attendees ?? 0
    },
    {
      label: "Revenue",
      hint: "Gross ticket sales attributed to this link",
      value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
        Number(bookings?.gross_revenue) || 0
      )
    }
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{card.label}</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{card.value}</p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">{card.hint}</p>
        </div>
      ))}
    </div>
  );
}
