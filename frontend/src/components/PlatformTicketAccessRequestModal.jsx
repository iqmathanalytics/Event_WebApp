import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiInfo, FiSend } from "react-icons/fi";
import {
  fetchMyPlatformTicketAccessRequest,
  submitPlatformTicketAccessRequest
} from "../services/platformTicketRequestService";

function FormField({ label, hint, className = "", children }) {
  return (
    <div className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      {hint ? (
        <span className="mb-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
          <FiInfo className="text-slate-400" />
          {hint}
        </span>
      ) : null}
      {children}
    </div>
  );
}

const emptyForm = {
  name: "",
  email: "",
  mobile_number: "",
  organization_name: "",
  message: ""
};

export default function PlatformTicketAccessRequestModal({
  open,
  onClose,
  user,
  onSubmitted,
  onCapabilitiesUpdated
}) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [statusInfo, setStatusInfo] = useState(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setError("");
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      mobile_number: user?.mobile_number || "",
      organization_name: "",
      message: ""
    });
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchMyPlatformTicketAccessRequest();
        if (!cancelled) {
          const data = res?.data || null;
          setStatusInfo(data);
          if (data?.can_sell_platform_tickets) {
            onCapabilitiesUpdated?.();
          }
        }
      } catch (err) {
        if (!cancelled) {
          setStatusInfo(null);
          setError(err?.response?.data?.message || "Could not load request status.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, onCapabilitiesUpdated, user?.email, user?.mobile_number, user?.name]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const alreadyEnabled = Boolean(statusInfo?.can_sell_platform_tickets);
  const pendingRequest = statusInfo?.request?.status === "pending";
  const lastRejected = statusInfo?.request?.status === "rejected";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await submitPlatformTicketAccessRequest({
        name: form.name.trim(),
        email: form.email.trim(),
        mobile_number: form.mobile_number?.trim() || undefined,
        organization_name: form.organization_name?.trim() || undefined,
        message: form.message.trim()
      });
      onSubmitted?.();
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not send your request.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[350] flex items-center justify-center bg-slate-900/50 p-4">
      <div
        className="flex max-h-[min(90dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="platform-ticket-request-title"
      >
        <div className="shrink-0 border-b border-slate-200 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">On-site tickets</p>
              <h2 id="platform-ticket-request-title" className="mt-1 text-lg font-bold text-slate-900">
                Host your event on Book My Tickets
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Tell us about your events. We review requests and enable on-site checkout for approved organizers.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>

        <div className="hide-scrollbar flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : alreadyEnabled ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
              <p className="font-semibold">On-site ticket sales are already enabled</p>
              <p className="mt-1 text-emerald-900/90">
                When posting an event, choose <strong>On this site</strong> under ticket sales.
              </p>
            </div>
          ) : pendingRequest ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-semibold">Request pending review</p>
              <p className="mt-1 text-amber-900/90">
                We received your request on{" "}
                {statusInfo?.request?.created_at
                  ? new Date(statusInfo.request.created_at).toLocaleDateString("en-US")
                  : "recently"}
                . You will get an email when an admin approves it.
              </p>
            </div>
          ) : (
            <>
              {lastRejected ? (
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">Previous request was not approved</p>
                  {statusInfo?.request?.admin_note ? (
                    <p className="mt-1">Note: {statusInfo.request.admin_note}</p>
                  ) : null}
                  <p className="mt-1">You may submit a new request with more detail below.</p>
                </div>
              ) : null}
              {error ? (
                <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  {error}
                </p>
              ) : null}
              <form id="platform-ticket-request-form" onSubmit={handleSubmit} className="space-y-3">
                <FormField label="Your name" hint="How we should address you.">
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Email" hint="We will send updates here.">
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Phone" hint="Optional — helps us reach you faster.">
                  <input
                    value={form.mobile_number}
                    onChange={(e) => setForm((p) => ({ ...p, mobile_number: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Organization / venue" hint="Optional — business or promoter name.">
                  <input
                    value={form.organization_name}
                    onChange={(e) => setForm((p) => ({ ...p, organization_name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    placeholder="e.g. Downtown Live Events"
                  />
                </FormField>
                <FormField
                  label="About your events"
                  hint="Event types, expected volume, cities, and why you want on-site checkout."
                  className="sm:col-span-2"
                >
                  <textarea
                    required
                    rows={5}
                    minLength={20}
                    value={form.message}
                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    placeholder="Describe the events you plan to host and your ticketing needs…"
                  />
                </FormField>
              </form>
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3">
          {alreadyEnabled || pendingRequest ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Done
            </button>
          ) : (
            <button
              type="submit"
              form="platform-ticket-request-form"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              <FiSend className="h-4 w-4" />
              {submitting ? "Sending…" : "Send request"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
