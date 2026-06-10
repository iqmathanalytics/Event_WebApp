import { useEffect, useRef, useState } from "react";
import { FiImage } from "react-icons/fi";

/**
 * Loads listing images only when the card enters (or nears) the viewport — one request per card.
 */
export default function ListingCardImage({
  src,
  alt,
  className = "relative h-full w-full object-contain",
  placeholderClassName = "flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 text-slate-500",
  emptyLabel = "No image"
}) {
  const rootRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const trimmed = String(src || "").trim();

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
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/10 via-transparent to-slate-900/10" />
          <img
            src={trimmed}
            alt={alt}
            loading="lazy"
            decoding="async"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 280px"
            className={className}
          />
        </>
      ) : (
        <div className="h-full w-full animate-pulse bg-slate-200/90" aria-hidden />
      )}
    </div>
  );
}
