import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchMyEvents, updateEvent } from "../services/eventService";
import { fetchOrganizerBookings } from "../services/bookingService";
import { normalizeEventTicketSalesMode } from "../utils/eventTicketSalesMode";

function isVendorTrackingEnabled(event) {
  return (
    event?.vendor_code_enabled === 1 ||
    event?.vendor_code_enabled === true ||
    String(event?.vendor_code_enabled || "") === "1"
  );
}

export default function OrganizerVendorCodesPanel() {
  const [events, setEvents] = useState([]);
  const [vendorUsage, setVendorUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [eventsRes, bookingsRes] = await Promise.all([
        fetchMyEvents(),
        fetchOrganizerBookings().catch(() => ({ data: [] }))
      ]);
      const platform = (eventsRes?.data || []).filter(
        (e) => normalizeEventTicketSalesMode(e.ticket_sales_mode) === "platform"
      );
      setEvents(platform);
      const counts = new Map();
      (bookingsRes?.data || []).forEach((row) => {
        const code = String(row.vendor_code || "").trim().toUpperCase();
        if (!code) {
          return;
        }
        const prev = counts.get(code) || { code, bookings: 0, guests: 0 };
        prev.bookings += 1;
        prev.guests += Number(row.attendee_count) || 0;
        counts.set(code, prev);
      });
      setVendorUsage([...counts.values()].sort((a, b) => b.bookings - a.bookings));
    } catch (err) {
      setEvents([]);
      setError(err?.response?.data?.message || "Could not load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggle = async (event, enabled) => {
    try {
      setSavingId(event.id);
      setError("");
      setSuccess("");
      await updateEvent(event.id, {
        vendor_code_enabled: Boolean(enabled)
      });
      setEvents((prev) =>
        prev.map((row) =>
          String(row.id) === String(event.id)
            ? { ...row, vendor_code_enabled: enabled ? 1 : 0 }
            : row
        )
      );
      setSuccess(
        enabled
          ? `Vendor tracking enabled for “${event.title || "event"}”.`
          : `Vendor tracking turned off for “${event.title || "event"}”.`
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Could not update vendor tracking.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tracking</p>
        <h2 className="text-lg font-bold text-slate-900">Vendor codes</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Turn on vendor tracking per event. Buyers can enter any vendor code at checkout so you know
          which partner referred them. No discount is applied. Codes used on bookings appear below and
          in Event performance analytics under Bookings & revenue.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </p>
      ) : null}

      {loading ? <p className="text-sm text-slate-500">Loading events…</p> : null}

      {!loading && events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
          No on-site ticket events yet. Create a platform-ticket event to enable vendor tracking.
        </div>
      ) : null}

      {!loading && events.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <ul className="divide-y divide-slate-100">
            {events.map((event) => {
              const enabled = isVendorTrackingEnabled(event);
              const busy = savingId === event.id;
              return (
                <li
                  key={event.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {event.title || `Event #${event.id}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {enabled
                        ? "Checkout shows a vendor code field (tracking only)."
                        : "Vendor code field is hidden on checkout."}
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={busy}
                      onChange={(e) => void onToggle(event, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                    />
                    {busy ? "Saving…" : "Enable tracking"}
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {!loading ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-900">Codes used on bookings</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Attribution from checkout. CSV/Excel export in Event performance → Bookings & revenue includes this column too.
            </p>
          </div>
          {vendorUsage.length === 0 ? (
            <p className="px-4 py-5 text-sm text-slate-500">No vendor codes have been used on bookings yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-2.5">Vendor code</th>
                  <th className="px-4 py-2.5 text-right">Bookings</th>
                  <th className="px-4 py-2.5 text-right">Guests</th>
                </tr>
              </thead>
              <tbody>
                {vendorUsage.map((row) => (
                  <tr key={row.code} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 font-semibold uppercase tracking-wide text-slate-900">{row.code}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{row.bookings}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{row.guests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </motion.section>
  );
}
