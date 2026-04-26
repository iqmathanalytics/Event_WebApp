import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { FiInfo } from "react-icons/fi";
import { categories } from "../utils/filterOptions";
import CloudinaryImageInput from "./CloudinaryImageInput";

export const emptyDealSubmitForm = {
  title: "",
  description: "",
  city_id: "",
  category_id: "",
  provider_name: "",
  expiry_date: "",
  promo_code: "",
  deal_link: "",
  image_url: "",
  is_premium: false,
  deal_info: ""
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
              <FormField label="Description" hint="Add a quick summary users can scan." className="sm:col-span-2">
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
              <FormField
                label="Deal Info"
                hint="Describe the offer details, conditions, and redemption notes."
                className="sm:col-span-2"
              >
                <textarea
                  rows={4}
                  value={form.deal_info}
                  onChange={(e) => setForm((p) => ({ ...p, deal_info: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>
              <FormField label="Promo Code (Optional)" hint="Optional code users apply at checkout." example="SAVE20">
                <input
                  value={form.promo_code}
                  onChange={(e) => setForm((p) => ({ ...p, promo_code: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>
              <FormField
                label="Deal Link (Optional)"
                hint="Optional landing page where users redeem this offer."
                example="https://brand.com/deals/summer"
              >
                <input
                  type="url"
                  value={form.deal_link}
                  onChange={(e) => setForm((p) => ({ ...p, deal_link: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>
              <FormField label="Deal image" hint="Upload a high-quality image to improve clicks." className="sm:col-span-2">
                <CloudinaryImageInput
                  value={form.image_url}
                  onChange={(url) => setForm((p) => ({ ...p, image_url: url }))}
                  disabled={submitLoading}
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
