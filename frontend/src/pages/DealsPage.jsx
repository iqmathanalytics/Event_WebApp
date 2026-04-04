import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import DealCard from "../components/DealCard";
import EventFilterBar from "../components/EventFilterBar";
import DealSubmissionModal, { emptyDealSubmitForm } from "../components/DealSubmissionModal";
import { createDeal, fetchDeals } from "../services/listingService";
import useFavorites from "../hooks/useFavorites";
import useCityFilter from "../hooks/useCityFilter";
import useAuth from "../hooks/useAuth";
import { Link } from "react-router-dom";
import { FiBriefcase, FiCheckCircle, FiClock, FiRefreshCw } from "react-icons/fi";
import { BadgePercent, MousePointerClick, Sparkles, Store } from "lucide-react";
import { fetchMyProfile } from "../services/userService";
import { useRouteContentReady } from "../context/RouteContentReadyContext";

function DealerProfileProgressNote({ status }) {
  const s = String(status || "").toLowerCase();
  const shell =
    "mt-3 flex gap-3 rounded-xl border px-3 py-3 sm:items-start sm:gap-3.5 sm:px-4 motion-safe:transition-shadow motion-safe:hover:shadow-md";

  if (!status) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className={`${shell} border-indigo-200/70 bg-gradient-to-br from-indigo-50/90 to-white`}
      >
        <motion.span
          className="mt-0.5 grid h-9 w-9 shrink-0 place-content-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <FiBriefcase className="h-5 w-5" aria-hidden />
        </motion.span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Almost there — add your business profile</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Complete your dealer profile from your dashboard. After approval, you can publish offers straight from this page.
          </p>
          <Link
            to="/dashboard/user"
            className="mt-2 inline-flex text-sm font-semibold text-indigo-600 underline-offset-2 hover:text-indigo-700 hover:underline"
          >
            Go to dashboard
          </Link>
        </div>
      </motion.div>
    );
  }

  if (s === "pending") {
    return (
      <div className={`${shell} border-sky-200/70 bg-gradient-to-br from-sky-50/90 to-white`}>
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-content-center rounded-xl bg-white text-sky-600 shadow-sm ring-1 ring-sky-100">
          <FiClock className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">We&apos;re reviewing your profile</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Hang tight — once your business details are approved, deal posting unlocks here automatically.
          </p>
        </div>
      </div>
    );
  }

  if (s === "rejected") {
    return (
      <div className={`${shell} border-violet-200/70 bg-gradient-to-br from-violet-50/80 to-white`}>
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-content-center rounded-xl bg-white text-violet-600 shadow-sm ring-1 ring-violet-100">
          <FiRefreshCw className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Quick refresh, then you&apos;re back in</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Update your dealer profile from your dashboard and resubmit — we&apos;ll take another look right away.
          </p>
          <Link
            to="/dashboard/user/submissions"
            className="mt-2 inline-flex text-sm font-semibold text-violet-700 underline-offset-2 hover:text-violet-800 hover:underline"
          >
            Submissions &amp; edits
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`${shell} border-slate-200/80 bg-slate-50/90`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">Business profile</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Status: <span className="font-medium capitalize text-slate-800">{s}</span>. Finish any open steps from your dashboard so deal posting can turn on when you&apos;re ready.
        </p>
        <Link
          to="/dashboard/user"
          className="mt-2 inline-flex text-sm font-semibold text-slate-700 underline-offset-2 hover:underline"
        >
          Open dashboard
        </Link>
      </div>
    </div>
  );
}

function DealerApprovedRibbon() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative mt-3 flex gap-3 overflow-hidden rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/95 via-white to-teal-50/50 px-3 py-3 sm:items-start sm:gap-3.5 sm:px-4"
    >
      <div className="pointer-events-none absolute -right-6 top-0 h-24 w-24 rounded-full bg-emerald-400/20 blur-2xl" />
      <motion.span
        className="relative mt-0.5 grid h-10 w-10 shrink-0 place-content-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <FiCheckCircle className="h-6 w-6" aria-hidden />
      </motion.span>
      <div className="relative min-w-0">
        <p className="text-sm font-semibold text-slate-900">Profile approved — you&apos;re live to post</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Your business is verified. Submit a deal anytime; we still give new listings a quick review before they publish.
        </p>
      </div>
    </motion.div>
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
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitForm, setSubmitForm] = useState(() => ({ ...emptyDealSubmitForm }));
  const { isFavorite, toggleFavorite } = useFavorites();
  useRouteContentReady(loading);
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
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-indigo-50/15 to-emerald-50/25 p-4 shadow-soft ring-1 ring-indigo-500/[0.06] sm:p-5">
        <div className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-gradient-to-br from-indigo-400/25 to-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-teal-400/15 blur-3xl" />

        {!isAuthenticated ? (
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
            <div className="min-w-0 flex-1">
              <motion.p
                className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-800/90"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35 }}
              >
                <motion.span
                  className="inline-flex text-indigo-600"
                  animate={{ rotate: [0, -10, 8, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden
                >
                  <Sparkles className="h-4 w-4" />
                </motion.span>
                Partners &amp; promos
              </motion.p>
              <h2 className="mt-2 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                List offers locals actually click
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">
                Create a free account, add your business profile once, then publish deals from this page — we keep quality high.
              </p>
              <ul className="mt-3 flex flex-col gap-1.5 text-xs font-medium text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-1">
                <li className="inline-flex items-center gap-1.5">
                  <motion.span
                    className="text-indigo-600"
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden
                  >
                    <MousePointerClick className="h-4 w-4" />
                  </motion.span>
                  Sign up — then tweak promos anytime
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <BadgePercent className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                  Discounts, flash sales, partner perks
                </li>
                <li className="inline-flex items-center gap-1.5">
                  <Store className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
                  One storefront profile, city-wide reach
                </li>
              </ul>
            </div>
            <div className="relative flex w-full shrink-0 flex-col gap-2 sm:flex-row sm:items-center lg:w-auto lg:flex-col xl:flex-row">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/register"
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-500 hover:to-emerald-500 sm:min-h-0 sm:w-auto"
                >
                  Partner with Yay! — join free
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/login"
                  className="flex min-h-[44px] w-full items-center justify-center rounded-xl border-2 border-slate-200 bg-white/90 px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-300 hover:bg-white sm:min-h-0 sm:w-auto"
                >
                  Have an account? Sign in to list
                </Link>
              </motion.div>
            </div>
          </div>
        ) : (
          <>
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Post a deal or offer</p>
                <p className="text-sm text-slate-600">Your deal will be reviewed by admin before it goes live.</p>
              </div>
              {canPostDeals && dealerStatus === "approved" ? (
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitError("");
                      setSubmitMessage("");
                      setSubmitOpen(true);
                    }}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
                  >
                    Submit Deal
                  </button>
                </motion.div>
              ) : !canPostDeals ? (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    to="/dashboard/user"
                    className="inline-flex rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Open dashboard
                  </Link>
                </motion.div>
              ) : (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    to="/dashboard/user"
                    className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
                  >
                    Complete Dealer Profile
                  </Link>
                </motion.div>
              )}
            </div>
            {isAuthenticated && !canPostDeals ? (
              <div className="relative mt-3 flex gap-3 rounded-xl border border-slate-200/90 bg-slate-50/95 px-3 py-3 sm:px-4">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-content-center rounded-lg bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
                  <FiBriefcase className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Deal posting isn&apos;t enabled for this login yet</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Need access? Contact us — we turn on partner tools for verified businesses.
                  </p>
                </div>
              </div>
            ) : null}
            {isAuthenticated && canPostDeals && dealerStatus === "approved" ? <DealerApprovedRibbon /> : null}
            {isAuthenticated && canPostDeals && dealerStatus !== "approved" ? (
              <DealerProfileProgressNote status={dealerStatus} />
            ) : null}
            {submitMessage ? <p className="mt-2 text-sm font-medium text-emerald-700">{submitMessage}</p> : null}
          </>
        )}
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
                showPremiumBadge
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

      <DealSubmissionModal
        open={submitOpen}
        title="Submit Deal"
        onClose={() => setSubmitOpen(false)}
        submitLoading={submitLoading}
        submitError={submitError}
        cities={cities}
        form={submitForm}
        setForm={setSubmitForm}
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
            setSubmitForm({ ...emptyDealSubmitForm });
            setSubmitMessage("Deal submitted. It will be visible after admin approval.");
          } catch (err) {
            setSubmitError(err?.response?.data?.message || "Could not submit deal.");
          } finally {
            setSubmitLoading(false);
          }
        }}
      />
    </motion.div>
  );
}

export default DealsPage;
