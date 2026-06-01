import { useCallback, useEffect, useState } from "react";
import { FiImage } from "react-icons/fi";
import { sampleImageEdgeColors } from "../utils/imageEdgeColors";

const DEFAULT_EDGE = { left: "rgb(15, 23, 42)", right: "rgb(15, 23, 42)" };

/**
 * Detail-page banner image: fits with object-contain and fills side gaps
 * with a gradient sampled from the image's left/right edge colors.
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

  useEffect(() => {
    setLoadFailed(false);
    setEdgeColors(DEFAULT_EDGE);
  }, [src]);

  const applyEdgeColors = useCallback((img) => {
    const sampled = sampleImageEdgeColors(img);
    if (sampled) {
      setEdgeColors(sampled);
    }
  }, []);

  const handleLoad = useCallback(
    (event) => {
      setLoadFailed(false);
      applyEdgeColors(event.currentTarget);
    },
    [applyEdgeColors]
  );

  const handleError = useCallback(() => {
    setLoadFailed(true);
    setEdgeColors(DEFAULT_EDGE);
  }, []);

  if (!src || loadFailed) {
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

      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.38] blur-3xl saturate-[1.15]"
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onError={handleError}
      />

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
        className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-black/10 via-transparent to-black/25"
        aria-hidden
      />

      <img
        src={src}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`relative z-[3] mx-auto h-full w-full object-contain object-center ${
          guestLocked ? "blur-sm" : ""
        }`}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </div>
  );
}
