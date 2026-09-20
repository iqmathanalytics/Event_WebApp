import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import LandingSplash from "../components/LandingSplash";
import { HomeEntryContext } from "../context/HomeEntryContext";
import { hideHomeBootSplash, markHomeSplashConsumed, shouldShowHomeSplash } from "../utils/homeSplashPolicy";

const HomePage = lazy(() => import("./HomePage"));

/**
 * Eager shell for `/` so the logo splash paints in the first React commit — before the lazy HomePage chunk.
 * Suspense fallback is empty; the splash covers the screen (no "Loading..." flash).
 */
export default function HomeRoute() {
  const { setBrandLogoPhase, headerLogoRef, startLogoFlight, onSplashExitComplete } = useOutletContext() || {};
  const [showEntranceSplash] = useState(() => shouldShowHomeSplash());
  const [homeChunkReady, setHomeChunkReady] = useState(!showEntranceSplash);
  const [homeDataBusy, setHomeDataBusy] = useState(showEntranceSplash);
  const [landingRevealed, setLandingRevealed] = useState(!showEntranceSplash);

  useLayoutEffect(() => {
    if (!showEntranceSplash) {
      hideHomeBootSplash();
    }
  }, [showEntranceSplash]);

  useEffect(() => {
    if (!setBrandLogoPhase) {
      return undefined;
    }
    if (showEntranceSplash) {
      setBrandLogoPhase("splash");
    } else {
      setBrandLogoPhase("ready");
    }
    return () => setBrandLogoPhase("ready");
  }, [showEntranceSplash, setBrandLogoPhase]);

  const splashBusy = showEntranceSplash && (!homeChunkReady || homeDataBusy);

  const onLandingRevealed = useCallback(() => {
    markHomeSplashConsumed();
    setLandingRevealed(true);
    setBrandLogoPhase?.("exit");
  }, [setBrandLogoPhase]);

  const value = useMemo(
    () => ({
      showEntranceSplash,
      landingRevealed,
      setHomeChunkReady,
      setHomeDataBusy
    }),
    [showEntranceSplash, landingRevealed]
  );

  return (
    <HomeEntryContext.Provider value={value}>
      {showEntranceSplash ? (
        <LandingSplash
          busy={splashBusy}
          onRevealed={onLandingRevealed}
          onExitComplete={onSplashExitComplete}
          headerLogoRef={headerLogoRef}
          startLogoFlight={startLogoFlight}
        />
      ) : null}
      <Suspense fallback={null}>
        <HomePage />
      </Suspense>
    </HomeEntryContext.Provider>
  );
}
