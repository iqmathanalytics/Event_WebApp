import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import InfluencerCard from "../components/InfluencerCard";
import { parseInfluencerSocialLinks } from "../utils/influencerSocial";
import EventFilterBar from "../components/EventFilterBar";
import {
  createInfluencerProfile,
  fetchInfluencers,
  fetchMyInfluencerSubmissions,
  trackInfluencerClick
} from "../services/listingService";
import useFavorites from "../hooks/useFavorites";
import useCityFilter from "../hooks/useCityFilter";
import useAuth from "../hooks/useAuth";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { FiCheckCircle, FiInfo } from "react-icons/fi";
import { MousePointerClick, PenLine, Sparkles } from "lucide-react";
import { categories } from "../utils/filterOptions";
import { useRouteContentReady } from "../context/RouteContentReadyContext";
import CloudinaryImageInput from "../components/CloudinaryImageInput";

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
        key="influencer-submit-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed inset-0 z-[220] bg-slate-950/65 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[221] flex items-center justify-center p-3 sm:p-5">
        <motion.form
          key="influencer-submit-modal"
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

function InfluencersPage() {
  const { selectedCity, setSelectedCity, cities } = useCityFilter();
  const { isAuthenticated, canCreateInfluencerProfile } = useAuth();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(selectedCity || "");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState("popularity");
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
  const [submitForm, setSubmitForm] = useState({
    name: "",
    bio: "",
    city_id: "",
    category_id: "",
    instagram: "",
    instagram_followers_count: "",
    youtube: "",
    contact_email: "",
    profile_image_url: ""
  });
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loadingMySubmissions, setLoadingMySubmissions] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  useRouteContentReady(loading || loadingMySubmissions);
  const canApply =
    query !== appliedFilters.query ||
    city !== appliedFilters.city ||
    category !== appliedFilters.category ||
    date !== appliedFilters.date ||
    priceMin !== appliedFilters.priceMin ||
    priceMax !== appliedFilters.priceMax ||
    sortBy !== appliedFilters.sortBy;
  const hasPendingInfluencer = mySubmissions.some((row) => row.status === "pending");
  const hasAnyInfluencerSubmission = mySubmissions.length > 0;

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
    setCategory("");
    setDate("");
    setPriceMin("");
    setPriceMax("");
    setSortBy("popularity");
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

    async function loadInfluencers() {
      try {
        setLoading(true);
        const response = await fetchInfluencers({
          q: appliedFilters.query || undefined,
          city: appliedFilters.city || undefined,
          category: appliedFilters.category || undefined,
          date: appliedFilters.date || undefined,
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

    loadInfluencers();
    return () => {
      active = false;
    };
  }, [appliedFilters]);

  useEffect(() => {
    let active = true;
    async function loadMySubmissions() {
      if (!isAuthenticated) {
        setMySubmissions([]);
        return;
      }
      try {
        setLoadingMySubmissions(true);
        const response = await fetchMyInfluencerSubmissions();
        if (active) {
          setMySubmissions(response?.data || []);
        }
      } catch (_err) {
        if (active) {
          setMySubmissions([]);
        }
      } finally {
        if (active) {
          setLoadingMySubmissions(false);
        }
      }
    }
    loadMySubmissions();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-5"
    >
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">Influencers</h1>
        <p className="text-sm text-slate-600">Discover local creators and lifestyle experts by city, category, and audience reach.</p>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-fuchsia-50/20 to-indigo-50/30 p-3 shadow-soft ring-1 ring-fuchsia-500/[0.07] sm:p-3.5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-fuchsia-400/30 to-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-indigo-400/20 blur-3xl" />

        {!isAuthenticated ? (
          <div className="relative flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 truncate text-sm font-medium text-slate-700">
              <span className="mr-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-fuchsia-800">
                <Sparkles className="h-3.5 w-3.5" /> Creators wanted
              </span>
              Your spotlight is one signup away.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                to="/register"
                className="inline-flex rounded-lg bg-gradient-to-r from-fuchsia-600 to-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:from-fuchsia-500 hover:to-violet-500"
              >
                Join free
              </Link>
              <Link
                to="/login"
                className="inline-flex rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition hover:border-fuchsia-300"
              >
                Sign in
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 truncate text-sm font-medium text-slate-700">
              <span className="mr-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-fuchsia-800">
                <Sparkles className="h-3.5 w-3.5" /> Creator profile
              </span>
              Submit your spotlight profile for review.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={!canCreateInfluencerProfile || hasAnyInfluencerSubmission || loadingMySubmissions}
                onClick={() => {
                  setSubmitError("");
                  setSubmitMessage("");
                  setSubmitOpen(true);
                }}
                className="inline-flex rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Submit profile
              </button>
              {hasAnyInfluencerSubmission ? (
                <Link
                  to="/dashboard/user/submissions"
                  className="inline-flex rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  Open submissions
                </Link>
              ) : null}
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
        showPrice={false}
        searchPlaceholder="Search influencers"
        mobileTitle="Filter Influencers"
        onApply={applyFilters}
        onReset={resetFilters}
        canApply={canApply}
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={`influencer-skeleton-${idx}`}
                className="h-[320px] animate-pulse rounded-3xl border border-slate-200 bg-white"
              />
            ))
          : null}
        {!loading && list.length === 0 ? <p className="text-sm text-slate-500">No influencers match your current filters.</p> : null}
        {!loading
          ? list.map((item) => (
              <InfluencerCard
                key={item.id}
                item={{
                  id: item.id,
                  name: item.name,
                  category: item.category_name || "Lifestyle",
                  city: item.city_name || "City",
                  followers: item.followers_count || 0,
                  youtubeSubscribers: item.youtube_subscribers_count || 0,
                  youtubeUrl: parseInfluencerSocialLinks(item.social_links).youtube,
                  tags: item.tags || [],
                  image: item.profile_image_url
                }}
                isFavorite={isFavorite("influencer", item.id)}
                onViewDetails={(id) => trackInfluencerClick(id).catch(() => {})}
                onToggleFavorite={() =>
                  toggleFavorite({
                    listingType: "influencer",
                    listingId: item.id
                  })
                }
              />
            ))
          : null}
      </div>

      {submitOpen ? (
        <SubmissionModal
          title="Submit Influencer Profile"
          onClose={() => setSubmitOpen(false)}
          submitLoading={submitLoading}
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitError("");
            try {
              setSubmitLoading(true);
              await createInfluencerProfile({
                ...submitForm,
                city_id: Number(submitForm.city_id),
                category_id: Number(submitForm.category_id)
              });
              setSubmitOpen(false);
              setSubmitForm({
                name: "",
                bio: "",
                city_id: "",
                category_id: "",
                instagram: "",
                instagram_followers_count: "",
                youtube: "",
                contact_email: "",
                profile_image_url: ""
              });
              setSubmitMessage("Profile submitted. It will be visible after admin approval.");
              const refreshed = await fetchMyInfluencerSubmissions();
              setMySubmissions(refreshed?.data || []);
            } catch (err) {
              setSubmitError(err?.response?.data?.message || "Could not submit influencer profile.");
            } finally {
              setSubmitLoading(false);
            }
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Profile Name" hint="Enter your public creator or brand name." example="Ava Luxe" className="sm:col-span-2">
              <input required value={submitForm.name} onChange={(e) => setSubmitForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Bio" hint="Write a short summary of your niche and audience." example="Fashion and lifestyle creator in New York." className="sm:col-span-2">
              <textarea
                required
                minLength={10}
                value={submitForm.bio}
                onChange={(e) => setSubmitForm((p) => ({ ...p, bio: e.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="City" hint="Choose your primary operating city.">
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
            <FormField label="Category" hint="Select the content category that fits your profile.">
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
            <FormField label="Instagram URL" hint="Paste your Instagram profile link." example="https://instagram.com/yourhandle">
              <input type="url" value={submitForm.instagram} onChange={(e) => setSubmitForm((p) => ({ ...p, instagram: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Instagram Followers Count" hint="Enter your Instagram follower count (numbers only)." example="12500">
              <input
                type="number"
                min="0"
                required
                value={submitForm.instagram_followers_count}
                onChange={(e) => setSubmitForm((p) => ({ ...p, instagram_followers_count: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="YouTube URL" hint="Paste your channel or profile link." example="https://youtube.com/@yourchannel">
              <input type="url" value={submitForm.youtube} onChange={(e) => setSubmitForm((p) => ({ ...p, youtube: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Contact Email" hint="Use an email where brands can contact you." example="creator@example.com">
              <input required type="email" value={submitForm.contact_email} onChange={(e) => setSubmitForm((p) => ({ ...p, contact_email: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Profile image" hint="Upload a high-quality profile photo.">
              <CloudinaryImageInput
                value={submitForm.profile_image_url}
                onChange={(url) => setSubmitForm((p) => ({ ...p, profile_image_url: url }))}
                disabled={submitLoading}
              />
            </FormField>
          </div>
          {submitError ? <p className="mt-3 text-sm text-rose-600">{submitError}</p> : null}
        </SubmissionModal>
      ) : null}
    </motion.div>
  );
}

export default InfluencersPage;
