import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { FiInfo } from "react-icons/fi";
import { categories } from "../utils/filterOptions";

export const DEAL_OFFER_TYPES = [
  { value: "percentage_off", label: "Percentage Off" },
  { value: "flat_off", label: "Flat Amount Off" },
  { value: "bogo", label: "Buy X Get Y" },
  { value: "bundle_price", label: "Bundle Price" },
  { value: "free_item", label: "Free Item with Purchase" },
  { value: "custom", label: "Custom Offer" }
];

export const emptyDealSubmitForm = {
  title: "",
  description: "",
  city_id: "",
  category_id: "",
  provider_name: "",
  original_price: "",
  expiry_date: "",
  promo_code: "",
  deal_link: "",
  image_url: "",
  is_premium: false,
  offer_type: "percentage_off",
  offer_value: "",
  buy_qty: "",
  get_qty: "",
  minimum_spend: "",
  max_discount_amount: "",
  free_item_name: "",
  custom_offer_text: "",
  terms: ""
};

function FormField({ label, hint, example, className = "", children }) {
  return (
    <div className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      <span className="mb-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
        <FiInfo className="text-slate-400" />
        {hint}
        {example ? <span className="text-slate-400">Example: {example}</span> : null}
      </span>
      {children}
    </div>
  );
}

/**
 * Same deal submission UI as the public Deals page — used from dashboard hub too.
 */
export default function DealSubmissionModal({
  open,
  title = "Submit Deal",
  onClose,
  onSubmit,
  submitLoading,
  submitError,
  cities = [],
  form,
  setForm
}) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="deal-submit-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed inset-0 z-[220] bg-slate-950/65 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[221] flex items-center justify-center p-3 sm:p-5">
        <motion.form
          key="deal-submit-modal"
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 20, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.985 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="popup-modal flex h-[min(90vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          </div>
          <div className="hide-scrollbar flex-1 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                label="Deal Title"
                hint="Write a concise title customers can scan quickly."
                example="Buy 1 Get 2 Burger Combo"
                className="sm:col-span-2"
              >
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>
              <FormField label="Description" hint="Add key details like eligibility, timing, and availability." className="sm:col-span-2">
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>
              <FormField label="City" hint="Choose where this deal is valid.">
                <select
                  required
                  value={form.city_id}
                  onChange={(e) => setForm((p) => ({ ...p, city_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select City</option>
                  {cities.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Category" hint="Pick the most relevant deal category.">
                <select
                  required
                  value={form.category_id}
                  onChange={(e) => setForm((p) => ({ ...p, category_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Brand / Store Name" hint="Enter the business name behind this offer." example="Burger District">
                <input
                  required
                  value={form.provider_name}
                  onChange={(e) => setForm((p) => ({ ...p, provider_name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>
              <FormField label="Valid Until" hint="Users can claim this offer until this date.">
                <input
                  required
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm((p) => ({ ...p, expiry_date: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>
              <FormField label="Original Price" hint="Optional reference price before discount." example="49.99">
                <input
                  type="number"
                  min="0"
                  value={form.original_price}
                  onChange={(e) => setForm((p) => ({ ...p, original_price: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Offer Configuration</p>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    value={form.offer_type}
                    onChange={(e) => setForm((p) => ({ ...p, offer_type: e.target.value }))}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {DEAL_OFFER_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {(form.offer_type === "percentage_off" || form.offer_type === "flat_off" || form.offer_type === "bundle_price") ? (
                    <input
                      type="number"
                      min="0"
                      placeholder={form.offer_type === "percentage_off" ? "Offer Value (%)" : "Offer Value ($)"}
                      value={form.offer_value}
                      onChange={(e) => setForm((p) => ({ ...p, offer_value: e.target.value }))}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    />
                  ) : null}
                  {form.offer_type === "bogo" ? (
                    <>
                      <input
                        type="number"
                        min="1"
                        placeholder="Buy Quantity"
                        value={form.buy_qty}
                        onChange={(e) => setForm((p) => ({ ...p, buy_qty: e.target.value }))}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Get Quantity"
                        value={form.get_qty}
                        onChange={(e) => setForm((p) => ({ ...p, get_qty: e.target.value }))}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </>
                  ) : null}
                  {form.offer_type === "free_item" ? (
                    <input
                      type="text"
                      placeholder="Free Item Name"
                      value={form.free_item_name}
                      onChange={(e) => setForm((p) => ({ ...p, free_item_name: e.target.value }))}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2"
                    />
                  ) : null}
                  {form.offer_type === "custom" ? (
                    <input
                      type="text"
                      placeholder="Custom Offer Text (e.g. Buy 1 Get 2)"
                      value={form.custom_offer_text}
                      onChange={(e) => setForm((p) => ({ ...p, custom_offer_text: e.target.value }))}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2"
                    />
                  ) : null}
                  <input
                    type="number"
                    min="0"
                    placeholder="Minimum Spend (optional)"
                    value={form.minimum_spend}
                    onChange={(e) => setForm((p) => ({ ...p, minimum_spend: e.target.value }))}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Maximum Discount Cap (optional)"
                    value={form.max_discount_amount}
                    onChange={(e) => setForm((p) => ({ ...p, max_discount_amount: e.target.value }))}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                  <textarea
                    rows={2}
                    placeholder="Terms and Conditions (optional)"
                    value={form.terms}
                    onChange={(e) => setForm((p) => ({ ...p, terms: e.target.value }))}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2"
                  />
                </div>
              </div>
              <FormField label="Promo Code" hint="Optional code users apply at checkout." example="SAVE20">
                <input
                  value={form.promo_code}
                  onChange={(e) => setForm((p) => ({ ...p, promo_code: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>
              <FormField label="Deal Link" hint="Optional landing page where users redeem this offer." example="https://brand.com/deals/summer">
                <input
                  type="url"
                  value={form.deal_link}
                  onChange={(e) => setForm((p) => ({ ...p, deal_link: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>
              <FormField
                label="Image URL"
                hint="Use a high-quality image to improve clicks."
                example="https://images.example.com/deal.jpg"
                className="sm:col-span-2"
              >
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.is_premium}
                  onChange={(e) => setForm((p) => ({ ...p, is_premium: e.target.checked }))}
                />
                Mark as Premium (visible only to logged-in users)
              </label>
            </div>
            {submitError ? <p className="mt-3 text-sm text-rose-600">{submitError}</p> : null}
          </div>
          <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitLoading ? "Submitting..." : "Submit for Approval"}
            </button>
          </div>
        </motion.form>
      </div>
    </AnimatePresence>,
    document.body
  );
}
