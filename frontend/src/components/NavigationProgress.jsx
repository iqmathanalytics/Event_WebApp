import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { useRouteContentReadyContext } from "../context/RouteContentReadyContext";
import AppLoadingOverlay from "./AppLoadingOverlay";

const MIN_OVERLAY_AFTER_READY_MS = 280;
const MIN_OVERLAY_AFTER_READY_MS_REDUCED = 180;
const OVERLAY_SAFETY_MS = 12000;

function pathIsHome(p) {
  return p === "/" || p === "";
}

/**
 * Full-page route transition overlay.
 * - Shown for any navigation whose destination is NOT the landing page (/).
 * - Hidden when navigating *to* home (any page → /), so returning to the landing page stays instant.
 * - Dismisses after the destination route signals readiness (data + paint), plus a short minimum hold.
 * - z-index above dashboard modals so it is visible when leaving popups (e.g. hosting workspace).
 */
function NavigationProgress() {
  const location = useLocation();
  const { contentReady } = useRouteContentReadyContext();
  const reduceMotion = useReducedMotion();
  const firstPaint = useRef(true);
  const [overlay, setOverlay] = useState(null);

  /** useLayoutEffect: run before paint so the dimmer mounts before the new route is visible. */
  useLayoutEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false;
      return undefined;
    }

    const to = location.pathname;

    if (pathIsHome(to)) {
      setOverlay(null);
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
