import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { fetchMyEvents, updateEvent } from "../services/eventService";
import {
  createEventVendorShare,
  fetchEventVendorShares,
  revokeEventVendorShare
} from "../services/vendorShareService";
import { normalizeEventTicketSalesMode } from "../utils/eventTicketSalesMode";
import { formatCurrency } from "../utils/format";
import WorkspaceTabSwitchLoader from "./WorkspaceTabSwitchLoader";
import VendorSharedList from "./VendorSharedList";
import VendorInsightsPanel from "./VendorInsightsPanel";

const SUB_TABS = [
  { key: "shared", label: "Shared with me" },
  { key: "tracking", label: "Tracking" }
];

const PANEL_EASE = [0.22, 1, 0.36, 1];

function isVendorTrackingEnabled(event) {
  return (
    event?.vendor_code_enabled === 1 ||
    event?.vendor_code_enabled === true ||
    String(event?.vendor_code_enabled || "") === "1"
  );
}

function SoftSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-2xl bg-slate-100/90"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

function PartnerShareBlock({ event, onViewPartner }) {
  const [email, setEmail] = useState("");
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const loadShares = useCallback(async () => {
    if (!event?.id) {
      setShares([]);
      setLoading(false);
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
      setError("Enter the partner’s email address.");
      return;
    }
    try {
      setSaving(true);
      const res = await createEventVendorShare(event.id, { email: value });
      if (res?.data?.email_sent === false && String(res?.data?.status || "") !== "accepted") {
        setError(res?.message || "Invite created, but the email could not be sent.");
      } else {
        setMessage(res?.message || "Invitation sent.");
      }
      setEmail("");
      await loadShares();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not send the invitation.");
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
      setMessage("Partner access revoked. Your tracking history is still available.");
      await loadShares();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not revoke access.");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (share) => {
    if (!share.share_url) {
      return;
    }
    try {
      await navigator.clipboard.writeText(share.share_url);
      setCopiedId(share.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError("Could not copy the link.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.28, ease: PANEL_EASE }}
      className="overflow-hidden"
    >
      <div className="mt-3 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <div>
          <p className="text-xs font-semibold text-slate-900">Invite a partner</p>
          <p className="mt-0.5 text-xs text-slate-600">
            They receive a unique event link. Visits and bookings from that link appear in their dashboard — and
            yours.
          </p>
        </div>

        <form onSubmit={onInvite} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-xs font-semibold text-slate-700">
            Partner email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="partner@company.com"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
              required
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50 lg:min-h-0 lg:py-2"
          >
            {saving ? "Sending…" : "Send invite"}
          </button>
        </form>

        {error ? <p className="text-xs font-medium text-rose-700">{error}</p> : null}
        {message ? <p className="text-xs font-medium text-emerald-800">{message}</p> : null}

        {loading ? <SoftSkeleton rows={2} /> : null}

        {!loading && shares.length === 0 ? (
          <p className="text-xs text-slate-500">No partners invited for this event yet.</p>
        ) : null}

        {!loading && shares.length > 0 ? (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {shares.map((share) => {
              const revoked = Boolean(share.is_revoked || share.revoked_at);
              return (
                <li
                  key={share.id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {share.name || share.email}
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        {revoked ? "Revoked" : share.status}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {share.visits || 0} visits · {share.bookings || 0} bookings ·{" "}
                      {formatCurrency(share.revenue || 0)}
                    </p>
                  </div>
                  <div className="hide-scrollbar flex w-full min-w-0 flex-nowrap gap-2 overflow-x-auto lg:w-auto lg:flex-wrap lg:overflow-visible">
                    <button
                      type="button"
                      onClick={() => void copyLink(share)}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-slate-300 px-3 text-sm font-semibold text-slate-800 lg:min-h-0 lg:py-1 lg:text-xs"
                    >
                      {copiedId === share.id ? "Copied" : "Copy link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onViewPartner?.(event, share)}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-slate-300 px-3 text-sm font-semibold text-slate-800 lg:min-h-0 lg:py-1 lg:text-xs"
                    >
                      View
                    </button>
                    {!revoked ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void onRevoke(share.id)}
                        className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-rose-200 px-3 text-sm font-semibold text-rose-700 lg:min-h-0 lg:py-1 lg:text-xs"
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
    </motion.div>
  );
}

function TrackingPanel({ onViewPartner }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const eventsRes = await fetchMyEvents();
      const platform = (eventsRes?.data || []).filter(
        (e) => normalizeEventTicketSalesMode(e.ticket_sales_mode) === "platform"
      );
      setEvents(platform);
    } catch (err) {
      setEvents([]);
      setError(err?.response?.data?.message || "Could not load your events.");
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
      await updateEvent(event.id, { vendor_code_enabled: Boolean(enabled) });
      setEvents((prev) =>
        prev.map((row) =>
          row.id === event.id ? { ...row, vendor_code_enabled: enabled ? 1 : 0 } : row
        )
      );
      setSuccess(
        enabled ? "Partner link tracking is on for this event." : "Partner link tracking is off."
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Could not update tracking.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Tracking</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Create partner links for your events. Each partner gets a private dashboard for traffic and bookings from
          their link only.
        </p>
      </div>

      <AnimatePresence mode="popLayout">
        {error ? (
          <motion.p
            key="err"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
          >
            {error}
          </motion.p>
        ) : null}
        {success ? (
          <motion.p
            key="ok"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
          >
            {success}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {loading ? <SoftSkeleton rows={4} /> : null}

      {!loading && events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
          Create a platform-ticket event to start sharing partner links.
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
                          ? "Partner links are active for this event."
                          : "Turn on tracking to invite partners and share links."}
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
                        className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 lg:min-h-0 lg:text-xs"
                      >
                        {open ? "Hide partners" : "Manage partners"}
                      </button>
                    </div>
                  </div>
                  <AnimatePresence initial={false}>
                    {open ? (
                      <PartnerShareBlock
                        key={`partners-${event.id}`}
                        event={event}
                        onViewPartner={onViewPartner}
                      />
                    ) : null}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Vendor host section: Shared with me | Tracking sub-tabs.
 * Tabs stay fixed; only the content pane crossfades / overlays.
 */
export default function VendorWorkspacePanel() {
  const reduceMotion = useReducedMotion();
  const [searchParams] = useSearchParams();
  const inviteEventId = String(searchParams.get("eventId") || "").trim();
  const [subTab, setSubTab] = useState(() => (inviteEventId ? "shared" : "tracking"));
  const [sharedEventId, setSharedEventId] = useState(inviteEventId);
  const [sharedListKey, setSharedListKey] = useState(0);
  const [viewTarget, setViewTarget] = useState(null);
  const [contentBusy, setContentBusy] = useState(false);
  const busyTimerRef = useRef(0);
  const onLoadingChangeRef = useRef(null);

  const fadeMs = reduceMotion ? 0.12 : 0.32;

  const setBusyBriefly = useCallback((ms = 360) => {
    if (busyTimerRef.current) {
      window.clearTimeout(busyTimerRef.current);
    }
    setContentBusy(true);
    busyTimerRef.current = window.setTimeout(() => {
      setContentBusy(false);
      busyTimerRef.current = 0;
    }, ms);
  }, []);

  useEffect(() => () => {
    if (busyTimerRef.current) {
      window.clearTimeout(busyTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (inviteEventId) {
      setSubTab("shared");
      setSharedEventId(inviteEventId);
      setSharedListKey((k) => k + 1);
    }
  }, [inviteEventId]);

  const openInsights = useCallback((next) => {
    if (busyTimerRef.current) {
      window.clearTimeout(busyTimerRef.current);
      busyTimerRef.current = 0;
    }
    setContentBusy(true);
    setViewTarget(next);
  }, []);

  const closeInsights = useCallback(() => {
    setViewTarget(null);
    setSharedEventId("");
    setBusyBriefly(reduceMotion ? 160 : 320);
  }, [reduceMotion, setBusyBriefly]);

  const switchSubTab = (key) => {
    if (key === subTab && !viewTarget) {
      return;
    }
    setViewTarget(null);
    setSharedEventId("");
    setSubTab(key);
    setBusyBriefly(reduceMotion ? 180 : 380);
  };

  onLoadingChangeRef.current = (busy) => {
    if (busy) {
      if (busyTimerRef.current) {
        window.clearTimeout(busyTimerRef.current);
        busyTimerRef.current = 0;
      }
      setContentBusy(true);
      return;
    }
    // Hold the overlay briefly so content can paint without a jump.
    const hold = reduceMotion ? 80 : 220;
    if (busyTimerRef.current) {
      window.clearTimeout(busyTimerRef.current);
    }
    busyTimerRef.current = window.setTimeout(() => {
      setContentBusy(false);
      busyTimerRef.current = 0;
    }, hold);
  };

  const onInsightsLoadingChange = useCallback((busy) => {
    onLoadingChangeRef.current?.(busy);
  }, []);

  const paneKey = viewTarget
    ? `insights-${viewTarget.eventId}-${viewTarget.shareId || viewTarget.vendorCode || ""}`
    : `tab-${subTab}`;

  return (
    <div className="space-y-4">
      <div className="hide-scrollbar flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto rounded-xl bg-slate-50 p-1.5">
        {SUB_TABS.map((tab) => {
          const selected = subTab === tab.key && !viewTarget;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchSubTab(tab.key)}
              className={`relative inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition-colors duration-200 lg:min-h-0 lg:py-2 ${
                selected ? "text-slate-900" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {selected ? (
                <motion.span
                  layoutId="vendor-subtab-pill"
                  className="absolute inset-0 rounded-lg bg-white shadow-sm ring-1 ring-slate-200/80"
                  transition={{ type: "spring", stiffness: 380, damping: 36 }}
                />
              ) : null}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="relative min-h-[320px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
        <WorkspaceTabSwitchLoader show={contentBusy} label="Loading" />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={paneKey}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
            transition={{ duration: fadeMs, ease: PANEL_EASE }}
            className="relative"
          >
            {viewTarget ? (
              <VendorInsightsPanel
                eventId={viewTarget.eventId}
                shareId={viewTarget.shareId}
                vendorCode={viewTarget.vendorCode}
                banner={viewTarget.banner}
                onBack={closeInsights}
                onLoadingChange={onInsightsLoadingChange}
                hideLocalLoader
              />
            ) : null}

            {!viewTarget && subTab === "shared" ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Shared with me</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Events where an organizer shared a partner link with you. Results include only activity from
                    your link.
                  </p>
                </div>
                <VendorSharedList
                  selectedEventId={sharedEventId}
                  reloadKey={sharedListKey}
                  onOpenEvent={(row) => {
                    setSharedEventId(String(row.event_id));
                    openInsights({
                      eventId: row.event_id,
                      shareId: row.share_id,
                      vendorCode: row.vendor_code,
                      banner: `Shared by ${row.owner?.name || row.owner?.email || "organizer"} · your link only`
                    });
                  }}
                />
              </div>
            ) : null}

            {!viewTarget && subTab === "tracking" ? (
              <TrackingPanel
                onViewPartner={(event, share) => {
                  openInsights({
                    eventId: event.id,
                    shareId: share.id,
                    vendorCode: share.vendor_code,
                    banner: "Partner results for this link"
                  });
                }}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
