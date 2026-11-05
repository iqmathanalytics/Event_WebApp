import { useCallback, useEffect, useState } from "react";
import { FiImage } from "react-icons/fi";
import { sampleImageEdgeColors } from "../utils/imageEdgeColors";
import {
  displayImageBlurUrl,
  LISTING_BANNER_SIZES,
  listingBannerImageUrl,
  listingBannerSrcSet
} from "../utils/displayImage";

const DEFAULT_EDGE = {
  left: "rgb(15, 23, 42)",
  right: "rgb(15, 23, 42)",
  top: "rgb(15, 23, 42)",
  bottom: "rgb(15, 23, 42)"
};

/**
 * Detail-page banner image: fits with object-contain and soft-fills letterbox
 * gaps with edge-sampled gradients + a blurred cover of the same image.
 * Desktop (tall frame) strengthens the top/bottom color fill.
 * Display images omit crossOrigin so Cloudinary/CDN URLs load reliably in production.
 */
export default function ListingDetailBannerImage({
  src,
  alt,
  guestLocked = false,
  eager = false,
  className = ""
}) {
  const [edgeColors, setEdgeColors] = useState(DEFAULT_EDGE);
  const [loadFailed, setLoadFailed] = useState(false);
  const [blurFailed, setBlurFailed] = useState(false);
  const trimmed = String(src || "").trim();
  const displaySrc = listingBannerImageUrl(trimmed);
  const srcSet = listingBannerSrcSet(trimmed);
  const blurSrc = displayImageBlurUrl(trimmed);
  const showBlurImage = Boolean(blurSrc) && !blurFailed;

  useEffect(() => {
    setLoadFailed(false);
    setBlurFailed(false);
    setEdgeColors(DEFAULT_EDGE);
  }, [trimmed]);

  const applyEdgeColors = useCallback((img) => {
    const sampled = sampleImageEdgeColors(img);
    if (sampled) {
      setEdgeColors({
        left: sampled.left,
        right: sampled.right,
        top: sampled.top || sampled.left,
        bottom: sampled.bottom || sampled.right
      });
    }
  }, []);

  // CORS probe (tiny blur URL) so canvas edge sampling works for Cloudinary/CDN.
  useEffect(() => {
    const probeSrc = blurSrc || displaySrc;
    if (!probeSrc) {
      return undefined;
    }
    let cancelled = false;
    const probe = new Image();
    probe.crossOrigin = "anonymous";
    probe.decoding = "async";
    probe.onload = () => {
      if (!cancelled) {
        applyEdgeColors(probe);
      }
    };
    probe.src = probeSrc;
    return () => {
      cancelled = true;
    };
  }, [applyEdgeColors, blurSrc, displaySrc]);

  const handleLoad = useCallback(() => {
    setLoadFailed(false);
  }, []);

  const handleError = useCallback(() => {
    setLoadFailed(true);
    setEdgeColors(DEFAULT_EDGE);
  }, []);

  if (!trimmed || loadFailed) {
    return (
      <div
        className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 ${className}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(244,63,94,0.18),transparent_42%),radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.2),transparent_45%)]" />
        <div className="relative z-10 flex flex-col items-center gap-2 text-white/80">
          <div className="grid h-12 w-12 place-content-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <FiImage className="h-6 w-6" aria-hidden />
          </div>
          <p className="text-xs font-medium">Image unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full overflow-hidden bg-slate-950 ${className}`}>
      <div
        className="absolute inset-0 scale-105"
        style={{
          background: `linear-gradient(to right, ${edgeColors.left}, ${edgeColors.right})`
        }}
        aria-hidden
      />
      {/* Desktop tall frame: vertical letterbox fill from image edge colors */}
      <div
        className="absolute inset-0 hidden scale-105 lg:block"
        style={{
          background: `linear-gradient(to bottom, ${edgeColors.top} 0%, ${edgeColors.left} 42%, ${edgeColors.right} 58%, ${edgeColors.bottom} 100%)`
        }}
        aria-hidden
      />

      {showBlurImage ? (
        <img
          src={blurSrc}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.38] blur-3xl saturate-[1.15] lg:scale-[1.2] lg:opacity-[0.72] lg:blur-[48px] lg:saturate-[1.3]"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setBlurFailed(true)}
        />
      ) : null}

      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-[max(14%,72px)] sm:w-[max(12%,96px)]"
        style={{
          background: `linear-gradient(to right, ${edgeColors.left} 0%, transparent 100%)`
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-[max(14%,72px)] sm:w-[max(12%,96px)]"
        style={{
          background: `linear-gradient(to left, ${edgeColors.right} 0%, transparent 100%)`
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] hidden h-[max(22%,120px)] lg:block"
        style={{
          background: `linear-gradient(to bottom, ${edgeColors.top} 0%, transparent 100%)`
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] hidden h-[max(22%,120px)] lg:block"
        style={{
          background: `linear-gradient(to top, ${edgeColors.bottom} 0%, transparent 100%)`
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-black/10 via-transparent to-black/25 lg:from-black/[0.12] lg:to-black/30"
        aria-hidden
      />

      <img
        src={displaySrc}
        srcSet={srcSet}
        sizes={LISTING_BANNER_SIZES}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`relative z-[3] mx-auto h-full w-full object-contain object-center ${
          guestLocked ? "blur-sm" : ""
        }`}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchpriority={eager ? "high" : "auto"}
      />
    </div>
  );
}
