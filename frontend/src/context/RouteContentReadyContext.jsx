import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const RouteContentReadyContext = createContext(null);

/**
 * Tracks whether the *current* route has explicitly signaled that its UI is ready to show.
 * On each navigation, `readyKey` stays at the previous key until the new page calls
 * `signalContentReady`, so `readyKey === routeKey` becomes false without a separate reset
 * effect (which previously raced child effects and cleared a valid ready state).
 */
export function RouteContentReadyProvider({ children }) {
  const location = useLocation();
  const routeKey = location.key;
  const [readyKey, setReadyKey] = useState(() => routeKey);

  const signalContentReady = useCallback(() => {
    setReadyKey(routeKey);
  }, [routeKey]);

  const contentReady = readyKey === routeKey;

  const value = useMemo(
    () => ({ contentReady, signalContentReady, routeKey }),
    [contentReady, signalContentReady, routeKey]
  );

  return <RouteContentReadyContext.Provider value={value}>{children}</RouteContentReadyContext.Provider>;
}

export function useRouteContentReadyContext() {
  const ctx = useContext(RouteContentReadyContext);
  if (!ctx) {
    throw new Error("useRouteContentReadyContext must be used within RouteContentReadyProvider");
  }
  return ctx;
}

function waitForFonts() {
  const fonts = document.fonts;
  if (!fonts || typeof fonts.ready?.then !== "function") {
    return Promise.resolve();
  }
  return Promise.race([fonts.ready, new Promise((resolve) => setTimeout(resolve, 2000))]);
}

/** Cap so a broken link or lazy cliff does not block the overlay indefinitely. */
const MAIN_IMAGE_WAIT_CAP_MS = 8000;

function collectMainImages() {
  const main = document.querySelector("main");
  if (!main) {
    return [];
  }
  return Array.from(main.querySelectorAll("img[src]")).filter((img) => {
    if (img.closest("[data-route-splash-ignore]") || img.hasAttribute("data-route-splash-ignore")) {
      return false;
    }
    const src = String(img.getAttribute("src") || "").trim();
    return Boolean(src);
  });
}

/** Eager images + lazy images that are in/near the viewport (skip off-screen lazy grid cards). */
function imageShouldGateSplash(img) {
  if (img.complete) {
    return false;
  }
  if (img.loading !== "lazy") {
    return true;
  }
  const r = img.getBoundingClientRect();
  const vh = window.innerHeight || 0;
  const vw = window.innerWidth || 0;
  const margin = 240;
  return r.bottom >= -margin && r.top <= vh + margin && r.right >= -margin && r.left <= vw + margin;
}

/**
 * Resolves when relevant `<main>` images have fired load/error (navigation splash stays up until above-fold assets settle).
 */
function waitForMainContentImages() {
  const pending = collectMainImages().filter((img) => imageShouldGateSplash(img));
  if (pending.length === 0) {
    return Promise.resolve();
  }
  const perImage = pending.map(
    (img) =>
      new Promise((resolve) => {
        const done = () => {
          img.removeEventListener("load", done);
          img.removeEventListener("error", done);
          resolve();
        };
        img.addEventListener("load", done);
        img.addEventListener("error", done);
      })
  );
  return Promise.race([Promise.all(perImage), new Promise((resolve) => setTimeout(resolve, MAIN_IMAGE_WAIT_CAP_MS))]);
}

/** Best-effort decode so the overlay does not lift a frame before the GPU has the bitmap. */
function decodeMainContentImages() {
  const imgs = collectMainImages().filter((img) => img.complete && typeof img.decode === "function");
  if (imgs.length === 0) {
    return Promise.resolve();
  }
  return Promise.all(imgs.map((img) => img.decode().catch(() => undefined)));
}

/**
 * After `loading` is false, waits for layout, several animation frames, web fonts,
 * and images inside `<main>` before marking the route ready.
 */
export function useRouteContentReady(loading) {
  const { signalContentReady, routeKey } = useRouteContentReadyContext();

  useLayoutEffect(() => {
    if (loading) {
      return undefined;
    }

    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;
    let raf3 = 0;

    const finish = () => {
      if (cancelled) {
        return;
      }
      signalContentReady();
    };

    const runAfterPaint = () => {
      Promise.all([waitForFonts(), waitForMainContentImages()])
        .then(() => decodeMainContentImages())
        .then(() => {
          if (cancelled) {
            return;
          }
          // New `<img>` nodes can land after data resolves in the same tick; one more frame catches late mounts.
          requestAnimationFrame(() => {
            if (cancelled) {
              return;
            }
            waitForMainContentImages()
              .then(() => decodeMainContentImages())
              .then(() => {
                if (!cancelled) {
                  queueMicrotask(finish);
                }
              });
          });
        });
    };

    // Layout has run; wait for paint + one more frame so list/card DOM and motion layers can commit.
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        raf3 = requestAnimationFrame(runAfterPaint);
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      cancelAnimationFrame(raf3);
    };
  }, [loading, routeKey, signalContentReady]);
}
