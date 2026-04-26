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
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-indigo-50/15 to-emerald-50/25 p-3 shadow-soft ring-1 ring-indigo-500/[0.06] sm:p-3.5">
        <div className="pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full bg-gradient-to-br from-indigo-400/25 to-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-teal-400/15 blur-3xl" />

        {!isAuthenticated ? (
          <div className="relative flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 truncate text-sm font-medium text-slate-700">
              <span className="mr-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-indigo-800">
                <Sparkles className="h-3.5 w-3.5" /> Partners &amp; promos
              </span>
              List offers locals actually click.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/register"
                className="inline-flex rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:from-indigo-500 hover:to-emerald-500"
              >
                Join free
              </Link>
              <Link
                to="/login"
                className="inline-flex rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition hover:border-indigo-300"
              >
                Sign in
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 truncate text-sm font-medium text-slate-700">
              <span className="mr-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-indigo-800">
                <Sparkles className="h-3.5 w-3.5" /> Deal tools
              </span>
              Post an offer. Every deal is reviewed before going live.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              {canPostDeals && dealerStatus === "approved" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSubmitError("");
                    setSubmitMessage("");
                    setSubmitOpen(true);
                  }}
                  className="inline-flex rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Submit deal
                </button>
              ) : !canPostDeals ? (
                <Link
                  to="/dashboard/user"
                  className="inline-flex rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Open dashboard
                </Link>
              ) : (
                <Link
                  to="/dashboard/user"
                  className="inline-flex rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Complete profile
                </Link>
              )}
            </div>
          </div>
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
                  dealInfo: item.terms_text || item.description || "",
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
              promo_code: submitForm.promo_code?.trim() || undefined,
              deal_link: submitForm.deal_link?.trim() || undefined,
              image_url: submitForm.image_url?.trim() || undefined,
              terms_text: submitForm.deal_info?.trim() || undefined
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
