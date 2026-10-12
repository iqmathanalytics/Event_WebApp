import { useCallback, useEffect, useState } from "react";
import {
  createEventAnalyticsShare,
  fetchEventAnalyticsShares,
  revokeEventAnalyticsShare
} from "../services/organizerAnalyticsService";

function initialsFromShare(share) {
  const name = String(share?.name || "").trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const email = String(share?.email || "").trim();
  return email ? email.slice(0, 2).toUpperCase() : "?";
}

function SoftRows({ rows = 2 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-2xl border border-slate-100 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100"
        />
      ))}
    </div>
  );
}

export default function EventAnalyticsSharePanel({ eventId, eventTitle, embedded = false }) {
  const [email, setEmail] = useState("");
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadShares = useCallback(async () => {
    if (!eventId) {
      setShares([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetchEventAnalyticsShares(eventId);
      setShares(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setShares([]);
      setError(err?.response?.data?.message || "Could not load shared access.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadShares();
  }, [loadShares]);

  const onShare = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    const value = String(email || "").trim();
    if (!value) {
      setError("Enter another organizer’s email.");
      return;
    }
    try {
      setSaving(true);
      const res = await createEventAnalyticsShare(eventId, value);
      const emailSent = res?.data?.email_sent;
      const emailError = res?.data?.email_error;
      const alreadyAccepted =
        String(res?.data?.status || "").toLowerCase() === "accepted" && emailSent === false && !emailError;
      if (alreadyAccepted) {
        setMessage(res?.message || "This organizer already has analytics access.");
      } else if (emailSent === false) {
        setError(
          res?.message ||
            (emailError
              ? `Invite saved, but email failed: ${emailError}`
              : "Invite saved, but the invitation email was not sent. Check server Brevo config and logs.")
        );
      } else {
        setMessage(res?.message || "Invitation sent. They must accept before access is granted.");
      }
      setEmail("");
      await loadShares();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not share analytics access.");
    } finally {
      setSaving(false);
    }
  };

  const onRevoke = async (shareId) => {
    setError("");
    setMessage("");
    try {
      setSaving(true);
      await revokeEventAnalyticsShare(eventId, shareId);
      setMessage("Access revoked.");
      await loadShares();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not revoke access.");
    } finally {
      setSaving(false);
    }
  };

  if (!eventId) {
    return (
      <div className={embedded ? "" : "rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:col-span-2"}>
        <p className="text-sm font-semibold text-slate-900">Share analytics</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Save this event first, then you can invite another organizer by email.
        </p>
      </div>
    );
  }

  const acceptedCount = shares.filter((s) => String(s.status || "").toLowerCase() === "accepted").length;
  const pendingCount = shares.filter((s) => String(s.status || "").toLowerCase() === "pending").length;

  const body = (
    <>
      {!embedded ? (
        <>
          <p className="text-sm font-semibold text-slate-900">Share analytics</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Invite another organizer by email
            {eventTitle ? (
              <>
                {" "}
                for <span className="font-medium text-slate-800">{eventTitle}</span>
              </>
            ) : null}
            . They only get access after accepting the invitation. They cannot edit the event, bookings, or
            coupons.
          </p>
        </>
      ) : (
        <p className="text-sm leading-relaxed text-slate-600">
          Invite another organizer by email. Access starts after they accept — view-only, no edits to the
          event, bookings, or coupons.
        </p>
      )}

      <form
        onSubmit={onShare}
        className={`${embedded ? "mt-4" : "mt-4"} rounded-2xl border border-slate-200 bg-slate-50/80 p-3 lg:bg-transparent lg:p-0 lg:border-0`}
      >
        <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          Organizer email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="organizer@example.com"
            className="mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-rose-500/30 placeholder:text-slate-400 focus:border-rose-300 focus:ring-2 lg:min-h-0 lg:py-2.5"
            autoComplete="email"
          />
        </label>
        <button
          type="submit"
          disabled={saving || !email.trim()}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50 sm:w-auto lg:min-h-0 lg:rounded-xl lg:py-2.5"
        >
          {saving ? "Sending…" : "Send invite"}
        </button>
      </form>

      {error ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          {message}
        </p>
      ) : null}

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">People with access</p>
          {!loading && shares.length > 0 ? (
            <p className="text-[11px] font-medium text-slate-500">
              {acceptedCount} accepted
              {pendingCount ? ` · ${pendingCount} pending` : ""}
            </p>
          ) : null}
        </div>

        {loading ? (
          <SoftRows rows={2} />
        ) : shares.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center">
            <p className="text-sm font-semibold text-slate-900">No invitations yet</p>
            <p className="mt-1 text-sm text-slate-600">Send an email invite to share this event’s analytics.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {shares.map((share) => {
              const pending = String(share.status || "").toLowerCase() === "pending";
              return (
                <li
                  key={share.id}
                  className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        pending
                          ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
                          : "bg-rose-50 text-rose-800 ring-1 ring-rose-100"
                      }`}
                      aria-hidden="true"
                    >
                      {initialsFromShare(share)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {share.name || share.email}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            pending ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {pending ? "Pending" : "Accepted"}
                        </span>
                      </div>
                      {share.name ? (
                        <p className="truncate text-xs text-slate-500">{share.email}</p>
                      ) : (
                        <p className="text-xs text-slate-500">
                          {pending ? "Waiting for email acceptance" : "Can view analytics"}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void onRevoke(share.id)}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-rose-200 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 active:scale-[0.98] disabled:opacity-50 lg:min-h-0 lg:rounded-lg lg:border-slate-200 lg:px-2.5 lg:py-1 lg:text-xs lg:text-rose-700"
                  >
                    {pending ? "Cancel invite" : "Revoke"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );

  if (embedded) {
    return <div>{body}</div>;
  }

  return <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:col-span-2">{body}</div>;
}
