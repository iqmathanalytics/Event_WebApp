import { useCallback, useEffect, useRef, useState } from "react";
import { FiImage } from "react-icons/fi";
import { sampleImageEdgeColors } from "../utils/imageEdgeColors";

const DEFAULT_EDGE = { left: "rgb(226, 232, 240)", right: "rgb(203, 213, 225)" };

/**
 * Loads listing images only when the card enters (or nears) the viewport — one request per card.
 * fit="cover" fills the frame; fit="contain-edge" shows the full image and soft-fills letterbox
 * gaps with a blurred image + edge-sampled gradient.
 */
export default function ListingCardImage({
  src,
  alt,
  fit = "cover",
  className,
  placeholderClassName = "flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 text-slate-500",
  emptyLabel = "No image"
}) {
  const rootRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [edgeColors, setEdgeColors] = useState(DEFAULT_EDGE);
  const trimmed = String(src || "").trim();
  const isContainEdge = fit === "contain-edge";
  const imageClassName =
    className ||
    (isContainEdge
      ? "relative z-[3] mx-auto h-full w-full object-contain object-center"
      : "relative h-full w-full object-cover object-center");

  useEffect(() => {
    const node = rootRef.current;
    if (!node || !trimmed) {
      return undefined;
    }
    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [trimmed]);

  useEffect(() => {
    setEdgeColors(DEFAULT_EDGE);
  }, [trimmed]);

  const handleLoad = useCallback((event) => {
    const sampled = sampleImageEdgeColors(event.currentTarget);
    if (sampled) {
      setEdgeColors(sampled);
    }
  }, []);

  if (!trimmed) {
    return (
      <div className={placeholderClassName}>
        <div className="flex flex-col items-center gap-1">
          <div className="grid h-12 w-12 place-content-center rounded-full bg-white/90 text-slate-500 shadow-sm ring-1 ring-slate-200">
            <FiImage className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold">{emptyLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-slate-100">
      {shouldLoad ? (
        isContainEdge ? (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to right, ${edgeColors.left}, ${edgeColors.right})`
              }}
              aria-hidden
            />
            <img
              src={trimmed}
              alt=""
              aria-hidden
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-2xl saturate-[1.2]"
            />
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-[max(12%,40px)]"
              style={{
                background: `linear-gradient(to right, ${edgeColors.left} 0%, transparent 100%)`
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-[max(12%,40px)]"
              style={{
                background: `linear-gradient(to left, ${edgeColors.right} 0%, transparent 100%)`
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-black/[0.04] via-transparent to-black/[0.08]"
              aria-hidden
            />
            <img
              src={trimmed}
              alt={alt}
              loading="lazy"
              decoding="async"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
              onLoad={handleLoad}
              className={imageClassName}
            />
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/10 via-transparent to-slate-900/10" />
            <img
              src={trimmed}
              alt={alt}
              loading="lazy"
              decoding="async"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
              className={imageClassName}
            />
          </>
        )
      ) : (
        <div className="h-full w-full animate-pulse bg-slate-200/90" aria-hidden />
      )}
    </div>
  );
}
