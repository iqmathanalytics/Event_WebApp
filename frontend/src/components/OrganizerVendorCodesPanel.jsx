import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiTag } from "react-icons/fi";
import { fetchMyEvents, updateEvent } from "../services/eventService";
import { formatCurrency } from "../utils/format";
import { normalizeEventTicketSalesMode } from "../utils/eventTicketSalesMode";

const emptyForm = {
  event_id: "",
  vendor_code_enabled: true,
  vendor_code: "",
  vendor_discount_type: "percent",
  vendor_discount_value: ""
};

function eventToForm(event) {
  return {
    event_id: String(event.id),
    vendor_code_enabled:
      event.vendor_code_enabled === 1 ||
      event.vendor_code_enabled === true ||
      String(event.vendor_code_enabled || "") === "1",
    vendor_code: event.vendor_code || "",
    vendor_discount_type: event.vendor_discount_type === "fixed_amount" ? "fixed_amount" : "percent",
    vendor_discount_value:
      event.vendor_discount_value != null && event.vendor_discount_value !== ""
        ? String(event.vendor_discount_value)
        : ""
  };
}

function discountLabel(event) {
  const enabled =
    event.vendor_code_enabled === 1 ||
    event.vendor_code_enabled === true ||
    String(event.vendor_code_enabled || "") === "1";
  if (!enabled || !event.vendor_code) {
    return "Off";
  }
  if (event.vendor_discount_type === "fixed_amount") {
    return `${formatCurrency(Number(event.vendor_discount_value || 0))} off`;
  }
  return `${Number(event.vendor_discount_value || 0)}% off`;
}

export default function OrganizerVendorCodesPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [lockEvent, setLockEvent] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

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
      setError(err?.response?.data?.message || "Could not load events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingEventId(null);
    setLockEvent(false);
    setForm({
      ...emptyForm,
      event_id: events[0]?.id ? String(events[0].id) : ""
    });
    setFormOpen(true);
    setError("");
    setSuccess("");
  };

  const openEdit = (event) => {
    setEditingEventId(event.id);
    setLockEvent(true);
    setForm(eventToForm(event));
    setFormOpen(true);
    setError("");
    setSuccess("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const eventId = Number(form.event_id || editingEventId);
    if (!eventId) {
      setError("Select an event.");
      return;
    }
    if (form.vendor_code_enabled && !String(form.vendor_code || "").trim()) {
      setError("Enter a vendor code, or turn it off.");
      return;
    }
    if (
      form.vendor_code_enabled &&
      !(Number(form.vendor_discount_value === "" ? 0 : form.vendor_discount_value) > 0)
    ) {
      setError("Enter a discount value, or turn the vendor code off.");
      return;
    }

    try {
      setSaving(true);
      await updateEvent(eventId, {
        vendor_code_enabled: Boolean(form.vendor_code_enabled),
        vendor_code: form.vendor_code_enabled
          ? String(form.vendor_code || "").trim().toUpperCase()
          : "",
        vendor_discount_type:
          form.vendor_discount_type === "fixed_amount" ? "fixed_amount" : "percent",
        vendor_discount_value: form.vendor_code_enabled
          ? Number(form.vendor_discount_value === "" ? 0 : form.vendor_discount_value)
          : 0
      });
      setSuccess(form.vendor_code_enabled ? "Vendor code saved." : "Vendor code turned off for this event.");
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save vendor code.");
    } finally {
      setSaving(false);
    }
  };

  const onDisable = async (event) => {
    try {
      setSaving(true);
      setError("");
      await updateEvent(event.id, {
        vendor_code_enabled: false,
        vendor_code: "",
        vendor_discount_value: 0
      });
      setSuccess("Vendor code disabled.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not disable vendor code.");
    } finally {
      setSaving(false);
    }
  };

  const configured = events.filter(
    (ev) =>
      (ev.vendor_code_enabled === 1 ||
        ev.vendor_code_enabled === true ||
        String(ev.vendor_code_enabled || "") === "1") &&
      String(ev.vendor_code || "").trim()
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Promotions</p>
          <h2 className="text-lg font-bold text-slate-900">Vendor codes</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Set one vendor discount code per on-site event. Buyers enter it at checkout the same way as a coupon
            (one discount at a time).
          </p>
        </motion.div>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreate}
          disabled={!events.length}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
        >
          Configure vendor code
        </motion.button>
      </motion.div>

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

      {formOpen ? (
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5"
        >
          <h3 className="text-base font-semibold text-slate-900">
            {editingEventId ? "Edit vendor code" : "Vendor code for event"}
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Event</span>
              <select
                value={form.event_id}
                onChange={(e) => {
                  const id = e.target.value;
                  const selected = events.find((ev) => String(ev.id) === String(id));
                  if (selected) {
                    setEditingEventId(selected.id);
                    setForm(eventToForm(selected));
                  } else {
                    setForm((s) => ({ ...s, event_id: id }));
                  }
                }}
                required
                disabled={lockEvent}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-50"
              >
                <option value="">Select an event</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title || `Event #${ev.id}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex cursor-pointer items-start gap-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={Boolean(form.vendor_code_enabled)}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    vendor_code_enabled: e.target.checked
                  }))
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">Enable vendor code</span>
                <span className="block text-xs text-slate-500">
                  When off, the vendor code field is hidden on this event’s checkout.
                </span>
              </span>
            </label>

            {form.vendor_code_enabled ? (
              <>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Code</span>
                  <input
                    value={form.vendor_code}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, vendor_code: e.target.value.toUpperCase() }))
                    }
                    maxLength={40}
                    pattern="[A-Za-z0-9]{3,40}"
                    required
                    placeholder="VENDOR20"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm uppercase"
                  />
                  <span className="mt-1 block text-[11px] text-slate-500">
                    3–40 characters, letters and numbers. Not case-sensitive.
                  </span>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Discount type
                  </span>
                  <select
                    value={form.vendor_discount_type === "fixed_amount" ? "fixed_amount" : "percent"}
                    onChange={(e) => setForm((s) => ({ ...s, vendor_discount_type: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed_amount">Fixed amount ($)</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {form.vendor_discount_type === "fixed_amount"
                      ? "Amount off (per booking)"
                      : "Percent off"}
                  </span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={form.vendor_discount_type === "percent" ? "100" : undefined}
                    required
                    value={form.vendor_discount_value}
                    onChange={(e) => setForm((s) => ({ ...s, vendor_discount_value: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </label>
              </>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save vendor code"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setFormOpen(false)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
        {loading ? (
          <p className="text-sm text-slate-500">Loading vendor codes…</p>
        ) : !events.length ? (
          <p className="text-sm text-slate-600">
            Vendor codes are available for on-site (platform) ticket events. Create a platform event first.
          </p>
        ) : !configured.length ? (
          <p className="text-sm text-slate-600">
            No vendor codes configured yet. Click “Configure vendor code” to add one for an event.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {configured.map((ev) => (
              <li key={ev.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{ev.title || `Event #${ev.id}`}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-semibold uppercase tracking-wide text-slate-800">
                      <FiTag className="h-3 w-3" />
                      {ev.vendor_code}
                    </span>
                    <span>{discountLabel(ev)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => openEdit(ev)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void onDisable(ev)}
                    className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
                  >
                    Disable
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.section>
  );
}
