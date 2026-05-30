import { useCallback, useState } from "react";
import { sampleImageEdgeColors } from "../utils/imageEdgeColors";

const DEFAULT_EDGE = { left: "rgb(15, 23, 42)", right: "rgb(15, 23, 42)" };

function supportsEdgeColorSampling(src) {
  try {
    const url = new URL(src, window.location.origin);
    if (url.origin === window.location.origin) {
      return true;
    }
    const host = url.hostname.toLowerCase();
    return host.includes("cloudinary.com") || host.includes("res.cloudinary.com");
  } catch {
    return false;
  }
}

/**
 * Detail-page banner image: fits with object-contain and fills side gaps
 * with a gradient sampled from the image's left/right edge colors.
 */
export default function ListingDetailBannerImage({
  src,
  alt,
  guestLocked = false,
  eager = false,
  className = ""
}) {
  const [edgeColors, setEdgeColors] = useState(DEFAULT_EDGE);
  const crossOrigin = supportsEdgeColorSampling(src) ? "anonymous" : undefined;

  const applyEdgeColors = useCallback((img) => {
    const sampled = sampleImageEdgeColors(img);
    if (sampled) {
      setEdgeColors(sampled);
    }
  }, []);

  const handleLoad = useCallback(
    (event) => {
      applyEdgeColors(event.currentTarget);
    },
    [applyEdgeColors]
  );

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
        crossOrigin={crossOrigin}
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.38] blur-3xl saturate-[1.15]"
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={(e) => applyEdgeColors(e.currentTarget)}
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
        crossOrigin={crossOrigin}
        onLoad={handleLoad}
        className={`relative z-[3] mx-auto h-full w-full object-contain object-center ${
          guestLocked ? "blur-sm" : ""
        }`}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </div>
  );
}
