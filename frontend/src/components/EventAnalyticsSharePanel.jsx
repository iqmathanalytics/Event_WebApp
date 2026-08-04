import { useCallback, useEffect, useState } from "react";
import {
  createEventAnalyticsShare,
  fetchEventAnalyticsShares,
  revokeEventAnalyticsShare
} from "../services/organizerAnalyticsService";

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
      const alreadyAccepted = String(res?.data?.status || "").toLowerCase() === "accepted" && emailSent === false && !emailError;
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
        <p className="mt-1 text-xs text-slate-600">
          Save this event first, then you can invite another organizer by email.
        </p>
      </div>
    );
  }

  const body = (
    <>
      {!embedded ? (
        <>
          <p className="text-sm font-semibold text-slate-900">Share analytics</p>
          <p className="mt-1 text-xs text-slate-600">
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
        <p className="text-xs text-slate-600">
          Invite another organizer by email. Access is granted only after they accept. They cannot edit the
          event, bookings, or coupons.
        </p>
      )}

      <form onSubmit={onShare} className={`${embedded ? "mt-3" : "mt-4"} flex flex-col gap-2 sm:flex-row`}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="organizer@example.com"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
          autoComplete="email"
        />
        <button
          type="submit"
          disabled={saving || !email.trim()}
          className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Sending…" : "Send invite"}
        </button>
      </form>

      {error ? <p className="mt-2 text-sm font-medium text-rose-700">{error}</p> : null}
      {message ? <p className="mt-2 text-sm font-medium text-emerald-700">{message}</p> : null}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-xs text-slate-500">Loading shared access…</p>
        ) : shares.length === 0 ? (
          <p className="text-xs text-slate-500">No invitations sent yet.</p>
        ) : (
          shares.map((share) => {
            const pending = String(share.status || "").toLowerCase() === "pending";
            return (
              <div
                key={share.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{share.name || share.email}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        pending ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {pending ? "Pending" : "Accepted"}
                    </span>
                  </div>
                  {share.name ? <p className="truncate text-xs text-slate-500">{share.email}</p> : null}
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void onRevoke(share.id)}
                  className="shrink-0 text-xs font-semibold text-rose-700 hover:text-rose-900 disabled:opacity-50"
                >
                  {pending ? "Cancel" : "Revoke"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  if (embedded) {
    return <div>{body}</div>;
  }

  return <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:col-span-2">{body}</div>;
}
