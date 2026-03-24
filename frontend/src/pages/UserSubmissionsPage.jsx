import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { FiInfo } from "react-icons/fi";
import useCityFilter from "../hooks/useCityFilter";
import { categories } from "../utils/filterOptions";
import {
  fetchMyDealSubmissions,
  fetchMyInfluencerSubmissions,
  updateDealSubmission,
  updateInfluencerProfile
} from "../services/listingService";
import { formatDateUS } from "../utils/format";

function parseDealOfferMeta(description) {
  const text = String(description || "");
  const marker = "[OFFER_META]";
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) {
    return {};
  }
  const metaRaw = text.slice(markerIndex + marker.length).trim().split("\n")[0];
  try {
    return JSON.parse(metaRaw);
  } catch (_err) {
    return {};
  }
}

function stripDealOfferMeta(description) {
  const text = String(description || "");
  const markerIndex = text.indexOf("[OFFER_META]");
  if (markerIndex === -1) {
    return text;
  }
  return text.slice(0, markerIndex).trim();
}

function formatReadableDate(value) {
  if (!value) {
    return "Date not available";
  }
  return formatDateUS(value);
}

function StatusBadge({ status }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        status === "approved"
          ? "bg-emerald-100 text-emerald-700"
          : status === "rejected"
            ? "bg-rose-100 text-rose-700"
            : "bg-amber-100 text-amber-700"
      }`}
    >
      {String(status || "pending").toUpperCase()}
    </span>
  );
}

function ModalShell({ title, children, onClose, footer, onSubmit }) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <motion.div
        key="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="fixed inset-0 z-[220] bg-slate-950/65 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[221] flex items-center justify-center p-3 sm:p-5">
        <motion.form
          key="modal-content"
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="popup-modal flex h-[min(90vh,820px)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
          <div className="hide-scrollbar flex-1 overflow-y-auto px-5 py-4">{children}</div>
          <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white px-5 py-4">{footer}</div>
        </motion.form>
      </div>
    </>,
    document.body
  );
}

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

function UserSubmissionsPage() {
  const { cities } = useCityFilter();
  const [myInfluencerSubmissions, setMyInfluencerSubmissions] = useState([]);
  const [myDealSubmissions, setMyDealSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [submissionsError, setSubmissionsError] = useState("");
  const [submissionActionLoading, setSubmissionActionLoading] = useState(false);
  const [submissionActionError, setSubmissionActionError] = useState("");

  const [editInfluencerItem, setEditInfluencerItem] = useState(null);
  const [editInfluencerForm, setEditInfluencerForm] = useState({});
  const [editDealItem, setEditDealItem] = useState(null);
  const [editDealForm, setEditDealForm] = useState({});

  const hasModalOpen = useMemo(() => Boolean(editInfluencerItem || editDealItem), [editInfluencerItem, editDealItem]);

  useEffect(() => {
    if (!hasModalOpen) {
      return undefined;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [hasModalOpen]);

  const loadSubmissions = async () => {
    const [influencerResult, dealResult] = await Promise.allSettled([
      fetchMyInfluencerSubmissions(),
      fetchMyDealSubmissions()
    ]);

    const influencerRows = influencerResult.status === "fulfilled" ? influencerResult.value?.data || [] : [];
    const dealRows = dealResult.status === "fulfilled" ? dealResult.value?.data || [] : [];
    setMyInfluencerSubmissions(influencerRows);
    setMyDealSubmissions(dealRows);

    if (influencerResult.status === "rejected" && dealResult.status === "rejected") {
      setSubmissionsError("Could not load your submissions right now.");
    } else {
      setSubmissionsError("");
    }
  };

  useEffect(() => {
    let active = true;
    async function run() {
      try {
        setLoadingSubmissions(true);
        if (!active) {
          return;
        }
        await loadSubmissions();
      } finally {
        if (active) {
          setLoadingSubmissions(false);
        }
      }
    }
    run();
    return () => {
      active = false;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Content Submissions</h1>
          <p className="text-sm text-slate-600">Track and update your influencer profiles and deal submissions.</p>
        </div>
        <Link
          to="/dashboard/user"
          className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Back to Dashboard
        </Link>
      </div>

      {loadingSubmissions ? <p className="text-sm text-slate-500">Loading your submissions...</p> : null}
      {submissionsError ? <p className="text-sm text-rose-600">{submissionsError}</p> : null}
      {submissionActionError ? <p className="text-sm text-rose-600">{submissionActionError}</p> : null}

      {!loadingSubmissions && !submissionsError && myInfluencerSubmissions.length === 0 && myDealSubmissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">You have not submitted influencer profiles or deals yet.</p>
        </div>
      ) : null}

      {!loadingSubmissions && myInfluencerSubmissions.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Influencer Profiles</h2>
          <div className="mt-3 space-y-2">
            {myInfluencerSubmissions.map((item) => (
              <div key={`influencer-submission-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.city_name || "City"} • {item.category_name || "Category"} • Submitted {formatReadableDate(item.created_at)}
                  </p>
                  {item.status === "rejected" && item.review_note ? (
                    <p className="mt-1 text-xs text-rose-600">Reason: {item.review_note}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.status} />
                  {["approved", "rejected"].includes(String(item.status || "").toLowerCase()) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSubmissionActionError("");
                        setEditInfluencerItem(item);
                        setEditInfluencerForm({
                          name: item.name || "",
                          bio: item.bio || "",
                          city_id: item.city_id ? String(item.city_id) : "",
                          category_id: item.category_id ? String(item.category_id) : "",
                          contact_email: item.contact_email || "",
                          profile_image_url: item.profile_image_url || ""
                        });
                      }}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                  ) : (
                    <p className="text-xs font-medium text-amber-700">Editing is available after review.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!loadingSubmissions && myDealSubmissions.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Deals</h2>
          <div className="mt-3 space-y-2">
            {myDealSubmissions.map((item) => (
              <div key={`deal-submission-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.city_name || "City"} • {item.category_name || "Category"} • Submitted {formatReadableDate(item.created_at)}
                  </p>
                  {item.expiry_date ? (
                    <p className="text-xs text-slate-500">Valid until {formatReadableDate(item.expiry_date)}</p>
                  ) : null}
                  {item.status === "rejected" && item.review_note ? (
                    <p className="mt-1 text-xs text-rose-600">Reason: {item.review_note}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.status} />
                  {["approved", "rejected"].includes(String(item.status || "").toLowerCase()) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSubmissionActionError("");
                        setEditDealItem(item);
                        const offerMeta = item.offer_meta_json
                          ? (() => {
                              try {
                                return JSON.parse(item.offer_meta_json);
                              } catch (_err) {
                                return parseDealOfferMeta(item.description);
                              }
                            })()
                          : parseDealOfferMeta(item.description);
                        setEditDealForm({
                          title: item.title || "",
                          description: stripDealOfferMeta(item.description || ""),
                          city_id: item.city_id ? String(item.city_id) : "",
                          category_id: item.category_id ? String(item.category_id) : "",
                          provider_name: item.provider_name || "",
                          original_price: item.original_price ?? "",
                          expiry_date: item.expiry_date ? String(item.expiry_date).slice(0, 10) : "",
                          promo_code: item.promo_code || "",
                          deal_link: item.deal_link || "",
                          image_url: item.image_url || "",
                          is_premium: item.is_premium === 1 || item.is_premium === true,
                          offer_type: item.offer_type || offerMeta.offer_type || "percentage_off",
                          offer_value: offerMeta.offer_value || "",
                          buy_qty: offerMeta.buy_qty || "",
                          get_qty: offerMeta.get_qty || "",
                          minimum_spend: offerMeta.minimum_spend || "",
                          max_discount_amount: offerMeta.max_discount_amount || "",
                          free_item_name: offerMeta.free_item_name || "",
                          custom_offer_text: offerMeta.custom_offer_text || "",
                          terms: item.terms_text || offerMeta.terms || ""
                        });
                      }}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                  ) : (
                    <p className="text-xs font-medium text-amber-700">Editing is available after review.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {editInfluencerItem ? (
        <ModalShell
          title="Edit Influencer Submission"
          onClose={() => setEditInfluencerItem(null)}
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              setSubmissionActionError("");
              setSubmissionActionLoading(true);
              await updateInfluencerProfile(editInfluencerItem.id, {
                ...editInfluencerForm,
                city_id: Number(editInfluencerForm.city_id),
                category_id: Number(editInfluencerForm.category_id)
              });
              setEditInfluencerItem(null);
              await loadSubmissions();
            } catch (err) {
              setSubmissionActionError(err?.response?.data?.message || "Could not update influencer submission.");
            } finally {
              setSubmissionActionLoading(false);
            }
          }}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditInfluencerItem(null)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submissionActionLoading}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submissionActionLoading ? "Saving..." : "Save & Resubmit"}
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Profile Name" hint="Enter your public creator or brand name." example="Ava Luxe" className="sm:col-span-2">
              <input required value={editInfluencerForm.name || ""} onChange={(e) => setEditInfluencerForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Bio" hint="Describe your audience, niche, and content style." example="Lifestyle creator covering food and travel." className="sm:col-span-2">
              <textarea required rows={4} value={editInfluencerForm.bio || ""} onChange={(e) => setEditInfluencerForm((p) => ({ ...p, bio: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="City" hint="Choose your primary content city.">
              <select
                required
                value={editInfluencerForm.city_id || ""}
                onChange={(e) => setEditInfluencerForm((p) => ({ ...p, city_id: e.target.value }))}
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
            <FormField label="Category" hint="Pick the category that best fits your profile.">
              <select
                required
                value={editInfluencerForm.category_id || ""}
                onChange={(e) => setEditInfluencerForm((p) => ({ ...p, category_id: e.target.value }))}
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
            <FormField label="Contact Email" hint="Email for brand and campaign communication." example="creator@example.com">
              <input required type="email" value={editInfluencerForm.contact_email || ""} onChange={(e) => setEditInfluencerForm((p) => ({ ...p, contact_email: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Profile Image URL" hint="Optional profile image link." example="https://images.example.com/profile.jpg">
              <input type="url" value={editInfluencerForm.profile_image_url || ""} onChange={(e) => setEditInfluencerForm((p) => ({ ...p, profile_image_url: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
          </div>
        </ModalShell>
      ) : null}

      {editDealItem ? (
        <ModalShell
          title="Edit Deal Submission"
          onClose={() => setEditDealItem(null)}
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              setSubmissionActionError("");
              setSubmissionActionLoading(true);
              await updateDealSubmission(editDealItem.id, {
                ...editDealForm,
                terms_text: editDealForm.terms || undefined,
                city_id: Number(editDealForm.city_id),
                category_id: Number(editDealForm.category_id),
                discount_percentage:
                  editDealForm.offer_type === "percentage_off" && editDealForm.offer_value
                    ? Number(editDealForm.offer_value)
                    : undefined,
                original_price: editDealForm.original_price ? Number(editDealForm.original_price) : undefined,
                offer_value: editDealForm.offer_value ? Number(editDealForm.offer_value) : undefined,
                buy_qty: editDealForm.buy_qty ? Number(editDealForm.buy_qty) : undefined,
                get_qty: editDealForm.get_qty ? Number(editDealForm.get_qty) : undefined,
                minimum_spend: editDealForm.minimum_spend ? Number(editDealForm.minimum_spend) : undefined,
                max_discount_amount: editDealForm.max_discount_amount ? Number(editDealForm.max_discount_amount) : undefined
              });
              setEditDealItem(null);
              await loadSubmissions();
            } catch (err) {
              setSubmissionActionError(err?.response?.data?.message || "Could not update deal submission.");
            } finally {
              setSubmissionActionLoading(false);
            }
          }}
          footer={
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditDealItem(null)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submissionActionLoading}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {submissionActionLoading ? "Saving..." : "Save & Resubmit"}
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Deal Title" hint="Write a concise title customers can quickly scan." example="Buy 1 Get 2 Burger Combo" className="sm:col-span-2">
              <input required value={editDealForm.title || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Description" hint="Explain eligibility, exclusions, and redemption details." className="sm:col-span-2">
              <textarea rows={4} value={editDealForm.description || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, description: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="City" hint="Choose where this deal can be redeemed.">
              <select
                required
                value={editDealForm.city_id || ""}
                onChange={(e) => setEditDealForm((p) => ({ ...p, city_id: e.target.value }))}
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
            <FormField label="Category" hint="Pick the best matching deal category.">
              <select
                required
                value={editDealForm.category_id || ""}
                onChange={(e) => setEditDealForm((p) => ({ ...p, category_id: e.target.value }))}
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
            <FormField label="Brand / Store Name" hint="Business offering this deal." example="Burger District">
              <input required value={editDealForm.provider_name || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, provider_name: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Valid Until" hint="Last date users can claim the deal.">
              <input
                required
                type="date"
                value={editDealForm.expiry_date || ""}
                onChange={(e) => setEditDealForm((p) => ({ ...p, expiry_date: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Original Price" hint="Optional base price before offer." example="49.99">
              <input type="number" min="0" value={editDealForm.original_price || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, original_price: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Offer Configuration</p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select
                  value={editDealForm.offer_type || "percentage_off"}
                  onChange={(e) => setEditDealForm((p) => ({ ...p, offer_type: e.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="percentage_off">Percentage Off</option>
                  <option value="flat_off">Flat Amount Off</option>
                  <option value="bogo">Buy X Get Y</option>
                  <option value="bundle_price">Bundle Price</option>
                  <option value="free_item">Free Item with Purchase</option>
                  <option value="custom">Custom Offer</option>
                </select>
                {(editDealForm.offer_type === "percentage_off" || editDealForm.offer_type === "flat_off" || editDealForm.offer_type === "bundle_price") ? (
                  <input type="number" min="0" placeholder={editDealForm.offer_type === "percentage_off" ? "Offer Value (%)" : "Offer Value ($)"} value={editDealForm.offer_value || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, offer_value: e.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                ) : null}
                {editDealForm.offer_type === "bogo" ? (
                  <>
                    <input type="number" min="1" placeholder="Buy Quantity" value={editDealForm.buy_qty || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, buy_qty: e.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                    <input type="number" min="1" placeholder="Get Quantity" value={editDealForm.get_qty || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, get_qty: e.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                  </>
                ) : null}
                {editDealForm.offer_type === "free_item" ? (
                  <input type="text" placeholder="Free Item Name" value={editDealForm.free_item_name || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, free_item_name: e.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2" />
                ) : null}
                {editDealForm.offer_type === "custom" ? (
                  <input type="text" placeholder="Custom Offer Text (e.g. Buy 1 Get 2)" value={editDealForm.custom_offer_text || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, custom_offer_text: e.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2" />
                ) : null}
                <input type="number" min="0" placeholder="Minimum Spend (optional)" value={editDealForm.minimum_spend || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, minimum_spend: e.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                <input type="number" min="0" placeholder="Maximum Discount Cap (optional)" value={editDealForm.max_discount_amount || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, max_discount_amount: e.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                <textarea rows={2} placeholder="Terms and Conditions (optional)" value={editDealForm.terms || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, terms: e.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2" />
              </div>
            </div>
            <FormField label="Promo Code" hint="Optional code users enter at checkout." example="SAVE20">
              <input value={editDealForm.promo_code || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, promo_code: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Deal Link" hint="Optional redemption or landing page URL." example="https://brand.com/deals/summer">
              <input type="url" value={editDealForm.deal_link || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, deal_link: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Image URL" hint="Optional visual for better click-through." example="https://images.example.com/deal.jpg" className="sm:col-span-2">
              <input type="url" value={editDealForm.image_url || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, image_url: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
          </div>
        </ModalShell>
      ) : null}
    </motion.div>
  );
}

export default UserSubmissionsPage;
