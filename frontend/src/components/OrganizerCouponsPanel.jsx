import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiPercent, FiTag, FiTrash2 } from "react-icons/fi";
import {
  activateOrganizerCoupon,
  createOrganizerCoupon,
  deactivateOrganizerCoupon,
  deleteOrganizerCoupon,
  fetchOrganizerCoupons,
  updateOrganizerCoupon
} from "../services/couponService";
import { fetchMyEvents } from "../services/eventService";
import { formatCurrency } from "../utils/format";
import { formatCouponDateTimeUS, mysqlToDatetimeLocalInput } from "../utils/couponDatetime";
import { normalizeEventTicketSalesMode } from "../utils/eventTicketSalesMode";

const emptyForm = {
  code: "",
  discount_type: "percent",
  discount_value: "",
  scope: "all_events",
  event_ids: [],
  starts_at: "",
  ends_at: "",
  is_active: true,
  max_redemptions: "",
  max_redemptions_per_user: "",
  min_ticket_count: "",
  min_order_amount: "",
  max_discount_amount: ""
};

function couponToForm(coupon) {
  const maxDiscountAmount = Number(coupon.max_discount_amount);
  return {
    code: coupon.code || "",
    discount_type: coupon.discount_type || "percent",
    discount_value: coupon.discount_value != null ? String(coupon.discount_value) : "",
    scope: coupon.scope || "all_events",
    event_ids: Array.isArray(coupon.event_ids) ? coupon.event_ids.map(Number) : [],
    starts_at: mysqlToDatetimeLocalInput(coupon.starts_at),
    ends_at: mysqlToDatetimeLocalInput(coupon.ends_at),
    is_active: coupon.is_active === 1 || coupon.is_active === true,
    max_redemptions: coupon.max_redemptions != null ? String(coupon.max_redemptions) : "",
    max_redemptions_per_user:
      coupon.max_redemptions_per_user != null ? String(coupon.max_redemptions_per_user) : "",
    min_ticket_count: coupon.min_ticket_count != null ? String(coupon.min_ticket_count) : "",
    min_order_amount: coupon.min_order_amount != null ? String(coupon.min_order_amount) : "",
    max_discount_amount: Number.isFinite(maxDiscountAmount) && maxDiscountAmount > 0
      ? String(coupon.max_discount_amount)
      : ""
  };
}

function buildPayload(form) {
  const toOptionalNumber = (v) => {
    const s = String(v ?? "").trim();
    if (!s) {
      return null;
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  return {
    code: String(form.code || "").trim(),
    discount_type: form.discount_type,
    discount_value: Number(form.discount_value),
    scope: form.scope,
    event_ids: form.scope === "specific_events" ? form.event_ids : [],
    starts_at: form.starts_at || null,
    ends_at: form.ends_at || null,
    is_active: Boolean(form.is_active),
    max_redemptions: toOptionalNumber(form.max_redemptions),
    max_redemptions_per_user: toOptionalNumber(form.max_redemptions_per_user),
    min_ticket_count: toOptionalNumber(form.min_ticket_count),
    min_order_amount: toOptionalNumber(form.min_order_amount),
    max_discount_amount: form.discount_type === "percent" ? toOptionalNumber(form.max_discount_amount) : null
  };
}

function discountLabel(coupon) {
  if (coupon.discount_type === "percent") {
    return `${Number(coupon.discount_value)}% off`;
  }
  return `${formatCurrency(Number(coupon.discount_value))} off`;
}

export default function OrganizerCouponsPanel() {
  const [coupons, setCoupons] = useState([]);
  const [platformEvents, setPlatformEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [couponRes, eventsRes] = await Promise.all([fetchOrganizerCoupons(), fetchMyEvents()]);
      setCoupons(couponRes?.data || []);
      const events = (eventsRes?.data || []).filter(
        (e) => normalizeEventTicketSalesMode(e.ticket_sales_mode) === "platform"
      );
      setPlatformEvents(events);
    } catch (err) {
      setCoupons([]);
      setError(err?.response?.data?.message || "Could not load coupons.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const eventTitleById = useMemo(() => {
    const map = new Map();
    platformEvents.forEach((e) => map.set(Number(e.id), e.title));
    return map;
  }, [platformEvents]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError("");
    setSuccess("");
  };

  const openEdit = (coupon) => {
    setEditingId(coupon.id);
    setForm(couponToForm(coupon));
    setFormOpen(true);
    setError("");
    setSuccess("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      setSaving(true);
      const payload = buildPayload(form);
      if (editingId) {
        await updateOrganizerCoupon(editingId, payload);
        setSuccess("Coupon updated.");
      } else {
        await createOrganizerCoupon(payload);
        setSuccess("Coupon created.");
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save coupon.");
    } finally {
      setSaving(false);
    }
  };

  const onDeactivate = async (id) => {
    try {
      await deactivateOrganizerCoupon(id);
      setSuccess("Coupon deactivated.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not deactivate coupon.");
    }
  };

  const onActivate = async (id) => {
    try {
      await activateOrganizerCoupon(id);
      setSuccess("Coupon activated.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not activate coupon.");
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this coupon permanently? This only works if it was never used.")) {
      return;
    }
    try {
      await deleteOrganizerCoupon(id);
      setSuccess("Coupon deleted.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not delete coupon. Try deactivating instead.");
    }
  };

  const toggleEventId = (eventId) => {
    setForm((prev) => {
      const set = new Set(prev.event_ids);
      if (set.has(eventId)) {
        set.delete(eventId);
      } else {
        set.add(eventId);
      }
      return { ...prev, event_ids: Array.from(set) };
    });
  };

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
          <h2 className="text-lg font-bold text-slate-900">Coupon codes</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Create codes for on-site ticket checkout. Customers have 5 minutes after applying a code to complete
            booking before the reserved slot is released.
          </p>
        </motion.div>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreate}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-soft"
        >
          Create coupon
        </motion.button>
      </motion.div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>
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
          <h3 className="text-base font-semibold text-slate-900">{editingId ? "Edit coupon" : "New coupon"}</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Code</span>
              <input
                value={form.code}
                onChange={(e) => setForm((s) => ({ ...s, code: e.target.value.toUpperCase() }))}
                maxLength={20}
                pattern="[A-Za-z0-9]{5,20}"
                required
                placeholder="SUMMER20"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm uppercase"
              />
              <span className="mt-1 block text-[11px] text-slate-500">5–20 characters, letters and numbers. Not case-sensitive.</span>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Discount type</span>
              <select
                value={form.discount_type}
                onChange={(e) => setForm((s) => ({ ...s, discount_type: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="percent">Percentage (%)</option>
                <option value="fixed_amount">Fixed amount ($)</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {form.discount_type === "percent" ? "Percent off" : "Amount off (per booking)"}
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={form.discount_type === "percent" ? "100" : undefined}
                required
                value={form.discount_value}
                onChange={(e) => setForm((s) => ({ ...s, discount_value: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>

            {form.discount_type === "percent" ? (
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Max discount cap ($)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.max_discount_amount}
                  onChange={(e) => setForm((s) => ({ ...s, max_discount_amount: e.target.value }))}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </label>
            ) : null}

            <fieldset className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Applies to</span>
              <motion.div layout className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setForm((s) => ({ ...s, scope: "all_events", event_ids: [] }))}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    form.scope === "all_events" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  All on-site events
                </button>
                <button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setForm((s) => ({ ...s, scope: "specific_events" }))}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    form.scope === "specific_events" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Selected events
                </button>
              </motion.div>
              {form.scope === "specific_events" ? (
                <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                  {platformEvents.length === 0 ? (
                    <p className="text-xs text-slate-500">No on-site ticket events yet. Set ticket sales to on-site first.</p>
                  ) : (
                    platformEvents.map((ev) => (
                      <label key={ev.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={form.event_ids.includes(Number(ev.id))}
                          onChange={() => toggleEventId(Number(ev.id))}
                        />
                        <span>{ev.title}</span>
                        <span className="text-xs text-slate-500">({ev.status})</span>
                      </label>
                    ))
                  )}
                </div>
              ) : null}
            </fieldset>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Valid from</span>
              <input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) => setForm((s) => ({ ...s, starts_at: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Valid until</span>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm((s) => ({ ...s, ends_at: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Max total uses</span>
              <input
                type="number"
                min="1"
                value={form.max_redemptions}
                onChange={(e) => setForm((s) => ({ ...s, max_redemptions: e.target.value }))}
                placeholder="Unlimited"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Max uses per customer</span>
              <input
                type="number"
                min="1"
                value={form.max_redemptions_per_user}
                onChange={(e) => setForm((s) => ({ ...s, max_redemptions_per_user: e.target.value }))}
                placeholder="Unlimited"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Minimum tickets</span>
              <input
                type="number"
                min="1"
                value={form.min_ticket_count}
                onChange={(e) => setForm((s) => ({ ...s, min_ticket_count: e.target.value }))}
                placeholder="None"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Minimum order ($)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.min_order_amount}
                onChange={(e) => setForm((s) => ({ ...s, min_order_amount: e.target.value }))}
                placeholder="None"
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>

            <label className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))}
                className="rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-800">Active (customers can use this code)</span>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#E31C5F] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D70466] disabled:opacity-60"
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Create coupon"}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading coupons…</p>
        ) : coupons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <FiTag className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-800">No coupons yet</p>
            <p className="mt-1 text-xs text-slate-600">Create a code to offer discounts on on-site ticket bookings.</p>
          </div>
        ) : (
          coupons.map((coupon, index) => (
            <motion.article
              key={coupon.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              whileHover={{ y: -2 }}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <motion.div layout className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-lg font-bold tracking-wide text-slate-900">{coupon.code}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        coupon.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {coupon.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-slate-700">
                    {coupon.discount_type === "percent" ? (
                      <FiPercent className="h-4 w-4" />
                    ) : (
                      <FiTag className="h-4 w-4" />
                    )}
                    {discountLabel(coupon)}
                    {coupon.scope === "all_events" ? " · All on-site events" : " · Selected events"}
                  </p>
                  {coupon.scope === "specific_events" && Array.isArray(coupon.event_ids) && coupon.event_ids.length ? (
                    <p className="mt-1 text-xs text-slate-600">
                      {coupon.event_ids.map((id) => eventTitleById.get(Number(id)) || `Event #${id}`).join(", ")}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    Used {Number(coupon.redemption_count || 0)}
                    {coupon.max_redemptions != null ? ` / ${coupon.max_redemptions}` : ""} · Active holds:{" "}
                    {Number(coupon.active_holds || 0)}
                  </p>
                  {(coupon.starts_at || coupon.ends_at) && (
                    <p className="mt-1 text-xs text-slate-500">
                      {coupon.starts_at ? `From ${formatCouponDateTimeUS(coupon.starts_at)}` : ""}
                      {coupon.ends_at ? ` · Until ${formatCouponDateTimeUS(coupon.ends_at)}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(coupon)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  {coupon.is_active ? (
                    <button
                      type="button"
                      onClick={() => void onDeactivate(coupon.id)}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void onActivate(coupon.id)}
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void onDelete(coupon.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800"
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.article>
          ))
        )}
      </div>
    </motion.section>
  );
}
