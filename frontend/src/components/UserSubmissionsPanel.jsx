import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { ArrowLeft, Sparkles, Tag, Ticket, Users } from "lucide-react";
import { FiCalendar, FiClock, FiInfo, FiMapPin, FiUser } from "react-icons/fi";
import useCityFilter from "../hooks/useCityFilter";
import { categories } from "../utils/filterOptions";
import {
  fetchMyDealSubmissions,
  fetchMyInfluencerSubmissions,
  updateDealSubmission,
  updateInfluencerProfile
} from "../services/listingService";
import { formatDateUS } from "../utils/format";
import { useRouteContentReady } from "../context/RouteContentReadyContext";
import FilterPopupField from "./FilterPopupField";
import AirbnbDatePickerPanel from "./AirbnbDatePickerPanel";
import CloudinaryImageInput from "./CloudinaryImageInput";

function formatReadableDate(value) {
  if (!value) {
    return "Date not available";
  }
  return formatDateUS(value);
}

function StatusBadge({ status, desktopPop = false }) {
  const base =
    status === "approved"
      ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80"
      : status === "rejected"
        ? "bg-rose-100 text-rose-800 ring-1 ring-rose-200/80"
        : "bg-amber-100 text-amber-800 ring-1 ring-amber-200/80";
  return (
    <span
      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide sm:text-xs ${base} ${
        desktopPop ? "lg:px-3.5 lg:py-1.5 lg:text-[11px] lg:tracking-wider lg:shadow-sm" : ""
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

/**
 * @param {"standalone" | "embedded"} variant — embedded: no page chrome; used inside User dashboard hub.
 */
export default function UserSubmissionsPanel({ variant = "standalone", showBackToHub = true }) {
  const embedded = variant === "embedded";
  const { cities } = useCityFilter();
  const navigate = useNavigate();
  const [myInfluencerSubmissions, setMyInfluencerSubmissions] = useState([]);
  const [myDealSubmissions, setMyDealSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [submissionsError, setSubmissionsError] = useState("");
  const [activeSubmissionsTab, setActiveSubmissionsTab] = useState("influencers");
  const [submissionActionLoading, setSubmissionActionLoading] = useState(false);
  const [submissionActionError, setSubmissionActionError] = useState("");

  const [editInfluencerItem, setEditInfluencerItem] = useState(null);
  const [editInfluencerForm, setEditInfluencerForm] = useState({});
  const [editDealItem, setEditDealItem] = useState(null);
  const [editDealForm, setEditDealForm] = useState({});
  const [editDealExpiryPickerOpen, setEditDealExpiryPickerOpen] = useState(false);

  const hasModalOpen = useMemo(() => Boolean(editInfluencerItem || editDealItem), [editInfluencerItem, editDealItem]);

  const bothSections =
    !loadingSubmissions && myInfluencerSubmissions.length > 0 && myDealSubmissions.length > 0;

  const pendingCount = useMemo(() => {
    const inf = myInfluencerSubmissions.filter((s) => String(s.status || "").toLowerCase() === "pending").length;
    const deals = myDealSubmissions.filter((s) => String(s.status || "").toLowerCase() === "pending").length;
    return inf + deals;
  }, [myInfluencerSubmissions, myDealSubmissions]);

  useRouteContentReady(embedded ? false : loadingSubmissions);

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

  useEffect(() => {
    if (!editDealItem) {
      setEditDealExpiryPickerOpen(false);
    }
  }, [editDealItem]);

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

  useEffect(() => {
    if (loadingSubmissions) return;
    const influencerCount = myInfluencerSubmissions.length;
    const dealCount = myDealSubmissions.length;
    if (influencerCount === 0 && dealCount > 0) setActiveSubmissionsTab("deals");
    if (dealCount === 0 && influencerCount > 0) setActiveSubmissionsTab("influencers");
  }, [loadingSubmissions, myInfluencerSubmissions.length, myDealSubmissions.length]);

  const header = embedded ? (
    <div className="space-y-1">
      <h2 className="text-lg font-bold text-slate-900">Offers &amp; creator spotlights</h2>
      <p className="text-sm text-slate-600">
        Promotions and creator profiles you&apos;ve shared—track status and polish details anytime.
      </p>
    </div>
  ) : (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 lg:items-end lg:gap-8">
        <div className="min-w-0 lg:max-w-3xl">
          <p className="hidden text-[11px] font-bold uppercase tracking-[0.22em] text-brand-600 lg:block">Submission center</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl lg:tracking-tight">
            Offers &amp; creator spotlights
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-600 lg:mt-2 lg:text-base lg:leading-relaxed">
            Promotions and creator profiles you&apos;ve shared—track status and polish details anytime.
          </p>
        </div>
        {showBackToHub ? (
          <Link
            to="/dashboard/user"
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 lg:rounded-2xl lg:px-5 lg:py-2.5 lg:shadow-md lg:shadow-slate-900/5"
          >
            <ArrowLeft className="hidden h-4 w-4 lg:inline" aria-hidden />
            Back to My Hub
          </Link>
        ) : null}
      </div>

      {!loadingSubmissions && !submissionsError && (myInfluencerSubmissions.length > 0 || myDealSubmissions.length > 0) ? (
        <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-lg shadow-slate-900/20 ring-1 ring-white/10">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-500/30 blur-2xl" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">In review</p>
            <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{pendingCount}</p>
            <p className="mt-1 text-sm text-white/70">Awaiting admin decision</p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.12)] ring-1 ring-slate-100">
            <div className="flex items-center gap-2 text-slate-500">
              <Users className="h-4 w-4 text-fuchsia-600" />
              <span className="text-[11px] font-bold uppercase tracking-wide">Creator spotlights</span>
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{myInfluencerSubmissions.length}</p>
            <p className="mt-1 text-sm text-slate-500">Profile submissions</p>
          </div>
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.12)] ring-1 ring-slate-100">
            <div className="flex items-center gap-2 text-slate-500">
              <Ticket className="h-4 w-4 text-brand-600" />
              <span className="text-[11px] font-bold uppercase tracking-wide">Offers</span>
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{myDealSubmissions.length}</p>
            <p className="mt-1 text-sm text-slate-500">Deal submissions</p>
          </div>
        </div>
      ) : null}
    </div>
  );

  const body = (
    <div className={embedded ? "space-y-4" : "space-y-4 lg:space-y-8"}>
      {header}

      {loadingSubmissions ? <p className="text-sm text-slate-500">Loading your submissions...</p> : null}
      {submissionsError ? <p className="text-sm text-rose-600">{submissionsError}</p> : null}
      {submissionActionError ? <p className="text-sm text-rose-600">{submissionActionError}</p> : null}

      {!loadingSubmissions && !submissionsError && myInfluencerSubmissions.length === 0 && myDealSubmissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center lg:rounded-3xl lg:border-slate-200 lg:bg-gradient-to-br lg:from-slate-50 lg:to-white lg:p-12 lg:shadow-inner">
          <div className="mx-auto hidden max-w-md lg:block">
            <div className="mx-auto mb-4 grid h-14 w-14 place-content-center rounded-2xl bg-slate-900 text-white shadow-lg">
              <Sparkles className="h-7 w-7" />
            </div>
          </div>
          <p className="text-sm leading-relaxed text-slate-600 lg:text-base">
            Nothing here yet. Use <span className="font-semibold text-slate-800">Feature a deal</span> or your profile&apos;s creator
            section to share an offer or your creator page.
          </p>
        </div>
      ) : null}

      {!loadingSubmissions && (myInfluencerSubmissions.length > 0 || myDealSubmissions.length > 0) ? (
        <div className="lg:hidden">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2">
            <button
              type="button"
              onClick={() => setActiveSubmissionsTab("influencers")}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                activeSubmissionsTab === "influencers"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Creator profiles
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
                {myInfluencerSubmissions.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubmissionsTab("deals")}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                activeSubmissionsTab === "deals"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Offers
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
                {myDealSubmissions.length}
              </span>
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={
          embedded
            ? "contents"
            : bothSections
              ? "lg:grid lg:min-w-0 lg:grid-cols-2 lg:items-start lg:gap-8"
              : "flex flex-col gap-4 lg:gap-8"
        }
      >
      {!loadingSubmissions && myInfluencerSubmissions.length > 0 ? (
        <section
          className={`rounded-2xl border border-slate-200 bg-white p-4 ${activeSubmissionsTab === "influencers" ? "" : "hidden lg:block"} ${
            embedded
              ? ""
              : "lg:min-w-0 lg:overflow-hidden lg:rounded-3xl lg:border-slate-200/80 lg:bg-gradient-to-b lg:from-white lg:to-slate-50/50 lg:p-6 lg:shadow-[0_24px_60px_-28px_rgba(15,23,42,0.14)] lg:ring-1 lg:ring-slate-100"
          }`}
        >
          <h2
            className={`flex items-center gap-2 text-sm font-semibold text-slate-900 ${
              embedded ? "" : "lg:text-base lg:font-bold"
            }`}
          >
            <Users className={`h-4 w-4 text-fuchsia-600 ${embedded ? "hidden" : "hidden lg:inline"}`} aria-hidden />
            Creator profiles
          </h2>
          <p className={`mt-0.5 text-xs text-slate-500 ${embedded ? "hidden" : "hidden lg:block"}`}>
            Open your public page or refine after review.
          </p>
          <div className="mt-3 space-y-2 lg:mt-5 lg:space-y-3">
            {myInfluencerSubmissions.map((item) => (
              <div
                key={`influencer-submission-${item.id}`}
                className={`relative flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3.5 shadow-sm sm:flex-row sm:items-start sm:justify-between ${
                  embedded
                    ? ""
                    : "lg:group lg:border-slate-200/90 lg:bg-white/80 lg:p-4 lg:shadow-sm lg:transition-all lg:hover:border-fuchsia-200/80 lg:hover:shadow-md"
                }`}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/influencers/${item.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") navigate(`/influencers/${item.id}`);
                }}
              >
                <div className="flex w-full min-w-0 items-start gap-3.5 lg:items-center lg:gap-4">
                  {item.profile_image_url ? (
                    <img
                      src={item.profile_image_url}
                      alt={item.name}
                      className={`h-14 w-14 flex-shrink-0 rounded-2xl object-cover ring-1 ring-slate-200 ${
                        embedded ? "" : "lg:h-[72px] lg:w-[72px] lg:rounded-2xl lg:ring-2 lg:ring-slate-100"
                      }`}
                      loading="lazy"
                      data-route-splash-ignore
                    />
                  ) : (
                    <div
                      className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-500 ring-1 ring-slate-200 ${
                        embedded ? "" : "lg:h-[72px] lg:w-[72px] lg:rounded-2xl lg:ring-2 lg:ring-slate-100"
                      }`}
                    >
                      <FiUser className={`h-5 w-5 ${embedded ? "" : "lg:h-7 lg:w-7"}`} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`line-clamp-1 break-words text-sm font-semibold text-slate-900 ${
                        embedded ? "" : "lg:text-lg lg:font-bold lg:tracking-tight lg:text-slate-900"
                      }`}
                    >
                      {item.name}
                    </p>
                    <div className={`mt-2 flex flex-col gap-2 ${!embedded ? "lg:hidden" : ""}`}>
                      <span className="block w-full truncate whitespace-nowrap rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700">
                        {item.city_name || "City"} • {item.category_name || "Category"}
                      </span>
                      <span className="block w-full truncate whitespace-nowrap rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700">
                        Submitted {formatReadableDate(item.created_at)}
                      </span>
                    </div>
                    {!embedded ? (
                      <div className="mt-3 hidden flex-col gap-2.5 lg:flex">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200/90 bg-slate-50/90 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm">
                            <FiMapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                            <span className="truncate">{item.city_name || "City not set"}</span>
                          </span>
                          <span className="inline-flex max-w-full items-center rounded-lg border border-fuchsia-200/70 bg-gradient-to-r from-fuchsia-50 to-white px-2.5 py-1 text-[11px] font-semibold text-fuchsia-900 shadow-sm">
                            {item.category_name || "Uncategorized"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[12px] text-slate-500">
                          <FiCalendar className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                          <span>
                            Submitted{" "}
                            <time className="font-semibold text-slate-700">{formatReadableDate(item.created_at)}</time>
                          </span>
                        </div>
                      </div>
                    ) : null}
                    {item.status === "rejected" && item.review_note ? (
                      <p
                        className={`mt-2 break-words rounded-xl bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 ${
                          embedded ? "" : "lg:mt-3 lg:border lg:border-rose-100 lg:bg-rose-50/90 lg:px-3 lg:py-2 lg:text-xs lg:leading-relaxed"
                        }`}
                      >
                        <span className={embedded ? "" : "lg:font-bold"}>Feedback</span>
                        {embedded ? ": " : " · "}
                        {item.review_note}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end lg:gap-3">
                  <StatusBadge status={item.status} desktopPop={!embedded} />
                  {["approved", "rejected"].includes(String(item.status || "").toLowerCase()) ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
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
                      className={`rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 ${
                        embedded ? "" : "lg:px-4 lg:py-1.5 lg:shadow-sm"
                      }`}
                    >
                      Edit
                    </button>
                  ) : (
                    <p className="text-xs font-semibold text-amber-700">Pending review</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!loadingSubmissions && myDealSubmissions.length > 0 ? (
        <section
          className={`rounded-2xl border border-slate-200 bg-white p-4 ${activeSubmissionsTab === "deals" ? "" : "hidden lg:block"} ${
            embedded
              ? ""
              : "lg:min-w-0 lg:overflow-hidden lg:rounded-3xl lg:border-slate-200/80 lg:bg-gradient-to-b lg:from-white lg:to-slate-50/50 lg:p-6 lg:shadow-[0_24px_60px_-28px_rgba(15,23,42,0.14)] lg:ring-1 lg:ring-slate-100"
          }`}
        >
          <h2
            className={`flex items-center gap-2 text-sm font-semibold text-slate-900 ${
              embedded ? "" : "lg:text-base lg:font-bold"
            }`}
          >
            <Tag className={`h-4 w-4 text-brand-600 ${embedded ? "hidden" : "hidden lg:inline"}`} aria-hidden />
            Offers
          </h2>
          <p className={`mt-0.5 text-xs text-slate-500 ${embedded ? "hidden" : "hidden lg:block"}`}>
            Track listings and update after approval.
          </p>
          <div className="mt-3 space-y-2 lg:mt-5 lg:space-y-3">
            {myDealSubmissions.map((item) => {
              const dealStatus = String(item.status || "").toLowerCase();
              const canOpenDeal = dealStatus !== "pending";
              return (
              <div
                key={`deal-submission-${item.id}`}
                className={`relative flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-3.5 shadow-sm sm:flex-row sm:items-start sm:justify-between ${
                  embedded
                    ? ""
                    : "lg:group lg:border-slate-200/90 lg:bg-white/80 lg:p-4 lg:shadow-sm lg:transition-all lg:hover:border-brand-200/70 lg:hover:shadow-md"
                }`}
                role="button"
                tabIndex={0}
                aria-disabled={!canOpenDeal}
                onClick={() => {
                  if (!canOpenDeal) return;
                  navigate(`/deals/${item.id}`);
                }}
                onKeyDown={(e) => {
                  if (!canOpenDeal) return;
                  if (e.key === "Enter" || e.key === " ") navigate(`/deals/${item.id}`);
                }}
              >
                  <div className="flex min-w-0 flex-1 items-start gap-3.5 lg:items-center lg:gap-4">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className={`h-14 w-14 flex-shrink-0 rounded-2xl object-cover ring-1 ring-slate-200 ${
                        embedded ? "" : "lg:h-[72px] lg:w-[72px] lg:rounded-2xl lg:ring-2 lg:ring-slate-100"
                      }`}
                      loading="lazy"
                      data-route-splash-ignore
                    />
                  ) : (
                    <div
                      className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-500 ring-1 ring-slate-200 ${
                        embedded ? "" : "lg:h-[72px] lg:w-[72px] lg:rounded-2xl lg:ring-2 lg:ring-slate-100"
                      }`}
                    >
                      <FiInfo className={`h-5 w-5 ${embedded ? "" : "lg:h-7 lg:w-7"}`} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`line-clamp-2 break-words text-sm font-semibold leading-snug text-slate-900 ${
                        embedded ? "" : "lg:text-lg lg:font-bold lg:tracking-tight"
                      }`}
                    >
                      {item.title}
                    </p>
                    {!embedded && item.provider_name ? (
                      <p className="mt-1 hidden text-[12px] font-medium text-slate-500 lg:block">{item.provider_name}</p>
                    ) : null}

                    <div className={`mt-2 flex w-full flex-col items-start gap-2 ${!embedded ? "lg:hidden" : ""}`}>
                      <span className="block w-full truncate whitespace-nowrap rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700">
                        {item.city_name || "City"} • {item.category_name || "Category"}
                      </span>

                      <span className="block w-full truncate whitespace-nowrap rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700">
                        Submitted {formatReadableDate(item.created_at)}
                      </span>

                      {item.expiry_date ? (
                        <p className="mt-2 w-full rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700">
                          <span className="flex min-w-0 items-center gap-2">
                            <FiClock className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                            <span className="truncate">
                              Valid until {formatReadableDate(item.expiry_date)}
                            </span>
                          </span>
                        </p>
                      ) : null}

                      {item.status === "rejected" && item.review_note ? (
                        <p className="w-full break-words rounded-xl bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
                          Reason: {item.review_note}
                        </p>
                      ) : null}
                    </div>

                    {!embedded ? (
                      <div className="mt-3 hidden flex-col gap-2.5 border-t border-slate-100/80 pt-3 lg:flex">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200/90 bg-slate-50/90 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm">
                            <FiMapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                            <span className="truncate">{item.city_name || "City"}</span>
                          </span>
                          <span className="inline-flex max-w-full items-center rounded-lg border border-brand-200/60 bg-gradient-to-r from-brand-50/80 to-white px-2.5 py-1 text-[11px] font-semibold text-brand-900 shadow-sm">
                            {item.category_name || "Category"}
                          </span>
                          {item.promo_code ? (
                            <span className="inline-flex items-center rounded-lg border border-amber-200/80 bg-amber-50/90 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-amber-900">
                              {item.promo_code}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-slate-500">
                          <span className="inline-flex items-center gap-2">
                            <FiCalendar className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                            <span>
                              Submitted{" "}
                              <time className="font-semibold text-slate-700">{formatReadableDate(item.created_at)}</time>
                            </span>
                          </span>
                          {item.expiry_date ? (
                            <span className="inline-flex items-center gap-2 text-slate-500">
                              <FiClock className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                              <span>
                                Valid through{" "}
                                <time className="font-semibold text-slate-700">{formatReadableDate(item.expiry_date)}</time>
                              </span>
                            </span>
                          ) : null}
                        </div>
                        {item.status === "rejected" && item.review_note ? (
                          <p className="w-full break-words rounded-lg border border-rose-100 bg-rose-50/90 px-3 py-2 text-xs font-medium leading-relaxed text-rose-800">
                            <span className="font-bold text-rose-900">Feedback · </span>
                            {item.review_note}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end lg:gap-3">
                  <StatusBadge status={item.status} desktopPop={!embedded} />
                  {["approved", "rejected"].includes(dealStatus) ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSubmissionActionError("");
                        setEditDealItem(item);
                        setEditDealExpiryPickerOpen(false);
                        setEditDealForm({
                          title: item.title || "",
                          description: item.description || "",
                          city_id: item.city_id ? String(item.city_id) : "",
                          category_id: item.category_id ? String(item.category_id) : "",
                          provider_name: item.provider_name || "",
                          expiry_date: item.expiry_date ? String(item.expiry_date).slice(0, 10) : "",
                          promo_code: item.promo_code || "",
                          deal_link: item.deal_link || "",
                          image_url: item.image_url || "",
                          is_premium: item.is_premium === 1 || item.is_premium === true,
                          deal_info: item.terms_text || ""
                        });
                      }}
                      className={`rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 ${
                        embedded ? "" : "lg:px-4 lg:py-1.5 lg:shadow-sm"
                      }`}
                    >
                      Edit
                    </button>
                  ) : (
                    <p className="text-right text-xs font-semibold text-amber-700">
                      Pending review
                    </p>
                  )}
                </div>
              </div>
            );
            })}
          </div>
        </section>
      ) : null}
      </div>

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
            <FormField label="Profile image" hint="Optional profile photo (uploaded to cloud storage).">
              <CloudinaryImageInput
                value={editInfluencerForm.profile_image_url || ""}
                onChange={(url) => setEditInfluencerForm((p) => ({ ...p, profile_image_url: url }))}
                disabled={submissionActionLoading}
              />
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
            if (!String(editDealForm.expiry_date || "").trim()) {
              setSubmissionActionError("Please choose a valid until date.");
              return;
            }
            try {
              setSubmissionActionError("");
              setSubmissionActionLoading(true);
              await updateDealSubmission(editDealItem.id, {
                ...editDealForm,
                terms_text: editDealForm.deal_info?.trim() || undefined,
                promo_code: editDealForm.promo_code?.trim() || undefined,
                deal_link: editDealForm.deal_link?.trim() || undefined,
                image_url: editDealForm.image_url?.trim() || undefined,
                city_id: Number(editDealForm.city_id),
                category_id: Number(editDealForm.category_id)
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
            <FormField label="Valid Until" hint="Last date users can claim the deal. Format: MM/DD/YYYY.">
              <FilterPopupField
                label="Valid Until"
                value={editDealForm.expiry_date ? formatDateUS(editDealForm.expiry_date) : "Select valid until date"}
                isActive={editDealExpiryPickerOpen}
                onToggle={(ev) => {
                  ev.stopPropagation();
                  setEditDealExpiryPickerOpen((prev) => !prev);
                }}
                usePortal
                panelClassName="w-fit max-w-[calc(100vw-2rem)]"
                panelContent={
                  <AirbnbDatePickerPanel
                    value={editDealForm.expiry_date}
                    onChange={(next) => setEditDealForm((p) => ({ ...p, expiry_date: next }))}
                    closeOnSelect
                    onClose={() => setEditDealExpiryPickerOpen(false)}
                  />
                }
              />
            </FormField>
            <FormField label="Deal Info" hint="Describe offer details, conditions, and important notes." className="sm:col-span-2">
              <textarea rows={4} value={editDealForm.deal_info || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, deal_info: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Promo Code (Optional)" hint="Optional code users enter at checkout." example="SAVE20">
              <input value={editDealForm.promo_code || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, promo_code: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Deal Link (Optional)" hint="Optional redemption or landing page URL." example="https://brand.com/deals/summer">
              <input type="url" value={editDealForm.deal_link || ""} onChange={(e) => setEditDealForm((p) => ({ ...p, deal_link: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            </FormField>
            <FormField label="Deal image" hint="Optional visual for better click-through." className="sm:col-span-2">
              <CloudinaryImageInput
                value={editDealForm.image_url || ""}
                onChange={(url) => setEditDealForm((p) => ({ ...p, image_url: url }))}
                disabled={submissionActionLoading}
              />
            </FormField>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );

  if (embedded) {
    return body;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-4 lg:mx-auto lg:max-w-6xl lg:space-y-8 lg:px-2 xl:max-w-7xl"
    >
      {body}
    </motion.div>
  );
}
