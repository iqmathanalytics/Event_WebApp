import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchMyEvents, updateEvent } from "../services/eventService";
import { fetchOrganizerBookings } from "../services/bookingService";
import {
  createEventVendorShare,
  fetchEventVendorShares,
  revokeEventVendorShare
} from "../services/vendorShareService";
import { normalizeEventTicketSalesMode } from "../utils/eventTicketSalesMode";
import { formatCurrency } from "../utils/format";
import VendorInsightsPanel from "./VendorInsightsPanel";

function isVendorTrackingEnabled(event) {
  return (
    event?.vendor_code_enabled === 1 ||
    event?.vendor_code_enabled === true ||
    String(event?.vendor_code_enabled || "") === "1"
  );
}

function PartnerShareBlock({ event, onOpenDashboard }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const loadShares = useCallback(async () => {
    if (!event?.id) {
      setShares([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetchEventVendorShares(event.id);
      setShares(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setShares([]);
      setError(err?.response?.data?.message || "Could not load partners.");
    } finally {
      setLoading(false);
    }
  }, [event?.id]);

  useEffect(() => {
    void loadShares();
  }, [loadShares]);

  const onInvite = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const value = String(email || "").trim();
    if (!value) {
      setError("Enter the partner’s email.");
      return;
    }
    try {
      setSaving(true);
      const res = await createEventVendorShare(event.id, {
        email: value,
        vendor_code: code.trim() || undefined
      });
      if (res?.data?.email_sent === false && String(res?.data?.status || "") !== "accepted") {
        setError(res?.message || "Invite saved, but the email was not sent.");
      } else {
        setMessage(res?.message || "Invitation sent.");
      }
      setEmail("");
      setCode("");
      await loadShares();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not send invite.");
    } finally {
      setSaving(false);
    }
  };

  const onRevoke = async (shareId) => {
    setError("");
    setMessage("");
    try {
      setSaving(true);
      await revokeEventVendorShare(event.id, shareId);
      setMessage("Access revoked for that partner. Your history stays here.");
      await loadShares();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not revoke access.");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (share) => {
    const url = share.share_url;
    if (!url) {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(share.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError("Could not copy link.");
    }
  };

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">Share vendor link</p>
        <p className="mt-1 text-xs text-emerald-900/80">
          Invite a partner by email. They get a dashboard for visits and bookings from their link only.
        </p>
      </div>

      <form onSubmit={onInvite} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="min-w-[12rem] flex-1 text-xs font-semibold text-slate-700">
          Partner email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="partner@email.com"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
            required
          />
        </label>
        <label className="w-full text-xs font-semibold text-slate-700 sm:w-36">
          Code (optional)
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={40}
            placeholder="Auto"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal uppercase"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "…" : "Invite"}
        </button>
      </form>

      {error ? <p className="text-xs font-medium text-rose-700">{error}</p> : null}
      {message ? <p className="text-xs font-medium text-emerald-800">{message}</p> : null}

      {loading ? <p className="text-xs text-slate-500">Loading partners…</p> : null}

      {!loading && shares.length === 0 ? (
        <p className="text-xs text-slate-500">No partners invited yet.</p>
      ) : null}

      {!loading && shares.length > 0 ? (
        <ul className="divide-y divide-emerald-100/80 overflow-hidden rounded-xl border border-emerald-100 bg-white">
          {shares.map((share) => {
            const revoked = Boolean(share.is_revoked || share.revoked_at);
            return (
              <li key={share.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {share.name || share.email}
                    {revoked ? (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Revoked
                      </span>
                    ) : (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        {share.status}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    Code {share.vendor_code}
                    {" · "}
                    {share.visits || 0} visits · {share.bookings || 0} bookings ·{" "}
                    {formatCurrency(share.revenue || 0)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyLink(share)}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-800"
                  >
                    {copiedId === share.id ? "Copied" : "Copy link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenDashboard?.(event, share)}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-800"
                  >
                    View
                  </button>
                  {!revoked ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void onRevoke(share.id)}
                      className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
                    >
                      {share.status === "pending" ? "Cancel" : "Revoke"}
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export default function OrganizerVendorCodesPanel() {
  const [events, setEvents] = useState([]);
  const [vendorUsage, setVendorUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [dashboard, setDashboard] = useState(null);

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
          row.id === event.id
            ? { ...row, vendor_code_enabled: enabled ? 1 : 0 }
            : row
        )
      );
      setSuccess(enabled ? "Vendor tracking enabled." : "Vendor tracking turned off.");
    } catch (err) {
      setError(err?.response?.data?.message || "Could not update vendor tracking.");
    } finally {
      setSavingId(null);
    }
  };

  if (dashboard?.eventId) {
    return (
      <VendorInsightsPanel
        eventId={dashboard.eventId}
        shareId={dashboard.shareId}
        vendorCode={dashboard.vendorCode}
        banner="Organizer view — history stays after revoke."
        onBack={() => setDashboard(null)}
      />
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tracking</p>
        <h2 className="text-lg font-bold text-slate-900">Vendor links</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Enable tracking, invite partners by email, and share a link with their code embedded. They only see visits
          and bookings from that link.
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
          No on-site ticket events yet. Create a platform-ticket event to enable vendor links.
        </div>
      ) : null}

      {!loading && events.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <ul className="divide-y divide-slate-100">
            {events.map((event) => {
              const enabled = isVendorTrackingEnabled(event);
              const busy = savingId === event.id;
              const open = expandedId === event.id;
              return (
                <li key={event.id} className="px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {event.title || `Event #${event.id}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {enabled
                          ? "Checkout accepts vendor codes (tracking only)."
                          : "Turn on tracking to share partner links."}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={enabled}
                          disabled={busy}
                          onChange={(e) => void onToggle(event, e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                        />
                        {busy ? "Saving…" : "Enable"}
                      </label>
                      <button
                        type="button"
                        onClick={() => setExpandedId(open ? null : event.id)}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800"
                      >
                        {open ? "Hide partners" : "Partners & links"}
                      </button>
                    </div>
                  </div>
                  {open ? (
                    <PartnerShareBlock
                      event={event}
                      onOpenDashboard={(ev, share) =>
                        setDashboard({
                          eventId: ev.id,
                          shareId: share.id,
                          vendorCode: share.vendor_code
                        })
                      }
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {!loading ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-900">All codes on your bookings</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Includes partner links and any codes typed at checkout.
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
                    <td className="px-4 py-2.5 font-semibold uppercase tracking-wide text-slate-900">
                      {row.code}
                    </td>
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
