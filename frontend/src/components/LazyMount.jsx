import { useEffect, useRef, useState } from "react";

/** Renders children only after the slot is near the viewport (defers card images below the fold). */
export default function LazyMount({ children, className = "", minHeight = "20rem", rootMargin = "240px" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return undefined;
    }
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className} style={visible ? undefined : { minHeight }}>
      {visible ? children : <div className="h-full min-h-[inherit] animate-pulse rounded-3xl bg-slate-100/90" aria-hidden />}
    </div>
  );
}
