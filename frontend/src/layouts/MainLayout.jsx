import { useCallback, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import LogoFlightOverlay from "../components/LogoFlightOverlay";

function MainLayout() {
  const [homeSearchSummary, setHomeSearchSummary] = useState({
    cityLabel: "Anywhere",
    dateLabel: "Any date",
    categoryLabel: "Any category",
    priceLabel: "Any price"
  });
  const [isHeroSearchVisible, setIsHeroSearchVisible] = useState(true);
  /** Increments when splash → header flight completes; navbar plays a one-shot landing celebration. */
  const [headerLogoCelebrateKey, setHeaderLogoCelebrateKey] = useState(0);
  /** `splash` = intro visible; `exit` = post-reveal until flight/ready; `ready` = normal header logo */
  const [brandLogoPhase, setBrandLogoPhase] = useState("ready");
  const headerLogoRef = useRef(null);
  const [logoFlight, setLogoFlight] = useState(null);
  const flightStartedRef = useRef(false);
  const flightLockRef = useRef(false);

  const startLogoFlight = useCallback((payload) => {
    const pick = (r) =>
      r && typeof r.left === "number" && r.width > 2
        ? { left: r.left, top: r.top, width: r.width, height: r.height }
        : null;
    const from = pick(payload?.from);
    const to = pick(payload?.to);
    if (from && to && !flightLockRef.current) {
      flightLockRef.current = true;
      flightStartedRef.current = true;
      setLogoFlight({ from, to });
    }
  }, []);

  const onSplashExitComplete = useCallback(() => {
    if (!flightStartedRef.current) {
      setBrandLogoPhase("ready");
    }
  }, []);

  const onFlightMoveComplete = useCallback(() => {
    setBrandLogoPhase("settling");
  }, []);

  const onFlightFadeComplete = useCallback(() => {
    flightStartedRef.current = false;
    flightLockRef.current = false;
    setLogoFlight(null);
    setBrandLogoPhase("ready");
    setHeaderLogoCelebrateKey((k) => k + 1);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <Navbar
        homeSearchSummary={homeSearchSummary}
        isHeroSearchVisible={isHeroSearchVisible}
        brandLogoPhase={brandLogoPhase}
        headerLogoRef={headerLogoRef}
        logoFlightActive={Boolean(logoFlight)}
        headerLogoCelebrateKey={headerLogoCelebrateKey}
      />
      <main className="container-page mobile-safe-main flex-1 pt-20 pb-8 sm:pt-24 sm:pb-10">
        <Outlet
          context={{
            setHomeSearchSummary,
            setIsHeroSearchVisible,
            setBrandLogoPhase,
            headerLogoRef,
            startLogoFlight,
            onSplashExitComplete
          }}
        />
      </main>
      <Footer />
      <MobileBottomNav />
      <LogoFlightOverlay
        flight={logoFlight}
        onMoveComplete={onFlightMoveComplete}
        onFadeComplete={onFlightFadeComplete}
      />
    </div>
  );
}

export default MainLayout;
