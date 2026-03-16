import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiCheck, FiChevronDown, FiMapPin, FiMenu, FiSearch, FiShield, FiUser, FiX } from "react-icons/fi";
import useAuth from "../hooks/useAuth";
import { cities } from "../utils/filterOptions";
import useCityFilter from "../hooks/useCityFilter";

const navItems = [
  { to: "/events", label: "Events" },
  { to: "/influencers", label: "Influencers" },
  { to: "/deals", label: "Deals" },
  { to: "/services", label: "Services" }
];

function Navbar({
  homeSearchSummary = {
    cityLabel: "Anywhere",
    dateLabel: "Any date",
    categoryLabel: "Any category",
    priceLabel: "Any price"
  },
  isHeroSearchVisible = true
}) {
  const { user, isAuthenticated, isAdmin, isOrganizer, logout } = useAuth();
  const { selectedCity, selectedCityLabel, setSelectedCity } = useCityFilter();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCityMenuOpen, setIsCityMenuOpen] = useState(false);
  const [cityMenuQuery, setCityMenuQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);

  const avatarLabel = useMemo(() => {
    if (!user?.name) {
      return "U";
    }
    return user.name.trim().charAt(0).toUpperCase();
  }, [user?.name]);

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

  const isHomePage = location.pathname === "/";
  const showCompactSearch = isHomePage && !isHeroSearchVisible;
  const compactSummary = `${homeSearchSummary.cityLabel} • ${homeSearchSummary.dateLabel} • ${homeSearchSummary.categoryLabel}`;
  const filteredCities = useMemo(() => {
    const query = cityMenuQuery.trim().toLowerCase();
    if (!query) {
      return cities;
    }
    return cities.filter((city) => city.label.toLowerCase().includes(query));
  }, [cityMenuQuery]);

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
      <div className="container-page flex h-20 items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 text-sm font-extrabold tracking-wide text-brand-600 sm:text-base">
          <span className="grid h-8 w-8 place-content-center rounded-full bg-brand-50 text-brand-600">C</span>
          <span className="hidden sm:inline">City Events Hub</span>
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
            <div className="flex items-center gap-2">
              <Link
                to={isAdmin ? "/dashboard/admin" : isOrganizer ? "/dashboard/organizer" : "/dashboard/user"}
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
              <div className="grid h-9 w-9 place-content-center rounded-full border border-slate-300 bg-white text-sm font-bold text-slate-700">
                {avatarLabel}
              </div>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Sign In
              </Link>
              <Link
                to="/staff-login"
                className="inline-flex items-center gap-1 rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                <FiShield />
                Staff Portal
              </Link>
              <Link
                to="/register"
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Create Account
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="grid h-10 w-10 place-content-center rounded-full border border-slate-300 text-slate-700 lg:hidden"
          aria-label="Toggle navigation menu"
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
        <div className="container-page flex justify-center">
          <div
            className={`relative hidden h-12 w-fit max-w-[88vw] items-center gap-2 px-2 py-1 lg:inline-flex ${
              showCompactSearch ? "pointer-events-auto" : "pointer-events-none"
            }`}
            style={{ willChange: "transform, opacity" }}
          >
            <div className="pointer-events-none absolute inset-0 rounded-full border border-slate-200 bg-white shadow-lg ring-1 ring-black/5" />
            <div className="relative flex h-full items-center gap-2 pr-1">
              <button
                type="button"
                onClick={() => reopenHeroSearch("where")}
                className="truncate rounded-full px-3 py-1 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                {homeSearchSummary.cityLabel}
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => reopenHeroSearch("when")}
                className="truncate rounded-full px-2 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                {homeSearchSummary.dateLabel}
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => reopenHeroSearch("category")}
                className="truncate rounded-full px-2 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                {homeSearchSummary.categoryLabel}
              </button>
              <button
                type="button"
                onClick={() => reopenHeroSearch("where")}
                className="grid h-8 w-8 place-content-center rounded-full bg-rose-500 text-white shadow-sm"
                aria-label="Open home search"
              >
                <FiSearch size={14} />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => reopenHeroSearch("where")}
            className={`relative inline-flex h-11 w-[min(92vw,28rem)] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-lg ring-1 ring-black/5 lg:hidden ${
              showCompactSearch ? "pointer-events-auto" : "pointer-events-none"
            }`}
            style={{ willChange: "transform, opacity" }}
          >
            <FiSearch className="shrink-0 text-slate-600" />
            <span className="truncate">{compactSummary}</span>
          </button>
        </div>
      </motion.div>

      {isMenuOpen ? (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="container-page space-y-3 py-4">
            <nav className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl border px-3 py-2 text-center text-sm font-medium ${
                      isActive ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-700"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">City Filter</p>
              <input
                type="text"
                value={cityMenuQuery}
                onChange={(e) => setCityMenuQuery(e.target.value)}
                placeholder="Search cities"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 caret-slate-900 placeholder:text-slate-400 outline-none"
              />
              <button
                type="button"
                onClick={() => setSelectedCity("")}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                  !selectedCity ? "bg-white font-semibold text-slate-900" : "text-slate-700 hover:bg-white"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <FiMapPin className="text-slate-400" />
                  All Cities
                </span>
              </button>
              {filteredCities.map((city) => (
                <button
                  key={city.value}
                  type="button"
                  onClick={() => setSelectedCity(city.value)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                    selectedCity === city.value
                      ? "bg-white font-semibold text-slate-900"
                      : "text-slate-700 hover:bg-white"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <FiMapPin className="text-slate-400" />
                    {city.label}
                  </span>
                </button>
              ))}
              {filteredCities.length === 0 ? <p className="px-1 text-sm text-slate-500">No cities found.</p> : null}
            </div>

            {isAuthenticated ? (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to={isAdmin ? "/dashboard/admin" : isOrganizer ? "/dashboard/organizer" : "/dashboard/user"}
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="grid gap-2">
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  <FiUser />
                  Sign In
                </Link>
                <Link
                  to="/staff-login"
                  onClick={() => setIsMenuOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900"
                >
                  <FiShield />
                  Staff Portal
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </motion.header>
  );
}

export default Navbar;
