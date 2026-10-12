import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiEye, FiPercent, FiTag, FiTrash2, FiX } from "react-icons/fi";
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

const modalEase = [0.22, 1, 0.36, 1];

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
    max_discount_amount:
      Number.isFinite(maxDiscountAmount) && maxDiscountAmount > 0 ? String(coupon.max_discount_amount) : ""
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

function formatOptionalNumber(value, emptyLabel = "Unlimited") {
  if (value == null || value === "") {
    return emptyLabel;
  }
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : emptyLabel;
}

export default function OrganizerCouponsPanel() {
  const [coupons, setCoupons] = useState([]);
  const [platformEvents, setPlatformEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalError, setModalError] = useState("");
  /** @type {[null | "create" | "edit" | "view", Function]} */
  const [panelMode, setPanelMode] = useState(null);
  const [activeCouponId, setActiveCouponId] = useState(null);
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

  useEffect(() => {
    if (!panelMode) {
      return undefined;
    }
    const onKey = (e) => {
      if (e.key === "Escape" && !saving) {
        setPanelMode(null);
        setActiveCouponId(null);
        setForm(emptyForm);
        setModalError("");
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [panelMode, saving]);

  const eventTitleById = useMemo(() => {
    const map = new Map();
    platformEvents.forEach((e) => map.set(Number(e.id), e.title));
    return map;
  }, [platformEvents]);

  const activeCoupon = useMemo(
    () => coupons.find((c) => Number(c.id) === Number(activeCouponId)) || null,
    [coupons, activeCouponId]
  );

  const closePanel = () => {
    if (saving) {
      return;
    }
    setPanelMode(null);
    setActiveCouponId(null);
    setForm(emptyForm);
    setModalError("");
  };

  const openCreate = () => {
    setActiveCouponId(null);
    setForm(emptyForm);
    setPanelMode("create");
    setError("");
    setSuccess("");
    setModalError("");
  };

  const openEdit = (coupon) => {
    setActiveCouponId(coupon.id);
    setForm(couponToForm(coupon));
    setPanelMode("edit");
    setError("");
    setSuccess("");
    setModalError("");
  };

  const openView = (coupon) => {
    setActiveCouponId(coupon.id);
    setForm(couponToForm(coupon));
    setPanelMode("view");
    setError("");
    setSuccess("");
    setModalError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setModalError("");
    setSuccess("");
    try {
      setSaving(true);
      const payload = buildPayload(form);
      if (panelMode === "edit" && activeCouponId) {
        await updateOrganizerCoupon(activeCouponId, payload);
        setSuccess("Coupon updated.");
      } else {
        await createOrganizerCoupon(payload);
        setSuccess("Coupon created.");
      }
      setSaving(false);
      setPanelMode(null);
      setActiveCouponId(null);
      setForm(emptyForm);
      setModalError("");
      await load();
    } catch (err) {
      setModalError(err?.response?.data?.message || "Could not save coupon.");
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
      if (Number(activeCouponId) === Number(id)) {
        closePanel();
      }
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

  const modalTitle =
    panelMode === "view"
      ? "Coupon details"
      : panelMode === "edit"
        ? "Edit coupon"
        : panelMode === "create"
          ? "New coupon"
          : "";

  const modalContentKey =
    panelMode === "view"
      ? `view-${activeCouponId}`
      : panelMode === "edit"
        ? `edit-${activeCouponId}`
        : panelMode === "create"
          ? "create"
          : "closed";

  const modal = (
    <AnimatePresence>
      {panelMode ? (
        <motion.div
          key="coupon-modal-shell"
          className="fixed inset-0 z-[320] flex items-end justify-center p-3 sm:items-center sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: modalEase }}
        >
          <motion.button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closePanel}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="coupon-modal-title"
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.85 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[min(92vh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/[0.04]"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-white px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Promotions</p>
                <h3 id="coupon-modal-title" className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">
                  {modalTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="grid h-9 w-9 shrink-0 place-content-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={modalContentKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: modalEase }}
                >
                  {panelMode === "view" && activeCoupon ? (
                    <div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h4 className="font-mono text-xl font-bold tracking-wide text-slate-900">
                            {activeCoupon.code}
                          </h4>
                          <p className="mt-1 text-sm text-slate-700">{discountLabel(activeCoupon)}</p>
                        </div>
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                            activeCoupon.is_active
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {activeCoupon.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Applies to</dt>
                          <dd className="mt-1 text-sm font-medium text-slate-900">
                            {activeCoupon.scope === "all_events" ? "All on-site events" : "Selected events"}
                          </dd>
                          {activeCoupon.scope === "specific_events" &&
                          Array.isArray(activeCoupon.event_ids) &&
                          activeCoupon.event_ids.length ? (
                            <p className="mt-1 text-xs text-slate-600">
                              {activeCoupon.event_ids
                                .map((id) => eventTitleById.get(Number(id)) || `Event #${id}`)
                                .join(", ")}
                            </p>
                          ) : null}
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Usage</dt>
                          <dd className="mt-1 text-sm font-medium text-slate-900">
                            Used {Number(activeCoupon.redemption_count || 0)}
                            {activeCoupon.max_redemptions != null
                              ? ` / ${activeCoupon.max_redemptions}`
                              : " (unlimited)"}
                          </dd>
                          <p className="mt-1 text-xs text-slate-600">
                            Active holds: {Number(activeCoupon.active_holds || 0)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Valid from</dt>
                          <dd className="mt-1 text-sm font-medium text-slate-900">
                            {activeCoupon.starts_at
                              ? formatCouponDateTimeUS(activeCoupon.starts_at)
                              : "Anytime"}
                          </dd>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Valid until</dt>
                          <dd className="mt-1 text-sm font-medium text-slate-900">
                            {activeCoupon.ends_at
                              ? formatCouponDateTimeUS(activeCoupon.ends_at)
                              : "No end date"}
                          </dd>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Max uses per customer
                          </dt>
                          <dd className="mt-1 text-sm font-medium text-slate-900">
                            {formatOptionalNumber(activeCoupon.max_redemptions_per_user)}
                          </dd>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Minimum tickets
                          </dt>
                          <dd className="mt-1 text-sm font-medium text-slate-900">
                            {formatOptionalNumber(activeCoupon.min_ticket_count, "None")}
                          </dd>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Minimum order
                          </dt>
                          <dd className="mt-1 text-sm font-medium text-slate-900">
                            {activeCoupon.min_order_amount != null && Number(activeCoupon.min_order_amount) > 0
                              ? formatCurrency(Number(activeCoupon.min_order_amount))
                              : "None"}
                          </dd>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                          <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Max discount cap
                          </dt>
                          <dd className="mt-1 text-sm font-medium text-slate-900">
                            {activeCoupon.discount_type === "percent" &&
                            activeCoupon.max_discount_amount != null &&
                            Number(activeCoupon.max_discount_amount) > 0
                              ? formatCurrency(Number(activeCoupon.max_discount_amount))
                              : "None"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ) : null}

                  {panelMode === "create" || panelMode === "edit" ? (
                    <form id="coupon-modal-form" onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        <span className="mt-1 block text-[11px] text-slate-500">
                          5–20 characters, letters and numbers. Not case-sensitive.
                        </span>
                      </label>

                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Discount type
                        </span>
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
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Max discount cap ($)
                          </span>
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
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setForm((s) => ({ ...s, scope: "all_events", event_ids: [] }))}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                              form.scope === "all_events"
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            All on-site events
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm((s) => ({ ...s, scope: "specific_events" }))}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                              form.scope === "specific_events"
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            Selected events
                          </button>
                        </div>
                        {form.scope === "specific_events" ? (
                          <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                            {platformEvents.length === 0 ? (
                              <p className="text-xs text-slate-500">
                                No on-site ticket events yet. Set ticket sales to on-site first.
                              </p>
                            ) : (
                              platformEvents.map((ev) => (
                                <label
                                  key={ev.id}
                                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                                >
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
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Max total uses
                        </span>
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
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Max uses per customer
                        </span>
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
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Minimum tickets
                        </span>
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
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          Minimum order ($)
                        </span>
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
                        <span className="text-sm font-medium text-slate-800">
                          Active (customers can use this code)
                        </span>
                      </label>
                    </form>
                  ) : null}
                </motion.div>
              </AnimatePresence>

              {modalError ? (
                <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  {modalError}
                </p>
              ) : null}
            </div>

            <div className="sticky bottom-0 z-10 flex flex-wrap gap-2 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
              {panelMode === "view" && activeCoupon ? (
                <>
                  <button
                    type="button"
                    onClick={() => openEdit(activeCoupon)}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Edit coupon
                  </button>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Close
                  </button>
                </>
              ) : null}
              {panelMode === "create" || panelMode === "edit" ? (
                <>
                  <button
                    type="submit"
                    form="coupon-modal-form"
                    disabled={saving}
                    className="rounded-xl bg-[#E31C5F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#D70466] disabled:opacity-60"
                  >
                    {saving ? "Saving…" : panelMode === "edit" ? "Save changes" : "Create coupon"}
                  </button>
                  <button
                    type="button"
                    onClick={closePanel}
                    disabled={saving}
                    className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
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
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-soft lg:min-h-0"
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                <div className="hide-scrollbar flex w-full min-w-0 flex-nowrap gap-2 overflow-x-auto lg:w-auto lg:flex-wrap lg:overflow-visible">
                  <button
                    type="button"
                    onClick={() => openView(coupon)}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 lg:min-h-0 lg:py-1.5 lg:text-xs"
                  >
                    <FiEye className="h-3.5 w-3.5" />
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(coupon)}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 lg:min-h-0 lg:py-1.5 lg:text-xs"
                  >
                    Edit
                  </button>
                  {coupon.is_active ? (
                    <button
                      type="button"
                      onClick={() => void onDeactivate(coupon.id)}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-900 lg:min-h-0 lg:py-1.5 lg:text-xs"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void onActivate(coupon.id)}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-sm font-semibold text-emerald-900 lg:min-h-0 lg:py-1.5 lg:text-xs"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void onDelete(coupon.id)}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-800 lg:min-h-0 lg:py-1.5 lg:text-xs"
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.article>
          ))
        )}
      </div>

      {typeof document !== "undefined" ? createPortal(modal, document.body) : null}
    </motion.section>
  );
}
