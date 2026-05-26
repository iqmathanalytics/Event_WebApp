import { useCallback, useEffect, useState } from "react";
import {
  approveAdminPlatformTicketAccessRequest,
  fetchAdminPlatformTicketAccessRequests,
  rejectAdminPlatformTicketAccessRequest
} from "../services/platformTicketRequestService";
import { formatDateUS } from "../utils/format";

export default function AdminPlatformTicketRequestsPanel() {
  const [filter, setFilter] = useState("pending");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actingId, setActingId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectingId, setRejectingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchAdminPlatformTicketAccessRequests(
        filter === "all" ? {} : { status: filter }
      );
      setRows(res?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load requests.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async (id) => {
    const confirmed = window.confirm("Approve and enable on-site ticket sales for this user?");
    if (!confirmed) {
      return;
    }
    setActingId(id);
    setMessage("");
    try {
      const res = await approveAdminPlatformTicketAccessRequest(id);
      setMessage(res?.message || "Approved.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not approve request.");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id) => {
    setActingId(id);
    setMessage("");
    try {
      const res = await rejectAdminPlatformTicketAccessRequest(id, {
        note: rejectNote.trim() || undefined
      });
      setMessage(res?.message || "Rejected.");
      setRejectingId(null);
      setRejectNote("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not reject request.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold text-slate-900">On-site ticket access requests</h2>
        <p className="mt-1 text-sm text-slate-600">
          Review organizer requests to sell tickets on the platform. Approving enables on-site checkout and sends the
          user a confirmation email.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { key: "pending", label: "Pending" },
            { key: "approved", label: "Approved" },
            { key: "rejected", label: "Rejected" },
            { key: "all", label: "All" }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                filter === tab.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        {loading ? (
          <p className="px-4 py-6 text-sm text-slate-500">Loading requests…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No requests in this view.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <article key={row.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-slate-900">{row.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          row.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : row.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {row.status}
                      </span>
                      {row.can_sell_platform_tickets === 1 ? (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-800">
                          Capability on
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {row.email}
                      {row.mobile_number ? ` · ${row.mobile_number}` : ""}
                    </p>
                    {row.organization_name ? (
                      <p className="mt-1 text-sm font-medium text-slate-800">{row.organization_name}</p>
                    ) : null}
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{row.message}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Request #{row.id} · User #{row.user_id} · Submitted {formatDateUS(row.created_at)}
                    </p>
                    {row.admin_note ? (
                      <p className="mt-2 text-xs text-slate-600">
                        <span className="font-semibold">Admin note:</span> {row.admin_note}
                      </p>
                    ) : null}
                  </div>
                  {row.status === "pending" ? (
                    <div className="flex shrink-0 flex-col gap-2 sm:w-48">
                      <button
                        type="button"
                        disabled={actingId === row.id}
                        onClick={() => void handleApprove(row.id)}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        Approve
                      </button>
                      {rejectingId === row.id ? (
                        <>
                          <textarea
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            placeholder="Optional note to sender"
                            rows={3}
                            className="w-full rounded-xl border border-slate-300 px-2 py-1.5 text-xs"
                          />
                          <button
                            type="button"
                            disabled={actingId === row.id}
                            onClick={() => void handleReject(row.id)}
                            className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                          >
                            Confirm reject
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectNote("");
                            }}
                            className="text-xs font-semibold text-slate-500"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={actingId === row.id}
                          onClick={() => setRejectingId(row.id)}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
