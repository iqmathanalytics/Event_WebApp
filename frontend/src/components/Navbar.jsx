import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useAnimation, useReducedMotion } from "framer-motion";
import { FiCheck, FiChevronDown, FiMapPin, FiMenu, FiSearch, FiUser, FiX } from "react-icons/fi";
import useAuth from "../hooks/useAuth";
import useCityFilter from "../hooks/useCityFilter";
import YayUserGreeting from "./YayUserGreeting";
import BrandHeroLogo from "./BrandHeroLogo";

const navItems = [
  { to: "/events", label: "Events" },
  { to: "/influencers", label: "Influencers" },
  { to: "/deals", label: "Deals" }
];

function Navbar({
  homeSearchSummary = {
    cityLabel: "Anywhere",
    dateLabel: "Any date",
    categoryLabel: "Any category",
    priceLabel: "Any price"
  },
  isHeroSearchVisible = true,
  brandLogoPhase = "ready",
  headerLogoRef = null,
  logoFlightActive = false,
  headerLogoCelebrateKey = 0
}) {
  const { user, isAuthenticated, isAdmin, isOrganizer, logout } = useAuth();
  const { cities, selectedCity, selectedCityLabel, setSelectedCity } = useCityFilter();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);
  const [cityMenuQuery, setCityMenuQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const mobileMenuBtnRef = useRef(null);
  const mobileMenuPanelRef = useRef(null);
  const mobileMenuId = useId();
  const reduceMotion = useReducedMotion();
  const headerLogoCelebrateControls = useAnimation();

  useEffect(() => {
    if (!headerLogoCelebrateKey) {
      return undefined;
    }
    const landEase = [0.19, 1, 0.22, 1];
    const landTimes = [0, 0.1, 0.22, 0.38, 0.54, 0.74, 1];

    if (reduceMotion) {
      headerLogoCelebrateControls.start({
        scale: [1, 1.028, 1],
        filter: [
          "brightness(1) saturate(1)",
          "brightness(1.07) saturate(1.04)",
          "brightness(1) saturate(1)"
        ],
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], times: [0, 0.45, 1] }
      });
      return undefined;
    }

    headerLogoCelebrateControls.start({
      rotate: [0, -7.5, 6.5, -4.5, 3.2, -1.6, 0],
      scale: [1, 1.1, 0.95, 1.05, 1.025, 1.008, 1],
      skewX: [0, -2.4, 2.1, -1.3, 0.9, -0.35, 0],
      filter: [
        "brightness(1) saturate(1) drop-shadow(0 0 0px transparent)",
        "brightness(1.18) saturate(1.14) drop-shadow(0 0 20px rgba(251,113,133,0.58))",
        "brightness(1.1) saturate(1.08) drop-shadow(0 0 14px rgba(129,140,248,0.52))",
        "brightness(1.14) saturate(1.12) drop-shadow(0 0 22px rgba(244,244,255,0.42))",
        "brightness(1.06) saturate(1.05) drop-shadow(0 0 10px rgba(255,255,255,0.28))",
        "brightness(1.03) saturate(1.02) drop-shadow(0 0 6px rgba(167,139,250,0.22))",
        "brightness(1) saturate(1) drop-shadow(0 0 0px transparent)"
      ],
      transition: { duration: 1.08, ease: landEase, times: landTimes }
    });
  }, [headerLogoCelebrateKey, headerLogoCelebrateControls, reduceMotion]);

  useEffect(() => {
    let rafId = null;
    const onScroll = () => {
      if (rafId) {
        return;
      }
      rafId = window.requestAnimationFrame(() => {
        const next = (window.scrollY || 0) > 12;
        setIsScrolled((prev) => (prev === next ? prev : next));
        rafId = null;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const onDocClick = () => setIsCityMenuOpen(false);
    if (isCityMenuOpen) {
      window.addEventListener("click", onDocClick);
    }
    return () => window.removeEventListener("click", onDocClick);
  }, [isCityMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
      }
    };
    const onPointerDown = (e) => {
      const t = e.target;
      if (mobileMenuBtnRef.current?.contains(t)) {
        return;
      }
      if (mobileMenuPanelRef.current?.contains(t)) {
        return;
      }
      setIsMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [isMenuOpen]);

  const isHomePage = location.pathname === "/";
  const showCompactSearch = isHomePage && !isHeroSearchVisible;
  const filteredCities = useMemo(() => {
    const query = cityMenuQuery.trim().toLowerCase();
    if (!query) {
      return cities;
    }
    return cities.filter((city) => city.label.toLowerCase().includes(query));
  }, [cityMenuQuery, cities]);

  const headerLogoEntranceActive = !(
    brandLogoPhase === "splash" ||
    brandLogoPhase === "exit" ||
    (logoFlightActive && brandLogoPhase !== "settling")
  );

  const reopenHeroSearch = (panel = "where") => {
    const target = document.getElementById("home-hero-search-anchor");
    const navbarOffset = 108;
    if (target) {
      const targetTop = Math.max(0, window.scrollY + target.getBoundingClientRect().top - navbarOffset);
      window.scrollTo({ top: targetTop, behavior: "smooth" });
    } else {
      window.scrollTo({ top: navbarOffset, behavior: "smooth" });
    }
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(`open-home-${panel}-search`));
    }, 360);
  };

  return (
    <motion.header
      animate={{
        backgroundColor: "rgba(255,255,255,0.98)",
        boxShadow: isScrolled ? "0 8px 24px rgba(15, 23, 42, 0.08)" : "0 0 0 rgba(15,23,42,0)"
      }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 backdrop-blur-md"
    >
      <div className="container-page flex h-16 items-center justify-between gap-3 sm:h-20">
        <Link to="/" className="flex items-center gap-2.5 text-slate-900">
          <motion.span
            className="relative inline-flex origin-[center_62%] will-change-[transform,filter]"
            animate={headerLogoCelebrateControls}
            initial={{ rotate: 0, scale: 1, skewX: 0, filter: "brightness(1) saturate(1)" }}
          >
            {headerLogoCelebrateKey > 0 && !reduceMotion ? (
              <motion.div
                key={headerLogoCelebrateKey}
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-[58%] -z-10 h-[min(200px,55vw)] w-[min(200px,55vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(251,113,133,0.45)_0%,rgba(167,139,250,0.28)_42%,transparent_68%)] blur-2xl"
                initial={{ opacity: 0, scale: 0.45 }}
                animate={{
                  opacity: [0, 0.95, 0.5, 0.15, 0],
                  scale: [0.45, 1.15, 1.05, 1, 0.92]
                }}
                transition={{ duration: 1.08, ease: [0.19, 1, 0.22, 1], times: [0, 0.18, 0.42, 0.68, 1] }}
              />
            ) : null}
            <motion.img
              ref={headerLogoRef}
              src="/branding/yay-tickets-logo.png"
              alt="Yay! Eventz"
              loading="eager"
              className="h-8 w-auto max-w-[128px] object-contain sm:h-9 sm:max-w-[140px]"
              initial={false}
              animate={{
                opacity: headerLogoEntranceActive ? 1 : 0
              }}
              transition={{
                opacity: {
                  duration: brandLogoPhase === "settling" ? 0.28 : 0.16,
                  ease: [0.22, 1, 0.36, 1]
                }
              }}
            />
          </motion.span>
          <motion.div
            initial={false}
            animate={{
              opacity: headerLogoEntranceActive ? 1 : 0
            }}
            transition={{
              opacity: {
                duration: brandLogoPhase === "settling" ? 0.28 : 0.16,
                ease: [0.22, 1, 0.36, 1]
              }
            }}
          >
            <BrandHeroLogo className="navbar-brand-wordmark" entranceActive={headerLogoEntranceActive} />
          </motion.div>
        </Link>

        <nav className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm lg:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCityMenuQuery("");
                setIsCityMenuOpen((prev) => !prev);
              }}
              className="inline-flex w-[180px] items-center justify-between gap-2 rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:shadow"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <FiMapPin className="text-slate-500" />
                <span className="truncate">{selectedCityLabel}</span>
              </span>
              <FiChevronDown className={`text-slate-500 transition ${isCityMenuOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {isCityMenuOpen ? (
                <motion.div
                  onClick={(e) => e.stopPropagation()}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 top-[calc(100%+10px)] z-30 w-[180px] rounded-2xl border border-slate-200 bg-white p-2 shadow-soft"
                >
                  <label className="mb-2 block">
                    <span className="sr-only">Search cities</span>
                    <input
                      type="text"
                      value={cityMenuQuery}
                      onChange={(e) => setCityMenuQuery(e.target.value)}
                      placeholder="Search cities"
                      className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-sm text-slate-800 caret-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-300"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCity("");
                      setIsCityMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FiMapPin className="text-slate-400" />
                      All Cities
                    </span>
                    {!selectedCity ? <FiCheck className="text-brand-600" /> : null}
                  </button>
                  <div className="hide-scrollbar mt-1 max-h-64 space-y-0.5 overflow-y-auto pr-1">
                    {filteredCities.map((city) => (
                      <button
                        key={city.value}
                        type="button"
                        onClick={() => {
                          setSelectedCity(city.value);
                          setIsCityMenuOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        <span className="inline-flex items-center gap-2">
                          <FiMapPin className="text-slate-400" />
                          {city.label}
                        </span>
                        {selectedCity === city.value ? <FiCheck className="text-brand-600" /> : null}
                      </button>
                    ))}
                    {filteredCities.length === 0 ? (
                      <p className="px-2.5 py-2 text-sm text-slate-500">No cities found.</p>
                    ) : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {isAuthenticated ? (
            <div className="flex min-w-0 items-center gap-2">
              <div className="hidden min-w-0 max-w-[min(15rem,30vw)] items-center rounded-full border border-slate-200/90 bg-gradient-to-r from-white via-white to-slate-50 py-1.5 pl-3 pr-2.5 shadow-sm ring-1 ring-slate-100/80 lg:flex">
                <YayUserGreeting name={user?.name} variant="light" size="sm" className="min-w-0" />
              </div>
              <Link
                to={isAdmin ? "/dashboard/admin" : "/dashboard/user"}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        <button
          ref={mobileMenuBtnRef}
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-expanded={isMenuOpen}
          aria-controls={mobileMenuId}
          className="relative z-[60] grid h-10 w-10 place-content-center rounded-full border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
          aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {isMenuOpen ? <FiX size={18} /> : <FiMenu size={18} />}
        </button>
      </div>

      <motion.div
        initial={false}
        animate={{
          opacity: showCompactSearch ? 1 : 0,
          y: showCompactSearch ? 0 : -8,
          scale: showCompactSearch ? 1 : 0.97
        }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute inset-x-0 top-full mt-[10px]"
      >
        <div className="container-page flex justify-center max-lg:px-0">
          <div
            className={`relative flex h-12 w-fit max-w-[88vw] items-center gap-1.5 px-1 py-1 ${
              showCompactSearch ? "pointer-events-auto" : "pointer-events-none"
            }`}
            style={{ willChange: "transform, opacity" }}
          >
            <div className="pointer-events-none absolute inset-0 rounded-full border border-slate-200 bg-white shadow-lg ring-1 ring-black/5" />
            <div className="relative flex h-full min-w-0 items-center gap-1.5 pr-0.5">
              <button
                type="button"
                onClick={() => reopenHeroSearch("where")}
                className="min-w-0 truncate rounded-full px-2.5 py-1 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                {homeSearchSummary.cityLabel}
              </button>
              <span className="shrink-0 text-slate-300">|</span>
              <button
                type="button"
                onClick={() => reopenHeroSearch("when")}
                className="min-w-0 truncate rounded-full px-1.5 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                {homeSearchSummary.dateLabel}
              </button>
              <span className="shrink-0 text-slate-300">|</span>
              <button
                type="button"
                onClick={() => reopenHeroSearch("category")}
                className="min-w-0 truncate rounded-full px-1.5 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                {homeSearchSummary.categoryLabel}
              </button>
              <button
                type="button"
                onClick={() => reopenHeroSearch("where")}
                className="grid h-8 w-8 shrink-0 place-content-center rounded-full bg-rose-500 text-white shadow-sm"
                aria-label="Open home search"
              >
                <FiSearch size={14} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isMenuOpen ? (
          <motion.div
            key="mobile-menu-root"
            className="fixed inset-x-0 bottom-0 top-16 z-[55] sm:top-20 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.button
              type="button"
              aria-label="Dismiss menu"
              tabIndex={-1}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />
            <div className="relative z-10 flex justify-center px-2.5 pt-2">
              <motion.div
                ref={mobileMenuPanelRef}
                id={mobileMenuId}
                role="dialog"
                aria-modal="true"
                aria-label="Quick menu"
                initial={{ opacity: 0, y: -18, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.96 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto w-full max-w-[25.5rem] origin-top overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/25 ring-1 ring-slate-900/[0.06] sm:max-w-[26.5rem]"
              >
                <div className="rounded-t-[1.35rem] border-b border-slate-800/30 bg-slate-900 px-3 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Navigation</p>
                      <p className="text-xl font-bold leading-none text-white">Quick Menu</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMenuOpen(false)}
                      className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
                    >
                      Close
                    </button>
                  </div>

                  <nav className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white/10 p-1.5">
                    {navItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setIsMenuOpen(false)}
                        className={({ isActive }) =>
                          `rounded-lg px-3 py-2 text-center text-xs font-semibold ${
                            isActive ? "bg-fuchsia-500 text-white" : "text-slate-200"
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </nav>
                </div>
                <div className="hide-scrollbar max-h-[70vh] space-y-3 overflow-y-auto p-3">
                  {isAuthenticated ? (
                    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 text-white shadow-md ring-1 ring-white/10">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">Signed in</p>
                      <div className="mt-1.5">
                        <YayUserGreeting name={user?.name} variant="dark" size="sm" />
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">City Filter</p>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                        {selectedCity ? "1 selected" : "All selected"}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={cityMenuQuery}
                      onChange={(e) => setCityMenuQuery(e.target.value)}
                      placeholder="Search cities"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 caret-slate-900 placeholder:text-slate-400 outline-none"
                    />
                    <div className="hide-scrollbar max-h-[132px] space-y-1 overflow-y-auto pr-1">
                      <button
                        type="button"
                        onClick={() => setSelectedCity("")}
                        className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                          !selectedCity
                            ? "border-fuchsia-200 bg-fuchsia-50 font-semibold text-fuchsia-700"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2.5">
                          <span className="grid h-7 w-7 place-content-center rounded-md bg-white text-fuchsia-500">
                            <FiMapPin />
                          </span>
                          <span>
                            <p className="font-semibold">All Cities</p>
                            <p className="text-[10px] text-slate-500">Show listings from all cities</p>
                          </span>
                        </span>
                      </button>
                      {filteredCities.map((city) => (
                        <button
                          key={city.value}
                          type="button"
                          onClick={() => setSelectedCity(city.value)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-xs ${
                            selectedCity === city.value
                              ? "border-fuchsia-200 bg-fuchsia-50 font-semibold text-fuchsia-700"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="inline-flex items-center gap-2.5">
                            <span className="grid h-7 w-7 place-content-center rounded-md bg-slate-100 text-slate-500">
                              <FiMapPin />
                            </span>
                            <span>
                              <p className="font-semibold">{city.label}</p>
                              <p className="text-[10px] text-slate-500">Popular destination</p>
                            </span>
                          </span>
                        </button>
                      ))}
                      {filteredCities.length === 0 ? <p className="px-1 text-xs text-slate-500">No cities found.</p> : null}
                    </div>
                  </div>

                  {isAuthenticated ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to={isAdmin ? "/dashboard/admin" : "/dashboard/user"}
                        onClick={() => setIsMenuOpen(false)}
                        className="rounded-lg border border-slate-300 px-3.5 py-2 text-center text-xs font-semibold text-slate-700"
                      >
                        Dashboard
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setIsMenuOpen(false);
                        }}
                        className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <Link
                        to="/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white"
                      >
                        <FiUser />
                        Sign In
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}

export default Navbar;
