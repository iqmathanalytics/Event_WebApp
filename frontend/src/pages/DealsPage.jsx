import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DealCard from "../components/DealCard";
import EventFilterBar from "../components/EventFilterBar";
import { createDeal, fetchDeals } from "../services/listingService";
import useFavorites from "../hooks/useFavorites";
import useCityFilter from "../hooks/useCityFilter";
import useAuth from "../hooks/useAuth";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { FiInfo } from "react-icons/fi";
import { categories } from "../utils/filterOptions";
import { fetchMyProfile } from "../services/userService";

const DEAL_OFFER_TYPES = [
  { value: "percentage_off", label: "Percentage Off" },
  { value: "flat_off", label: "Flat Amount Off" },
  { value: "bogo", label: "Buy X Get Y" },
  { value: "bundle_price", label: "Bundle Price" },
  { value: "free_item", label: "Free Item with Purchase" },
  { value: "custom", label: "Custom Offer" }
];

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

function SubmissionModal({ title, onClose, onSubmit, children, submitLoading }) {
  if (typeof document === "undefined") {
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
          <div className="hide-scrollbar flex-1 overflow-y-auto px-5 py-4">{children}</div>
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

function DealsPage() {
  const { selectedCity, setSelectedCity, cities } = useCityFilter();
  const { isAuthenticated, canPostDeals } = useAuth();
  const [dealerStatus, setDealerStatus] = useState(null);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(selectedCity || "");
  const [sortBy, setSortBy] = useState("popularity");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    query: "",
    city: selectedCity || "",
    category: "",
    date: "",
    priceMin: "",
    priceMax: "",
    sortBy: "popularity"
  });
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitForm, setSubmitForm] = useState({
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
  });
  const { isFavorite, toggleFavorite } = useFavorites();
  const canApply =
    query !== appliedFilters.query ||
    city !== appliedFilters.city ||
    category !== appliedFilters.category ||
    date !== appliedFilters.date ||
    priceMin !== appliedFilters.priceMin ||
    priceMax !== appliedFilters.priceMax ||
    sortBy !== appliedFilters.sortBy;

  useEffect(() => {
    if (!submitOpen) {
      return undefined;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [submitOpen]);

  useEffect(() => {
    let active = true;
    async function loadDealerStatus() {
      if (!isAuthenticated) {
        if (active) setDealerStatus(null);
        return;
      }
      try {
        const response = await fetchMyProfile();
        if (active) {
          setDealerStatus(response?.data?.dealer_profile?.status || null);
        }
      } catch (_err) {
        if (active) {
          setDealerStatus(null);
        }
      }
    }
    loadDealerStatus();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const applyFilters = () => {
    setAppliedFilters({
      query,
      city,
      category,
      date,
      priceMin,
      priceMax,
      sortBy
    });
  };

  const setCityWithGlobal = (value) => {
    setCity(value);
    setSelectedCity(value);
  };

  const resetFilters = () => {
    setQuery("");
    setCityWithGlobal("");
    setSortBy("popularity");
    setCategory("");
    setDate("");
    setPriceMin("");
    setPriceMax("");
    setAppliedFilters({
      query: "",
      city: "",
      category: "",
      date: "",
      priceMin: "",
      priceMax: "",
      sortBy: "popularity"
    });
  };

  useEffect(() => {
    setCity(selectedCity || "");
    setAppliedFilters((prev) => ({
      ...prev,
      city: selectedCity || ""
    }));
  }, [selectedCity]);

  useEffect(() => {
    let active = true;

    async function loadDeals() {
      try {
        setLoading(true);
        const response = await fetchDeals({
          q: appliedFilters.query || undefined,
          city: appliedFilters.city || undefined,
          category: appliedFilters.category || undefined,
          date: appliedFilters.date || undefined,
          price_min: appliedFilters.priceMin || undefined,
          price_max: appliedFilters.priceMax || undefined,
          sort: appliedFilters.sortBy
        });

        if (active) {
          setList(response?.data || []);
        }
      } catch (_err) {
        if (active) {
          setList([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDeals();
    return () => {
      active = false;
    };
  }, [appliedFilters]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Deals</h1>
        <p className="text-sm text-slate-600">Browse limited-time local offers from trusted partners across your city.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Post a deal or offer</p>
            <p className="text-sm text-slate-600">Your deal will be reviewed by admin before it goes live.</p>
          </div>
          {!isAuthenticated ? (
            <Link to="/login" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Login to Submit
            </Link>
          ) : canPostDeals && dealerStatus === "approved" ? (
            <button
              type="button"
              onClick={() => {
                setSubmitError("");
                setSubmitMessage("");
                setSubmitOpen(true);
              }}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Submit Deal
            </button>
          ) : (
            <Link to="/dashboard/user" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Complete Dealer Profile
            </Link>
          )}
        </div>
        {isAuthenticated && !canPostDeals ? (
          <p className="mt-2 text-sm text-rose-600">Deal posting capability is disabled for your account.</p>
        ) : null}
        {isAuthenticated && canPostDeals && dealerStatus !== "approved" ? (
          <p className="mt-2 text-sm text-amber-700">
            Dealer profile status: {dealerStatus || "not submitted"}. You can post deals after admin approval.
          </p>
        ) : null}
        {submitMessage ? <p className="mt-2 text-sm font-medium text-emerald-700">{submitMessage}</p> : null}
      </div>
      <EventFilterBar
        query={query}
        setQuery={setQuery}
        city={city}
        setCity={setCityWithGlobal}
        category={category}
        setCategory={setCategory}
        date={date}
        setDate={setDate}
        priceMin={priceMin}
        setPriceMin={setPriceMin}
        priceMax={priceMax}
        setPriceMax={setPriceMax}
        sortBy={sortBy}
        setSortBy={setSortBy}
        showDate={false}
        searchPlaceholder="Search deals"
        mobileTitle="Filter Deals"
        onApply={applyFilters}
        onReset={resetFilters}
        canApply={canApply}
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div key={`deal-skeleton-${idx}`} className="h-[320px] animate-pulse rounded-3xl border border-slate-200 bg-white" />
            ))
          : null}
        {!loading && list.length === 0 ? <p className="text-sm text-slate-500">No deals match your current filters.</p> : null}
        {!loading
          ? list.map((item) => (
              <DealCard
                key={item.id}
                item={{
                  id: item.id,
                  title: item.title,
                  city: item.city_name || "City",
                  tags: item.tags || [],
                  discount: item.original_price
                    ? Math.max(0, Math.round(((item.original_price - item.discounted_price) / item.original_price) * 100))
                    : 0,
                  originalPrice: item.original_price || item.discounted_price || 0,
                  price: item.discounted_price || item.original_price || 0,
                  image: item.image_url,
                  offerType: item.offer_type,
                  offerMetaJson: item.offer_meta_json
                }}
                isFavorite={isFavorite("deal", item.id)}
                tags={item.tags || []}
                isPremium={item.is_premium === 1 || item.is_premium === true}
                showPremiumBadge={isAuthenticated}
                onToggleFavorite={() =>
                  toggleFavorite({
                    listingType: "deal",
                    listingId: item.id
                  })
                }
              />
            ))
          : null}
      </div>

      {submitOpen ? (
        <SubmissionModal
          title="Submit Deal"
          onClose={() => setSubmitOpen(false)}
          submitLoading={submitLoading}
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitError("");
            try {
              setSubmitLoading(true);
              await createDeal({
                ...submitForm,
                city_id: Number(submitForm.city_id),
                category_id: Number(submitForm.category_id),
                discount_percentage:
                  submitForm.offer_type === "percentage_off" && submitForm.offer_value
                    ? Number(submitForm.offer_value)
                    : undefined,
                original_price: submitForm.original_price ? Number(submitForm.original_price) : undefined,
                offer_value: submitForm.offer_value ? Number(submitForm.offer_value) : undefined,
                buy_qty: submitForm.buy_qty ? Number(submitForm.buy_qty) : undefined,
                get_qty: submitForm.get_qty ? Number(submitForm.get_qty) : undefined,
                minimum_spend: submitForm.minimum_spend ? Number(submitForm.minimum_spend) : undefined,
                max_discount_amount: submitForm.max_discount_amount ? Number(submitForm.max_discount_amount) : undefined,
                terms_text: submitForm.terms || undefined
              });
              setSubmitOpen(false);
              setSubmitForm({
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
              });
              setSubmitMessage("Deal submitted. It will be visible after admin approval.");
            } catch (err) {
              setSubmitError(err?.response?.data?.message || "Could not submit deal.");
            } finally {
              setSubmitLoading(false);
            }
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Deal Title" hint="Write a concise title customers can scan quickly." example="Buy 1 Get 2 Burger Combo" className="sm:col-span-2">
              <input required value={submitForm.title} onChange={(e) => setSubmitForm((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Description" hint="Add key details like eligibility, timing, and availability." className="sm:col-span-2">
              <textarea rows={4} value={submitForm.description} onChange={(e) => setSubmitForm((p) => ({ ...p, description: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="City" hint="Choose where this deal is valid.">
              <select
                required
                value={submitForm.city_id}
                onChange={(e) => setSubmitForm((p) => ({ ...p, city_id: e.target.value }))}
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
                value={submitForm.category_id}
                onChange={(e) => setSubmitForm((p) => ({ ...p, category_id: e.target.value }))}
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
              <input required value={submitForm.provider_name} onChange={(e) => setSubmitForm((p) => ({ ...p, provider_name: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Valid Until" hint="Users can claim this offer until this date.">
              <input
                required
                type="date"
                value={submitForm.expiry_date}
                onChange={(e) => setSubmitForm((p) => ({ ...p, expiry_date: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Original Price" hint="Optional reference price before discount." example="49.99">
              <input type="number" min="0" value={submitForm.original_price} onChange={(e) => setSubmitForm((p) => ({ ...p, original_price: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Offer Configuration</p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select
                  value={submitForm.offer_type}
                  onChange={(e) => setSubmitForm((p) => ({ ...p, offer_type: e.target.value }))}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {DEAL_OFFER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {(submitForm.offer_type === "percentage_off" || submitForm.offer_type === "flat_off" || submitForm.offer_type === "bundle_price") ? (
                  <input
                    type="number"
                    min="0"
                    placeholder={submitForm.offer_type === "percentage_off" ? "Offer Value (%)" : "Offer Value ($)"}
                    value={submitForm.offer_value}
                    onChange={(e) => setSubmitForm((p) => ({ ...p, offer_value: e.target.value }))}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                ) : null}
                {submitForm.offer_type === "bogo" ? (
                  <>
                    <input type="number" min="1" placeholder="Buy Quantity" value={submitForm.buy_qty} onChange={(e) => setSubmitForm((p) => ({ ...p, buy_qty: e.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                    <input type="number" min="1" placeholder="Get Quantity" value={submitForm.get_qty} onChange={(e) => setSubmitForm((p) => ({ ...p, get_qty: e.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                  </>
                ) : null}
                {submitForm.offer_type === "free_item" ? (
                  <input type="text" placeholder="Free Item Name" value={submitForm.free_item_name} onChange={(e) => setSubmitForm((p) => ({ ...p, free_item_name: e.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2" />
                ) : null}
                {submitForm.offer_type === "custom" ? (
                  <input type="text" placeholder="Custom Offer Text (e.g. Buy 1 Get 2)" value={submitForm.custom_offer_text} onChange={(e) => setSubmitForm((p) => ({ ...p, custom_offer_text: e.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2" />
                ) : null}
                <input type="number" min="0" placeholder="Minimum Spend (optional)" value={submitForm.minimum_spend} onChange={(e) => setSubmitForm((p) => ({ ...p, minimum_spend: e.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                <input type="number" min="0" placeholder="Maximum Discount Cap (optional)" value={submitForm.max_discount_amount} onChange={(e) => setSubmitForm((p) => ({ ...p, max_discount_amount: e.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
                <textarea rows={2} placeholder="Terms and Conditions (optional)" value={submitForm.terms} onChange={(e) => setSubmitForm((p) => ({ ...p, terms: e.target.value }))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2" />
              </div>
            </div>
            <FormField label="Promo Code" hint="Optional code users apply at checkout." example="SAVE20">
              <input value={submitForm.promo_code} onChange={(e) => setSubmitForm((p) => ({ ...p, promo_code: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Deal Link" hint="Optional landing page where users redeem this offer." example="https://brand.com/deals/summer">
              <input type="url" value={submitForm.deal_link} onChange={(e) => setSubmitForm((p) => ({ ...p, deal_link: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Image URL" hint="Use a high-quality image to improve clicks." example="https://images.example.com/deal.jpg" className="sm:col-span-2">
              <input type="url" value={submitForm.image_url} onChange={(e) => setSubmitForm((p) => ({ ...p, image_url: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" checked={submitForm.is_premium} onChange={(e) => setSubmitForm((p) => ({ ...p, is_premium: e.target.checked }))} />
              Mark as Premium (visible only to logged-in users)
            </label>
          </div>
          {submitError ? <p className="mt-3 text-sm text-rose-600">{submitError}</p> : null}
        </SubmissionModal>
      ) : null}
    </motion.div>
  );
}

export default DealsPage;
