import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouteContentReadyContext } from "../context/RouteContentReadyContext";
import { shouldShowHomeSplash } from "../utils/homeSplashPolicy";
import AppLoadingOverlay from "./AppLoadingOverlay";

const MIN_OVERLAY_AFTER_READY_MS = 280;
const MIN_OVERLAY_AFTER_READY_MS_REDUCED = 180;
const OVERLAY_SAFETY_MS = 12000;

/**
 * Full-page route transition overlay (AppLoadingOverlay).
 * - Client navigations between pages (including → home)
 * - Hard reload / cold load on any page (home keeps its dedicated boot splash)
 * - Dismisses after the destination signals readiness (+ short minimum hold)
 * - Query/hash-only updates on the same pathname do NOT show the overlay
 */
function NavigationProgress() {
  const location = useLocation();
  const { contentReady } = useRouteContentReadyContext();
  const reduceMotion = useReducedMotion();
  const firstPaint = useRef(true);
  const prevPathnameRef = useRef(location.pathname);
  const [overlay, setOverlay] = useState(null);

  /** useLayoutEffect: run before paint so the dimmer mounts before the new route is visible. */
  useLayoutEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false;
      prevPathnameRef.current = location.pathname;
      // Hard reload / direct open on any route. Home already has #bmt-boot-splash.
      if (!shouldShowHomeSplash()) {
        setOverlay({ key: location.key, startedAt: Date.now() });
      }
      return undefined;
    }

    const to = location.pathname;
    const pathChanged = prevPathnameRef.current !== to;
    prevPathnameRef.current = to;

    // Same page, different ?host= / filters — keep tab switches instant (no reload overlay).
    if (!pathChanged) {
      return undefined;
    }

    setOverlay({ key: location.key, startedAt: Date.now() });
    return undefined;
  }, [location.key, location.pathname, location.search]);

  useEffect(() => {
    if (!overlay) {
      return undefined;
    }
    if (overlay.key !== location.key) {
      return undefined;
    }
    if (!contentReady) {
      return undefined;
    }

    const minMs = reduceMotion ? MIN_OVERLAY_AFTER_READY_MS_REDUCED : MIN_OVERLAY_AFTER_READY_MS;
    const elapsed = Date.now() - overlay.startedAt;
    const wait = Math.max(0, minMs - elapsed);
    const hideId = window.setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOverlay((current) => (current?.key === location.key ? null : current));
        });
      });
    }, wait);

    return () => {
      window.clearTimeout(hideId);
    };
  }, [overlay, contentReady, location.key, reduceMotion]);

  useEffect(() => {
    if (!overlay) {
      return undefined;
    }
    if (overlay.key !== location.key) {
      return undefined;
    }
    const safetyId = window.setTimeout(() => {
      setOverlay(null);
    }, OVERLAY_SAFETY_MS);
    return () => {
      window.clearTimeout(safetyId);
    };
  }, [overlay, location.key]);

  return (
    <AnimatePresence>
      {overlay != null ? (
        <AppLoadingOverlay
          key={overlay.key}
          ariaLabel="Loading page"
          caption="Just a moment"
          zIndexClass="z-[220]"
          instantEnter
        />
      ) : null}
    </AnimatePresence>
  );
}

export default NavigationProgress;
