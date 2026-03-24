import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FiCalendar, FiChevronDown, FiMapPin, FiNavigation, FiRotateCcw, FiSearch, FiSliders, FiTag } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { categories } from "../utils/filterOptions";
import useCityFilter from "../hooks/useCityFilter";
import AirbnbDatePickerPanel from "./AirbnbDatePickerPanel";
import { formatDateUS } from "../utils/format";

function DiscoverySearchBar({ onCriteriaChange }) {
  const navigate = useNavigate();
  const { cities, selectedCity, setSelectedCity } = useCityFilter();
  const containerRef = useRef(null);
  const whereButtonRef = useRef(null);
  const whenButtonRef = useRef(null);
  const categoryButtonRef = useRef(null);
  const priceButtonRef = useRef(null);
  const priceInputRef = useRef(null);
  const panelRef = useRef(null);
  const [activePanel, setActivePanel] = useState(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 8 });
  const [city, setCity] = useState(selectedCity || "");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");

  const citySuggestions = useMemo(
    () =>
      cities.map((item, index) => ({
        ...item,
        subtitle: index % 2 === 0 ? "High booking activity this week" : "Great for weekend plans"
      })),
    [cities]
  );
  const categorySuggestions = useMemo(
    () =>
      categories.map((item, index) => ({
        ...item,
        subtitle: index % 2 === 0 ? "Trending this week" : "Popular with local audiences"
      })),
    [categories]
  );
  const filteredCitySuggestions = useMemo(() => {
    const query = cityQuery.trim().toLowerCase();
    if (!query) {
      return citySuggestions;
    }
    return citySuggestions.filter((item) => item.label.toLowerCase().includes(query));
  }, [cityQuery, citySuggestions]);
  const filteredCategorySuggestions = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    if (!query) {
      return categorySuggestions;
    }
    return categorySuggestions.filter((item) => item.label.toLowerCase().includes(query));
  }, [categoryQuery, categorySuggestions]);

  useEffect(() => {
    setCity(selectedCity || "");
  }, [selectedCity]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (event.target?.closest?.("[data-discovery-panel-portal='true']")) {
        return;
      }
      if (!containerRef.current?.contains(event.target)) {
        setActivePanel(null);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const updatePanelPosition = useCallback(() => {
    if (!activePanel || !["where", "when", "category", "price"].includes(activePanel)) {
      return;
    }
    const triggerMap = {
      where: whereButtonRef.current,
      when: whenButtonRef.current,
      category: categoryButtonRef.current,
      price: priceButtonRef.current
    };
    const trigger = triggerMap[activePanel];
    if (!trigger) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panelRef.current?.getBoundingClientRect();
    const fallbackWidth = activePanel === "when" ? 760 : activePanel === "price" ? 360 : 360;
    const fallbackHeight = activePanel === "when" ? 380 : activePanel === "price" ? 220 : 360;
    const panelWidth = panelRect?.width || fallbackWidth;
    const panelHeight = panelRect?.height || fallbackHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spacing = 8;
    const spacingWhenOpenUp = 3;

    let left = triggerRect.left;
    if (left + panelWidth > viewportWidth - spacing) {
      left = Math.max(spacing, viewportWidth - panelWidth - spacing);
    }

    const belowTop = triggerRect.bottom + spacing;
    const aboveTop = triggerRect.top - panelHeight - spacingWhenOpenUp;
    const shouldOpenUp = belowTop + panelHeight > viewportHeight - spacing && aboveTop >= spacing;
    const top = shouldOpenUp
      ? aboveTop
      : Math.min(belowTop, Math.max(spacing, viewportHeight - panelHeight - spacing));

    setPanelPosition({ top, left });
  }, [activePanel]);

  useLayoutEffect(() => {
    if (!activePanel || !["where", "when", "category", "price"].includes(activePanel)) {
      return;
    }

    updatePanelPosition();
    window.requestAnimationFrame(updatePanelPosition);

    const onViewportChange = () => updatePanelPosition();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [activePanel, updatePanelPosition]);

  useEffect(() => {
    const openPanel = (panel) => {
      setActivePanel(panel);
      window.setTimeout(() => {
        if (panel === "where") {
          whereButtonRef.current?.focus();
        } else if (panel === "when") {
          whenButtonRef.current?.focus();
        } else if (panel === "category") {
          categoryButtonRef.current?.focus();
        } else if (panel === "price") {
          priceInputRef.current?.focus();
        }
      }, 30);
    };

    const onOpenWhere = () => openPanel("where");
    const onOpenWhen = () => openPanel("when");
    const onOpenCategory = () => openPanel("category");
    const onOpenPrice = () => openPanel("price");
    window.addEventListener("open-home-where-search", onOpenWhere);
    window.addEventListener("open-home-when-search", onOpenWhen);
    window.addEventListener("open-home-category-search", onOpenCategory);
    window.addEventListener("open-home-price-search", onOpenPrice);
    return () => {
      window.removeEventListener("open-home-where-search", onOpenWhere);
      window.removeEventListener("open-home-when-search", onOpenWhen);
      window.removeEventListener("open-home-category-search", onOpenCategory);
      window.removeEventListener("open-home-price-search", onOpenPrice);
    };
  }, []);

  const onSearch = () => {
    const params = new URLSearchParams();
    if (city) {
      params.set("city", city);
    }
    if (date) {
      params.set("date", date);
    }
    if (category) {
      params.set("category", category);
    }
    if (priceMin) {
      params.set("price_min", priceMin);
    }
    if (priceMax) {
      params.set("price_max", priceMax);
    }
    const query = params.toString();
    navigate(query ? `/events?${query}` : "/events");
  };

  const selectedCityLabel = cities.find((item) => item.value === city)?.label || "All Cities";
  const selectedDateLabel = date ? formatDateUS(date) : "Any date";
  const selectedCategoryLabel = categories.find((item) => item.value === category)?.label || "Any category";
  const selectedPriceLabel =
    priceMin && priceMax
      ? `$${priceMin} - $${priceMax}`
      : priceMax
        ? `Up to $${priceMax}`
        : priceMin
          ? `From $${priceMin}`
          : "Any price";
  const activeFilterCount = [city, date, category, priceMin, priceMax].filter(Boolean).length;
  const fieldBase =
    "flex h-full min-h-[44px] w-full min-w-0 flex-col justify-center whitespace-nowrap overflow-hidden text-ellipsis rounded-xl px-2.5 py-1.5 text-left transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 sm:min-h-[48px] sm:rounded-2xl sm:px-3 sm:py-2 md:min-h-[54px] md:px-4 md:py-2.5";
  const desktopLabelClass = "text-xs font-semibold leading-none text-slate-900";
  const desktopValueClass = "truncate pt-0.5 text-sm leading-5 text-slate-600";
  const panelBase = "z-[220] rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl";

  useEffect(() => {
    onCriteriaChange?.({
      cityLabel: selectedCityLabel === "All Cities" ? "Anywhere" : selectedCityLabel,
      dateLabel: selectedDateLabel,
      categoryLabel: selectedCategoryLabel,
      priceLabel: selectedPriceLabel
    });
  }, [onCriteriaChange, selectedCategoryLabel, selectedCityLabel, selectedDateLabel, selectedPriceLabel]);

  const resetMobileFilters = () => {
    setSelectedCity("");
    setCity("");
    setDate("");
    setCategory("");
    setPriceMin("");
    setPriceMax("");
    setActivePanel(null);
  };

  return (
    <section ref={containerRef} className="relative">
      <div className="mb-1.5 flex items-center justify-between px-1 lg:hidden">
        <h3 className="text-lg font-bold text-white sm:text-xl">Find Events</h3>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600">
            {activeFilterCount} filters
          </span>
          <button
            type="button"
            onClick={resetMobileFilters}
            className="grid h-7 w-7 place-content-center rounded-full border border-slate-300 bg-white text-slate-600"
            aria-label="Reset filters"
            title="Reset filters"
          >
            <FiRotateCcw size={12} />
          </button>
        </div>
      </div>
      <div className="relative lg:h-[72px]">
        <div className="pointer-events-none absolute inset-0 rounded-[1.25rem] border border-slate-200 bg-white shadow-soft sm:rounded-[2rem]" />
        <div className="relative flex h-full items-start p-1 pt-1.5 md:p-2 lg:items-center">
          <div className="grid w-full grid-cols-2 gap-0.5 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:gap-1">
            <div className="relative col-span-2 min-w-0 lg:col-span-1">
              <button
                ref={whereButtonRef}
                type="button"
                className={`${fieldBase} ${
                  activePanel === "where" ? "bg-slate-100 ring-1 ring-slate-200" : "hover:bg-slate-50"
                }`}
                onClick={() => {
                  setCityQuery("");
                  setActivePanel((prev) => (prev === "where" ? null : "where"));
                }}
              >
                <div className="flex items-center gap-2 lg:hidden">
                  <span className="grid h-9 w-9 place-content-center rounded-xl bg-rose-50 text-rose-500">
                    <FiMapPin size={14} />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Where</p>
                    <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{selectedCityLabel}</p>
                  </span>
                  <FiChevronDown className="text-rose-500" size={14} />
                </div>
                <div className="hidden lg:block">
                  <p className={desktopLabelClass}>Where</p>
                  <p className={desktopValueClass}>{selectedCityLabel}</p>
                </div>
              </button>

              {activePanel === "where"
                ? createPortal(<motion.div
                    key="where-panel"
                    ref={panelRef}
                    data-discovery-panel-portal="true"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    style={{ position: "fixed", top: panelPosition.top, left: panelPosition.left }}
                    className={`${panelBase} w-[18rem] max-w-[calc(100vw-3.5rem)] sm:w-[19.5rem] sm:max-w-[calc(100vw-3rem)] lg:w-[22rem] lg:max-w-[calc(100vw-2rem)]`}
                  >
                    <label className="mb-2 block">
                      <span className="sr-only">Search cities</span>
                      <input
                        type="text"
                        value={cityQuery}
                        onChange={(e) => setCityQuery(e.target.value)}
                        placeholder="Search cities"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 caret-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-300"
                      />
                    </label>
                    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Popular cities
                    </p>
                    <div className="hide-scrollbar max-h-56 space-y-0.5 overflow-y-auto pr-1">
                      <motion.button
                        whileHover={{ x: 1 }}
                        type="button"
                        onClick={() => {
                          setSelectedCity("");
                          setCity("");
                          setActivePanel(null);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition duration-200 hover:bg-slate-50"
                      >
                        <span className="grid h-8 w-8 place-content-center rounded-lg bg-slate-100 text-slate-500">
                          <FiMapPin size={15} />
                        </span>
                        <span>
                          <p className="text-sm font-semibold text-slate-800">All Cities</p>
                          <p className="text-xs text-slate-500">Show listings from all supported cities</p>
                        </span>
                      </motion.button>
                      {filteredCitySuggestions.map((item, index) => (
                        <motion.button
                          whileHover={{ x: 1 }}
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setSelectedCity(item.value);
                            setCity(item.value);
                            setActivePanel(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition duration-200 hover:bg-slate-50"
                        >
                          <span className="grid h-8 w-8 place-content-center rounded-lg bg-slate-100 text-slate-500">
                            {index === 0 ? <FiNavigation size={15} /> : <FiMapPin size={15} />}
                          </span>
                          <span>
                            <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                            <p className="text-xs text-slate-500">{item.subtitle}</p>
                          </span>
                        </motion.button>
                      ))}
                      {filteredCitySuggestions.length === 0 ? (
                        <p className="px-2.5 py-3 text-sm text-slate-500">No cities found.</p>
                      ) : null}
                    </div>
                  </motion.div>, document.body)
                : null}
            </div>

            <div className="relative min-w-0">
              <button
                ref={whenButtonRef}
                type="button"
                onClick={() => setActivePanel((prev) => (prev === "when" ? null : "when"))}
                className={`${fieldBase} ${
                  activePanel === "when" ? "bg-slate-100 ring-1 ring-slate-200" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 lg:hidden">
                  <span className="grid h-9 w-9 place-content-center rounded-xl bg-indigo-50 text-indigo-500">
                    <FiCalendar size={14} />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">When</p>
                    <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{selectedDateLabel}</p>
                  </span>
                </div>
                <div className="hidden lg:block">
                  <p className={desktopLabelClass}>When</p>
                  <p className={desktopValueClass}>{selectedDateLabel}</p>
                </div>
              </button>

              {activePanel === "when"
                ? createPortal(<motion.div
                    key="when-panel"
                    ref={panelRef}
                    data-discovery-panel-portal="true"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    style={{ position: "fixed", top: panelPosition.top, left: panelPosition.left, zIndex: 220 }}
                    className={`${panelBase} w-fit max-w-[calc(100vw-2rem)]`}
                  >
                    <AirbnbDatePickerPanel
                      value={date}
                      onChange={setDate}
                      minDate={new Date()}
                      monthsShownDesktop={2}
                      monthsShownMobile={1}
                      closeOnSelect
                      onClose={() => setActivePanel(null)}
                    />
                  </motion.div>, document.body)
                : null}
            </div>

            <div className="relative min-w-0">
              <button
                ref={categoryButtonRef}
                type="button"
                onClick={() => {
                  setCategoryQuery("");
                  setActivePanel((prev) => (prev === "category" ? null : "category"));
                }}
                className={`${fieldBase} ${
                  activePanel === "category" ? "bg-slate-100 ring-1 ring-slate-200" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 lg:hidden">
                  <span className="grid h-9 w-9 place-content-center rounded-xl bg-amber-50 text-amber-500">
                    <FiSliders size={14} />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Category</p>
                    <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{selectedCategoryLabel}</p>
                  </span>
                </div>
                <div className="hidden lg:block">
                  <p className={desktopLabelClass}>Category</p>
                  <p className={desktopValueClass}>{selectedCategoryLabel}</p>
                </div>
              </button>

              {activePanel === "category"
                ? createPortal(<motion.div
                    key="category-panel"
                    ref={panelRef}
                    data-discovery-panel-portal="true"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    style={{ position: "fixed", top: panelPosition.top, left: panelPosition.left }}
                    className={`${panelBase} w-[18rem] max-w-[calc(100vw-3.5rem)] sm:w-[19.5rem] sm:max-w-[calc(100vw-3rem)] lg:w-[22rem] lg:max-w-[calc(100vw-2rem)]`}
                  >
                    <label className="mb-2 block">
                      <span className="sr-only">Search categories</span>
                      <input
                        type="text"
                        value={categoryQuery}
                        onChange={(e) => setCategoryQuery(e.target.value)}
                        placeholder="Search categories"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 caret-slate-900 placeholder:text-slate-400 outline-none transition focus:border-slate-300"
                      />
                    </label>
                    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Popular categories
                    </p>
                    <div className="hide-scrollbar max-h-56 space-y-0.5 overflow-y-auto pr-1">
                      <motion.button
                        whileHover={{ x: 1 }}
                        key={categorySuggestions[0]?.value || "category"}
                        type="button"
                        onClick={() => {
                          setCategory("");
                          setActivePanel(null);
                        }}
                        className="hidden"
                      />
                      {filteredCategorySuggestions.map((item) => (
                        <motion.button
                          whileHover={{ x: 1 }}
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setCategory(item.value);
                            setActivePanel(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition duration-200 hover:bg-slate-50"
                        >
                          <span className="grid h-8 w-8 place-content-center rounded-lg bg-slate-100 text-slate-500">
                            <FiTag size={15} />
                          </span>
                          <span>
                            <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                            <p className="text-xs text-slate-500">{item.subtitle}</p>
                          </span>
                        </motion.button>
                      ))}
                      {filteredCategorySuggestions.length === 0 ? (
                        <p className="px-2.5 py-3 text-sm text-slate-500">No categories found.</p>
                      ) : null}
                    </div>
                  </motion.div>, document.body)
                : null}
            </div>

            <button
              ref={priceButtonRef}
              type="button"
              onClick={() => setActivePanel((prev) => (prev === "price" ? null : "price"))}
              className={`col-span-2 flex h-full min-h-[44px] min-w-0 flex-col justify-center whitespace-nowrap overflow-hidden rounded-xl px-2.5 py-1.5 text-left transition sm:min-h-[48px] sm:rounded-2xl sm:px-3 sm:py-2 md:min-h-[54px] md:px-4 md:py-2.5 lg:col-span-1 ${
                activePanel === "price" ? "bg-slate-100 ring-1 ring-slate-200" : "hover:bg-slate-50"
              }`}
            >
              <div className="hidden lg:flex lg:h-full lg:flex-col lg:justify-center">
                <p className={desktopLabelClass}>Price</p>
                <p className={desktopValueClass}>{selectedPriceLabel}</p>
              </div>
              <div className="flex items-center gap-2 lg:hidden">
                <span className="grid h-9 w-9 place-content-center rounded-xl bg-emerald-50 text-emerald-600">$</span>
                <span className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Budget</p>
                  <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{selectedPriceLabel}</p>
                </span>
                <FiChevronDown className="text-emerald-600" size={14} />
              </div>
            </button>

            {activePanel === "price"
              ? createPortal(
                  <motion.div
                    key="price-panel"
                    ref={panelRef}
                    data-discovery-panel-portal="true"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    style={{ position: "fixed", top: panelPosition.top, left: panelPosition.left }}
                    className="z-[230] w-[22rem] max-w-[calc(100vw-2rem)] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl"
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Price range</p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Min
                        <input
                          ref={priceInputRef}
                          type="number"
                          min="0"
                          value={priceMin}
                          onChange={(e) => setPriceMin(e.target.value)}
                          placeholder="0"
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
                        />
                      </label>
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Max
                        <input
                          type="number"
                          min="0"
                          value={priceMax}
                          onChange={(e) => setPriceMax(e.target.value)}
                          placeholder="5000"
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700"
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPriceMin("");
                          setPriceMax("");
                        }}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePanel(null)}
                        className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>,
                  document.body
                )
              : null}

            <div className="col-span-2 flex h-full min-w-0 items-center justify-end px-1 pt-0.5 pb-0 lg:col-span-1 lg:min-w-[112px] lg:justify-end lg:py-1">
              <button
                type="button"
                onClick={onSearch}
                className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-rose-600 px-3 py-2 text-sm font-semibold text-white shadow transition hover:from-fuchsia-600 hover:to-rose-700 sm:min-h-[44px] sm:text-base lg:w-auto lg:bg-brand-600 lg:px-5 lg:py-3 lg:text-sm lg:hover:bg-brand-700"
                aria-label="Search discovery listings"
              >
                <FiSearch size={14} />
                Search Events
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DiscoverySearchBar;
