import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiArrowLeft, FiImage, FiInfo } from "react-icons/fi";
import useAuth from "../hooks/useAuth";
import {
  fetchInfluencerDetails,
  fetchInfluencerMedia,
  fetchMyInfluencerSubmissions,
  trackInfluencerView,
  trackInfluencerClick,
  uploadInfluencerMedia
} from "../services/listingService";

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
  return n.toLocaleString();
}

function TagPill({ tag }) {
  const t = String(tag || "");
  const styles =
    t === "Trending"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : t === "Popular"
        ? "bg-slate-50 text-slate-800 border-slate-200"
        : t === "Rising"
          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
          : t === "Top Creator"
            ? "bg-brand-50 text-brand-800 border-brand-200"
            : "bg-slate-50 text-slate-800 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${styles}`}>
      {t}
    </span>
  );
}

function GalleryLightbox({ images, activeIndex, onClose, onPrev, onNext }) {
  if (activeIndex < 0) {
    return null;
  }

  const active = images[activeIndex];
  if (!active) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="lightbox"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute -top-2 -right-2 rounded-full bg-white/95 px-3 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-white"
            >
              Close
            </button>
            <img src={active.image_url} alt="Influencer gallery" className="w-full rounded-3xl object-contain bg-white" />
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onPrev}
                className="rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-white disabled:opacity-40"
                disabled={activeIndex <= 0}
              >
                Prev
              </button>
              <span className="text-sm font-semibold text-white/90">
                {activeIndex + 1} / {images.length}
              </span>
              <button
                type="button"
                onClick={onNext}
                className="rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-slate-900 shadow hover:bg-white disabled:opacity-40"
                disabled={activeIndex >= images.length - 1}
              >
                Next
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function InfluencerDetailsPage() {
  const { id } = useParams();
  const influencerId = Number(id);
  const navigate = useNavigate();
  const { isAuthenticated, canCreateInfluencerProfile, user } = useAuth();

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
    // Track view once per mount.
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-5 pb-10"
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label="Back"
            >
              <FiArrowLeft />
            </button>
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={influencer?.profile_image_url || "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=240"}
                alt={influencer?.name || "Influencer"}
                className="h-16 w-16 rounded-2xl object-cover"
              />
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-slate-900">{influencer?.name || "Influencer"}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {influencer?.category_name || "Lifestyle"}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{influencer?.city_name || "City"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 4).map((t) => (
              <TagPill key={t} tag={t} />
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex items-start gap-2">
              <FiInfo className="mt-1 h-4 w-4 text-slate-500" />
              <p className="text-sm text-slate-700">
                {influencer?.bio || "No bio available."}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Instagram</p>
              <p className="text-sm font-bold text-slate-900">
                {toDisplayNumber(influencer?.followers_count)} followers
              </p>
              <div className="h-px w-full bg-slate-200 my-2" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">YouTube</p>
              <p className="text-sm font-bold text-slate-900">
                {toDisplayNumber(influencer?.youtube_subscribers_count)} subscribers
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-bold text-slate-900">Social & Contact</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Instagram</p>
            {social?.instagram ? (
              <a
                href={social.instagram}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
              >
                Open Instagram
              </a>
            ) : (
              <p className="mt-1 text-sm text-slate-700">-</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">YouTube</p>
            {social?.youtube ? (
              <a
                href={social.youtube}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
              >
                Open YouTube
              </a>
            ) : (
              <p className="mt-1 text-sm text-slate-700">-</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact Email</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {influencer?.contact_email || "-"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Gallery</h2>
            <p className="mt-1 text-sm text-slate-600">A collage of influencer images.</p>
          </div>
          {isOwner ? (
            <button
              type="button"
              onClick={() => setGalleryOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <FiImage className="h-4 w-4" />
              Gallery Upload
            </button>
          ) : null}
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : media.length ? (
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
              {media.map((img, idx) => (
                <button
                  type="button"
                  key={`${img.image_url}-${idx}`}
                  onClick={() => setLightboxIndex(idx)}
                  className="mb-3 w-full break-inside-avoid group relative"
                >
                  <img
                    src={img.image_url}
                    alt="Gallery item"
                    loading="lazy"
                    className="w-full rounded-2xl border border-slate-200 object-cover shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                  <span className="pointer-events-none absolute inset-0 rounded-2xl bg-slate-950/0 transition-colors duration-200 group-hover:bg-slate-950/10" />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No gallery images yet.</p>
          )}
        </div>
      </section>

      <GalleryLightbox
        images={media}
        activeIndex={lightboxIndex}
        onClose={() => setLightboxIndex(-1)}
        onPrev={() => setLightboxIndex((i) => Math.max(0, i - 1))}
        onNext={() => setLightboxIndex((i) => Math.min(media.length - 1, i + 1))}
      />

      {galleryOpen ? (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/60 p-3 sm:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Gallery Upload</h3>
                <p className="text-sm text-slate-600">Paste multiple image URLs.</p>
              </div>
              <button
                type="button"
                onClick={() => setGalleryOpen(false)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <form onSubmit={onUpload} className="px-5 py-4">
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
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                    {galleryUrls.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setGalleryUrls((prev) => prev.filter((_, j) => j !== idx))}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGalleryUrls((prev) => [...prev, ""])}
                  disabled={galleryUrls.length >= 10}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                >
                  Add another
                </button>
                <span className="text-xs text-slate-500">Max 25 images per upload.</span>
              </div>

              {galleryError ? <p className="mt-3 text-sm font-semibold text-rose-600">{galleryError}</p> : null}

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setGalleryOpen(false)}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={gallerySaving}
                  className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {gallerySaving ? "Uploading..." : "Upload Gallery"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      ) : null}
    </motion.div>
  );
}

