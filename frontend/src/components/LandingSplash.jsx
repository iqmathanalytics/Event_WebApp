import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import {
  beginHomeBootHandoff,
  fadeHomeBootSplash,
  getHomeBootSplashLogo,
  getHomeBootSplashRoot,
  hideHomeBootSplash,
  setHomeBootSplashCaption
} from "../utils/homeSplashPolicy";

const MIN_MS = 900;
const STALE_MAX_MS = 7000;
const MIN_MS_REDUCED = 400;
const STALE_MAX_MS_REDUCED = 4000;
const FADE_MS = 450;

/**
 * Controller only — the visible splash is #bmt-boot-splash in index.html.
 * React must not paint a second overlay or the first logo will flash.
 */
function LandingSplash({ busy, onRevealed, onExitComplete, headerLogoRef, startLogoFlight }) {
  const reduceMotion = useReducedMotion();
  const minMs = reduceMotion ? MIN_MS_REDUCED : MIN_MS;
  const staleMaxMs = reduceMotion ? STALE_MAX_MS_REDUCED : STALE_MAX_MS;

  const busyRef = useRef(busy);
  const startedAtRef = useRef(Date.now());
  const handoffStartedRef = useRef(false);
  const finishedRef = useRef(false);
  const headerLogoRefBox = useRef(headerLogoRef);
  const startLogoFlightRef = useRef(startLogoFlight);
  const onRevealedRef = useRef(onRevealed);
  const onExitCompleteRef = useRef(onExitComplete);
  busyRef.current = busy;
  headerLogoRefBox.current = headerLogoRef;
  startLogoFlightRef.current = startLogoFlight;
  onRevealedRef.current = onRevealed;
  onExitCompleteRef.current = onExitComplete;

  useEffect(() => {
    setHomeBootSplashCaption(busy ? "Loading events, deals & creators…" : "Almost there…");
  }, [busy]);

  const dismissSplash = useCallback(
    (force = false) => {
      if (handoffStartedRef.current) {
        return;
      }
      if (!force && busyRef.current) {
        return;
      }
      handoffStartedRef.current = true;
      onRevealedRef.current?.();

      const finish = () => {
        if (finishedRef.current) {
          return;
        }
        finishedRef.current = true;
        hideHomeBootSplash();
        onExitCompleteRef.current?.();
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const fromEl = getHomeBootSplashLogo();
          const toEl = headerLogoRefBox.current?.current;
          const from = fromEl?.getBoundingClientRect?.();
          const to = toEl?.getBoundingClientRect?.();
          const fly =
            !reduceMotion &&
            from &&
            to &&
            from.width > 2 &&
            to.width > 2 &&
            typeof startLogoFlightRef.current === "function";

          if (fly) {
            beginHomeBootHandoff();
            startLogoFlightRef.current({ from, to });
          }

          fadeHomeBootSplash();
          const root = getHomeBootSplashRoot();
          if (root) {
            const onFade = (event) => {
              if (event.propertyName && event.propertyName !== "opacity") {
                return;
              }
              root.removeEventListener("transitionend", onFade);
              finish();
            };
            root.addEventListener("transitionend", onFade);
            window.setTimeout(finish, FADE_MS + 80);
          } else {
            finish();
          }
        });
      });
    },
    [reduceMotion]
  );

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed >= staleMaxMs) {
        dismissSplash(true);
        return;
      }
      if (!busyRef.current && elapsed >= minMs) {
        dismissSplash(false);
      }
    };

    const id = window.setInterval(tick, 48);
    tick();
    return () => window.clearInterval(id);
  }, [minMs, staleMaxMs, dismissSplash]);

  return null;
}

export default LandingSplash;
