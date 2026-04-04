import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImagePlus,
  Instagram,
  Mail,
  MapPin,
  Sparkles,
  X,
  Youtube
} from "lucide-react";
import { FiArrowLeft, FiImage, FiInfo } from "react-icons/fi";
import useAuth from "../hooks/useAuth";
import {
  fetchInfluencerDetails,
  fetchInfluencerMedia,
  fetchMyInfluencerSubmissions,
  trackInfluencerView,
  uploadInfluencerMedia
} from "../services/listingService";
import { useRouteContentReady } from "../context/RouteContentReadyContext";

function parseMaybeJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return null;
  }
}

function toDisplayNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  try {
    return new Intl.NumberFormat("en", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: n >= 1000 ? 1 : 0
    }).format(n);
  } catch (_err) {
    return n.toLocaleString();
  }
}

function TagPill({ tag }) {
  const t = String(tag || "");
  const styles =
    t === "Trending"
      ? "bg-amber-400/15 text-amber-100 border-amber-400/35"
      : t === "Popular"
        ? "bg-white/10 text-white border-white/20"
        : t === "Rising"
          ? "bg-emerald-400/15 text-emerald-100 border-emerald-400/35"
          : t === "Top Creator"
            ? "bg-brand-500/25 text-rose-50 border-brand-400/40"
            : "bg-white/10 text-white/90 border-white/15";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm lg:px-3 lg:py-1 lg:text-[11px] ${styles}`}
    >
      {t}
    </span>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
};

function GalleryLightbox({ images, activeIndex, onClose, onPrev, onNext }) {
  const onKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    if (activeIndex < 0) return undefined;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, onKeyDown]);

  if (activeIndex < 0) return null;

  const active = images[activeIndex];
  if (!active) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="lightbox"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-slate-950/90 backdrop-blur-md"
        onClick={onClose}
      >
        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-8">
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute -right-1 -top-1 z-10 grid h-11 w-11 place-content-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20 sm:-right-2 sm:-top-2"
              aria-label="Close gallery"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="overflow-hidden rounded-2xl bg-slate-900 shadow-2xl ring-1 ring-white/10 sm:rounded-3xl">
              <img
                src={active.image_url}
                alt=""
                className="max-h-[min(78vh,880px)] w-full object-contain"
              />
              <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-slate-950/80 px-4 py-3 sm:px-5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrev();
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={activeIndex <= 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold tabular-nums text-white/90 ring-1 ring-white/10">
                  {activeIndex + 1} / {images.length}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNext();
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={activeIndex >= images.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6 pb-12">
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-100">
        <div className="h-48 animate-pulse bg-gradient-to-br from-slate-200 to-slate-100 sm:h-56" />
        <div className="space-y-4 p-5 sm:p-8">
          <div className="flex gap-4">
            <div className="h-24 w-24 shrink-0 animate-pulse rounded-3xl bg-slate-200" />
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-7 w-2/3 animate-pulse rounded-lg bg-slate-200" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-3xl bg-slate-100" />
    </div>
  );
}

export default function InfluencerDetailsPage() {
  const { id } = useParams();
  const influencerId = Number(id);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [influencer, setInfluencer] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [mySubmissionId, setMySubmissionId] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryUrls, setGalleryUrls] = useState([""]);
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryError, setGalleryError] = useState("");

  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const social = useMemo(() => {
    if (!influencer) return { instagram: "", youtube: "" };
    return parseMaybeJson(influencer.social_links) || { instagram: "", youtube: "" };
  }, [influencer]);

  const isOwner = useMemo(() => {
    return mySubmissionId != null && mySubmissionId === influencerId;
  }, [mySubmissionId, influencerId]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setErrMsg("");
        const [detailsRes, mediaRes] = await Promise.all([
          fetchInfluencerDetails(influencerId),
          fetchInfluencerMedia(influencerId)
        ]);
        if (!active) return;
        setInfluencer(detailsRes?.data || null);
        setMedia(mediaRes?.data || []);
        if (!detailsRes?.data) {
          setErrMsg("Creator not found.");
        }
      } catch (err) {
        if (!active) return;
        setErrMsg(err?.response?.data?.message || "Could not load influencer details.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [influencerId]);

  useEffect(() => {
    if (!influencerId || !influencer) return;
    trackInfluencerView(influencerId).catch(() => {});
  }, [influencerId, influencer]);

  useEffect(() => {
    let active = true;
    async function loadMySubmission() {
      if (!isAuthenticated) return;
      try {
        const res = await fetchMyInfluencerSubmissions();
        if (!active) return;
        const submission = (res?.data || [])[0];
        setMySubmissionId(submission?.id ?? null);
      } catch (_err) {
        if (!active) return;
        setMySubmissionId(null);
      }
    }
    loadMySubmission();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  useRouteContentReady(loading);

  const tags = Array.isArray(influencer?.tags) ? influencer.tags : [];

  const onUpload = async (e) => {
    e.preventDefault();
    setGalleryError("");
    const cleaned = galleryUrls.map((u) => String(u || "").trim()).filter(Boolean);
    if (!cleaned.length) {
      setGalleryError("Please add at least one image URL.");
      return;
    }
    try {
      setGallerySaving(true);
      await uploadInfluencerMedia(influencerId, cleaned);
      setGalleryOpen(false);
      setGalleryUrls([""]);
      const refreshed = await fetchInfluencerMedia(influencerId);
      setMedia(refreshed?.data || []);
    } catch (err) {
      setGalleryError(err?.response?.data?.message || "Could not upload gallery.");
    } finally {
      setGallerySaving(false);
    }
  };

  const profileSrc =
    influencer?.profile_image_url ||
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=640&q=80";

  if (loading && !influencer) {
    return <PageSkeleton />;
  }

  if (!influencer || errMsg) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-6 py-16 text-center shadow-soft"
      >
        <div className="mb-4 grid h-16 w-16 place-content-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100">
          <FiInfo className="h-8 w-8" />
        </div>
        <p className="max-w-md text-base font-medium text-slate-800">{errMsg || "Creator not found."}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800"
        >
          <FiArrowLeft className="h-4 w-4" />
          Go back
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="w-full min-w-0 max-w-full pb-10 lg:pb-14"
    >
      {/* Hero: z-0 + softer shadow below lg so spill doesn't paint over the strip below; full shadow from lg up */}
      <section className="relative z-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-[0_14px_40px_-12px_rgba(15,23,42,0.42)] ring-1 ring-white/10 lg:rounded-3xl lg:shadow-[0_24px_80px_-20px_rgba(15,23,42,0.55)]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-600/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-violet-600/25 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.2)_0%,transparent_45%,rgba(244,63,94,0.08)_100%)]" />

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-1 top-1 z-30 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/35 text-white shadow-sm backdrop-blur-md transition hover:bg-black/45 sm:left-2 sm:top-2 sm:h-9 sm:w-9 lg:left-2.5 lg:top-2.5 lg:h-7 lg:w-7 lg:border-white/25 lg:bg-black/30 lg:shadow-none"
          aria-label="Back"
        >
          <FiArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-3 lg:w-3" />
        </button>

        <div className="relative px-3 pb-6 pt-3 sm:px-6 sm:pb-8 sm:pt-4 lg:px-8 lg:pb-10 lg:pt-6">
          <div className="flex flex-col gap-5 pt-11 sm:gap-6 sm:pt-11 lg:flex-row lg:items-end lg:gap-10 lg:pt-0">
            <motion.div
              {...fadeUp}
              className="relative mx-auto shrink-0 lg:mx-0"
            >
              <div className="absolute -inset-1 rounded-[1.35rem] bg-gradient-to-br from-brand-400/60 via-fuchsia-500/40 to-violet-600/50 blur-sm lg:rounded-[2rem]" />
              <img
                src={profileSrc}
                alt=""
                className="relative h-28 w-28 rounded-[1.35rem] object-cover shadow-2xl ring-[3px] ring-white/10 sm:h-32 sm:w-32 md:h-36 md:w-36 lg:h-44 lg:w-44 lg:rounded-[1.75rem] lg:ring-4"
              />
              {isOwner ? (
                <span className="absolute -bottom-1 left-1/2 max-w-[calc(100%+0.5rem)] -translate-x-1/2 whitespace-nowrap rounded-full border border-emerald-400/50 bg-emerald-600/95 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white shadow-md backdrop-blur-sm">
                  Your profile
                </span>
              ) : null}
            </motion.div>

            <div className="min-w-0 flex-1 text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.35 }}
                className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 lg:justify-start"
              >
                {tags.slice(0, 5).map((t, i) => (
                  <TagPill key={`${t}-${i}`} tag={t} />
                ))}
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.35 }}
                className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:mt-4 lg:text-4xl"
              >
                {influencer.name}
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.11, duration: 0.35 }}
                className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-xs text-white/75 sm:gap-2 sm:text-sm lg:mt-3 lg:justify-start"
              >
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 font-semibold text-white/95 ring-1 ring-white/10 lg:gap-1.5 lg:px-3 lg:py-1">
                  <Sparkles className="h-3 w-3 shrink-0 text-amber-200 lg:h-3.5 lg:w-3.5" />
                  {influencer.category_name || "Lifestyle"}
                </span>
                <span className="inline-flex items-center gap-1 text-white/70 lg:gap-1.5">
                  <MapPin className="h-3 w-3 shrink-0 lg:h-3.5 lg:w-3.5" />
                  {influencer.city_name || "—"}
                </span>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.35 }}
              className="grid w-full max-w-md grid-cols-2 gap-2 sm:max-w-none sm:gap-3 sm:grid-cols-2 lg:w-auto lg:shrink-0 lg:grid-cols-2 lg:gap-3"
            >
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-left backdrop-blur-md lg:rounded-2xl lg:p-4">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/55 lg:gap-2 lg:text-[11px]">
                  <Instagram className="h-3.5 w-3.5 shrink-0 text-pink-300 lg:h-4 lg:w-4" />
                  Instagram
                </div>
                <p className="mt-1.5 text-xl font-bold tabular-nums text-white lg:mt-2 lg:text-3xl">
                  {toDisplayNumber(influencer.followers_count)}
                </p>
                <p className="text-[10px] font-medium text-white/50 lg:text-xs">followers</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-left backdrop-blur-md lg:rounded-2xl lg:p-4">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/55 lg:gap-2 lg:text-[11px]">
                  <Youtube className="h-3.5 w-3.5 shrink-0 text-red-400 lg:h-4 lg:w-4" />
                  YouTube
                </div>
                <p className="mt-1.5 text-xl font-bold tabular-nums text-white lg:mt-2 lg:text-3xl">
                  {toDisplayNumber(influencer.youtube_subscribers_count)}
                </p>
                <p className="text-[10px] font-medium text-white/50 lg:text-xs">subscribers</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Below hero: higher z-index + opaque surfaces so hero box-shadow never paints over these cards */}
      <div className="relative z-10 mt-6 flex w-full min-w-0 max-w-full flex-col gap-6 sm:mt-7 lg:mt-8 lg:gap-8">
      {/* Story + contact strip — min-w-0 on grid + items prevents long text from widening past the viewport */}
      <div className="grid min-w-0 max-w-full gap-4 sm:gap-5 lg:grid-cols-12 lg:gap-8">
        <motion.section
          {...fadeUp}
          className="relative min-w-0 max-w-full overflow-x-clip rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft sm:p-5 md:p-6 lg:col-span-7 lg:rounded-3xl lg:p-8"
        >
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 overflow-hidden rounded-tr-3xl">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-gradient-to-bl from-brand-50 to-transparent opacity-80" />
          </div>
          <div className="relative flex min-w-0 items-start gap-2.5 sm:gap-3 lg:gap-4">
            <div className="mt-0.5 grid h-9 w-9 shrink-0 place-content-center rounded-xl bg-gradient-to-br from-brand-500 to-rose-600 text-white shadow-md shadow-brand-500/25 lg:h-10 lg:w-10 lg:rounded-2xl">
              <FiInfo className="h-4 w-4 lg:h-5 lg:w-5" />
            </div>
            <div className="min-w-0 max-w-full flex-1">
              <h2 className="text-base font-bold text-slate-900 lg:text-lg">About</h2>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600 [overflow-wrap:anywhere] lg:mt-3 lg:text-base">
                {influencer.bio || "This creator hasn’t added a bio yet."}
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.05 }}
          className="relative isolate min-w-0 max-w-full overflow-x-clip rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-4 shadow-soft sm:p-5 md:p-6 lg:col-span-5 lg:rounded-3xl lg:p-8"
        >
          <h2 className="flex items-center gap-1.5 text-base font-bold text-slate-900 lg:gap-2 lg:text-lg">
            <Mail className="h-4 w-4 shrink-0 text-brand-600 lg:h-5 lg:w-5" />
            Contact
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 lg:mt-1 lg:text-sm">For collaborations &amp; inquiries</p>
          <div className="mt-3 min-w-0 max-w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 shadow-inner lg:mt-5 lg:rounded-2xl lg:px-4 lg:py-3.5">
            <p className="break-all text-xs font-semibold leading-snug text-slate-900 lg:text-sm">
              {influencer.contact_email || "—"}
            </p>
          </div>
        </motion.section>
      </div>

      {/* Social links */}
      <motion.section
        {...fadeUp}
        className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft sm:p-5 md:p-6 lg:rounded-3xl lg:p-8"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 lg:text-xl">Social</h2>
            <p className="mt-0.5 text-xs text-slate-500 lg:mt-1 lg:text-sm">Follow along on their channels</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
          <a
            href={social?.instagram || undefined}
            target="_blank"
            rel="noreferrer"
            className={`group relative overflow-hidden rounded-xl border p-4 transition lg:rounded-2xl lg:p-5 ${
              social?.instagram
                ? "border-pink-200/80 bg-gradient-to-br from-pink-50 via-white to-fuchsia-50 hover:border-pink-300 hover:shadow-md"
                : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
            }`}
            onClick={(e) => {
              if (!social?.instagram) e.preventDefault();
            }}
          >
            <div className="flex items-start justify-between gap-2 lg:gap-3">
              <div className="grid h-10 w-10 place-content-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/30 lg:h-12 lg:w-12 lg:rounded-2xl">
                <Instagram className="h-5 w-5 lg:h-6 lg:w-6" />
              </div>
              {social?.instagram ? (
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-pink-600 opacity-0 transition group-hover:opacity-100 lg:h-4 lg:w-4" />
              ) : null}
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-pink-900/70 lg:mt-4 lg:text-xs">Instagram</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-900 lg:mt-1 lg:text-sm">
              {social?.instagram ? "Open profile" : "Not linked"}
            </p>
          </a>

          <a
            href={social?.youtube || undefined}
            target="_blank"
            rel="noreferrer"
            className={`group relative overflow-hidden rounded-xl border p-4 transition lg:rounded-2xl lg:p-5 ${
              social?.youtube
                ? "border-red-200/80 bg-gradient-to-br from-red-50 via-white to-orange-50 hover:border-red-300 hover:shadow-md"
                : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
            }`}
            onClick={(e) => {
              if (!social?.youtube) e.preventDefault();
            }}
          >
            <div className="flex items-start justify-between gap-2 lg:gap-3">
              <div className="grid h-10 w-10 place-content-center rounded-xl bg-gradient-to-br from-red-600 to-red-500 text-white shadow-lg shadow-red-600/30 lg:h-12 lg:w-12 lg:rounded-2xl">
                <Youtube className="h-5 w-5 lg:h-6 lg:w-6" />
              </div>
              {social?.youtube ? (
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-red-600 opacity-0 transition group-hover:opacity-100 lg:h-4 lg:w-4" />
              ) : null}
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-red-900/70 lg:mt-4 lg:text-xs">YouTube</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-900 lg:mt-1 lg:text-sm">
              {social?.youtube ? "Open channel" : "Not linked"}
            </p>
          </a>
        </div>
      </motion.section>

      {/* Gallery */}
      <motion.section
        {...fadeUp}
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-soft lg:rounded-3xl"
      >
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white px-4 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="grid h-9 w-9 shrink-0 place-content-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/20 lg:h-11 lg:w-11 lg:rounded-2xl">
                <Camera className="h-4 w-4 lg:h-5 lg:w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 lg:text-xl">Gallery</h2>
                <p className="mt-0.5 text-xs text-slate-500 lg:text-sm">Moments, looks &amp; behind the scenes</p>
              </div>
            </div>
            {isOwner ? (
              <button
                type="button"
                onClick={() => setGalleryOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 self-start rounded-full bg-gradient-to-r from-brand-600 to-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:brightness-105 lg:gap-2 lg:px-5 lg:py-2.5 lg:text-sm"
              >
                <ImagePlus className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                Add photos
              </button>
            ) : null}
          </div>
        </div>

        <div className="p-3 sm:p-4 sm:pt-4 lg:p-6 lg:pt-5">
          {media.length ? (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-4 lg:gap-3">
              {media.map((img, idx) => {
                const featured = idx === 0 && media.length > 1;
                return (
                  <button
                    type="button"
                    key={`${img.image_url}-${idx}`}
                    onClick={() => setLightboxIndex(idx)}
                    className={`group relative overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 text-left shadow-sm ring-0 transition hover:z-10 hover:border-brand-200/80 hover:shadow-xl hover:shadow-slate-900/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 lg:rounded-2xl ${
                      featured ? "col-span-2 row-span-2 min-h-[160px] sm:min-h-[220px] lg:min-h-[320px]" : "aspect-square"
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                    <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-900 opacity-0 shadow-sm transition group-hover:opacity-100 lg:bottom-3 lg:left-3 lg:px-2.5 lg:py-1 lg:text-[10px]">
                      View
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-12 text-center lg:rounded-2xl lg:px-6 lg:py-16">
              <div className="mb-3 grid h-11 w-11 place-content-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-200/80 lg:mb-4 lg:h-14 lg:w-14 lg:rounded-2xl">
                <FiImage className="h-6 w-6 lg:h-7 lg:w-7" />
              </div>
              <p className="text-xs font-semibold text-slate-700 lg:text-sm">No gallery images yet</p>
              <p className="mt-1 max-w-sm text-xs text-slate-500 lg:text-sm">
                {isOwner ? "Add image URLs to showcase your work." : "Check back soon for new shots."}
              </p>
            </div>
          )}
        </div>
      </motion.section>
      </div>

      <GalleryLightbox
        images={media}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(-1)}
        onPrev={() => setLightboxIndex((i) => Math.max(0, i - 1))}
        onNext={() => setLightboxIndex((i) => Math.min(media.length - 1, i + 1))}
      />

      <AnimatePresence>
        {galleryOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6"
            onClick={() => setGalleryOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl ring-1 ring-slate-200/80"
            >
              <div className="relative border-b border-slate-100 bg-gradient-to-r from-brand-50/50 to-white px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Add to gallery</h3>
                    <p className="mt-1 text-sm text-slate-500">Paste public image URLs — you can add several at once.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGalleryOpen(false)}
                    className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <form onSubmit={onUpload} className="px-5 py-5 sm:px-6 sm:py-6">
                <div className="space-y-3">
                  {galleryUrls.map((u, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="url"
                        required={idx === 0}
                        value={u}
                        onChange={(e) => {
                          const next = [...galleryUrls];
                          next[idx] = e.target.value;
                          setGalleryUrls(next);
                        }}
                        placeholder="https://example.com/image.jpg"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm transition focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                      {galleryUrls.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => setGalleryUrls((prev) => prev.filter((_, j) => j !== idx))}
                          className="shrink-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGalleryUrls((prev) => [...prev, ""])}
                    disabled={galleryUrls.length >= 10}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    + Add another URL
                  </button>
                  <span className="text-xs text-slate-400">Up to 25 images per upload.</span>
                </div>

                {galleryError ? (
                  <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                    {galleryError}
                  </p>
                ) : null}

                <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setGalleryOpen(false)}
                    className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={gallerySaving}
                    className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {gallerySaving ? "Uploading…" : "Upload gallery"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
