import { useCallback, useEffect, useState } from "react";
import { formatCurrency, formatDateUS } from "../utils/format";
import { fetchVendorBookings, fetchVendorInsights } from "../services/vendorShareService";
import { VendorStatCards } from "./VendorSharedList";

function formatMoney(n) {
  return formatCurrency(Number(n) || 0);
}

export default function VendorInsightsPanel({
  eventId,
  shareId = null,
  vendorCode = null,
  banner = null,
  onBack = null
}) {
  const [insights, setInsights] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!eventId) {
      setInsights(null);
      setBookings([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const opts = { shareId, vendorCode };
      const [insRes, bookRes] = await Promise.all([
        fetchVendorInsights(eventId, opts),
        fetchVendorBookings(eventId, opts)
      ]);
      setInsights(insRes?.data || null);
      setBookings(Array.isArray(bookRes?.data?.rows) ? bookRes.data.rows : []);
    } catch (err) {
      setInsights(null);
      setBookings([]);
      setError(err?.response?.data?.message || "Could not load vendor dashboard.");
    } finally {
      setLoading(false);
    }
  }, [eventId, shareId, vendorCode]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-slate-600">Loading vendor results…</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        {onBack ? (
          <button type="button" onClick={onBack} className="text-sm font-semibold text-slate-700 underline">
            Back
          </button>
        ) : null}
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      </div>
    );
  }

  if (!insights) {
    return <p className="text-sm text-slate-500">No vendor data yet.</p>;
  }

  const tiers = insights.bookings?.tiers || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-800"
            >
              ← Back
            </button>
          ) : null}
          <h3 className="text-lg font-bold text-slate-900">{insights.event?.title || "Vendor dashboard"}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Code <span className="font-semibold text-slate-900">{insights.vendor_code}</span>
            {insights.is_revoked ? " · Revoked (organizer history)" : ""}
          </p>
          {banner ? <p className="mt-1 text-xs font-medium text-emerald-800">{banner}</p> : null}
        </div>
        {insights.share_url ? (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(insights.share_url);
            }}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:border-slate-400"
          >
            Copy link
          </button>
        ) : null}
      </div>

      <VendorStatCards visits={insights.visits} bookings={insights.bookings} />

      {tiers.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h4 className="text-sm font-bold text-slate-900">Ticket tiers</h4>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-2">Tier</th>
                <th className="px-4 py-2 text-right">Tickets</th>
                <th className="px-4 py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr key={tier.level_id} className="border-t border-slate-50">
                  <td className="px-4 py-2 font-medium text-slate-900">{tier.level_name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{tier.tickets_sold}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(tier.gross_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h4 className="text-sm font-bold text-slate-900">Bookings</h4>
          <p className="mt-0.5 text-xs text-slate-500">Only bookings made with this vendor link or code.</p>
        </div>
        {bookings.length === 0 ? (
          <p className="px-4 py-5 text-sm text-slate-500">No bookings yet for this link.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-2">Guest</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2 text-right">Guests</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((row) => (
                  <tr key={row.id} className="border-t border-slate-50">
                    <td className="px-4 py-2">
                      <p className="font-medium text-slate-900">{row.name || "—"}</p>
                      <p className="text-xs text-slate-500">{row.email || ""}</p>
                    </td>
                    <td className="px-4 py-2 text-slate-700">
                      {row.booking_date ? formatDateUS(row.booking_date) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{row.attendee_count || 0}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatMoney(row.total_amount)}</td>
                    <td className="px-4 py-2 capitalize text-slate-700">{row.payment_status || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
