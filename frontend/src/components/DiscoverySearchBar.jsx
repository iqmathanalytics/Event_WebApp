import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FiMapPin, FiNavigation, FiSearch, FiTag } from "react-icons/fi";
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
  const priceInputRef = useRef(null);
  const panelRef = useRef(null);
  const [activePanel, setActivePanel] = useState(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 8 });
  const [city, setCity] = useState(selectedCity || "");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");

  const citySuggestions = useMemo(
    () =>
      cities.map((item, index) => ({
        ...item,
        subtitle: index % 2 === 0 ? "High booking activity this week" : "Great for weekend plans"
      })),
    []
  );
  const categorySuggestions = useMemo(
    () =>
      categories.map((item, index) => ({
        ...item,
        subtitle: index % 2 === 0 ? "Trending this week" : "Popular with local audiences"
      })),
    []
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
    if (!activePanel || !["where", "when", "category"].includes(activePanel)) {
      return;
    }
    const triggerMap = {
      where: whereButtonRef.current,
      when: whenButtonRef.current,
      category: categoryButtonRef.current
    };
    const trigger = triggerMap[activePanel];
    if (!trigger) {
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panelRef.current?.getBoundingClientRect();
    const fallbackWidth = activePanel === "when" ? 760 : 360;
    const fallbackHeight = activePanel === "when" ? 380 : 360;
    const panelWidth = panelRect?.width || fallbackWidth;
    const panelHeight = panelRect?.height || fallbackHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spacing = 8;

    let left = triggerRect.left;
    if (left + panelWidth > viewportWidth - spacing) {
      left = Math.max(spacing, viewportWidth - panelWidth - spacing);
    }

    const belowTop = triggerRect.bottom + spacing;
    const aboveTop = triggerRect.top - panelHeight - spacing;
    const shouldOpenUp = belowTop + panelHeight > viewportHeight - spacing && aboveTop >= spacing;
    const top = shouldOpenUp
      ? aboveTop
      : Math.min(belowTop, Math.max(spacing, viewportHeight - panelHeight - spacing));

    setPanelPosition({ top, left });
  }, [activePanel]);

  useLayoutEffect(() => {
    if (!activePanel || !["where", "when", "category"].includes(activePanel)) {
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
      setActivePanel(panel === "price" ? null : panel);
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
    if (priceMax) {
      params.set("price_max", priceMax);
    }
    const query = params.toString();
    navigate(query ? `/events?${query}` : "/events");
  };

  const selectedCityLabel = cities.find((item) => item.value === city)?.label || "All Cities";
  const selectedDateLabel = date ? formatDateUS(date) : "Any date";
  const selectedCategoryLabel = categories.find((item) => item.value === category)?.label || "Any category";
  const selectedPriceLabel = priceMax ? `Up to $${priceMax}` : "Any price";
  const fieldBase =
    "w-full min-w-0 whitespace-nowrap overflow-hidden text-ellipsis rounded-2xl px-4 py-3 text-left transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300";
  const panelBase = "z-[220] rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl";

  useEffect(() => {
    onCriteriaChange?.({
      cityLabel: selectedCityLabel === "All Cities" ? "Anywhere" : selectedCityLabel,
      dateLabel: selectedDateLabel,
      categoryLabel: selectedCategoryLabel,
      priceLabel: selectedPriceLabel
    });
  }, [onCriteriaChange, selectedCategoryLabel, selectedCityLabel, selectedDateLabel, selectedPriceLabel]);

  return (
    <section ref={containerRef} className="relative">
      <div className="relative md:h-[72px]">
        <div className="pointer-events-none absolute inset-0 rounded-[2rem] border border-slate-200 bg-white shadow-soft" />
        <div className="relative flex h-full items-center p-2">
          <div className="grid w-full grid-cols-1 gap-1 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
            <div className="relative min-w-0">
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
                <p className="text-xs font-semibold text-slate-900">Where</p>
                <p className="truncate pt-0.5 text-sm text-slate-600">{selectedCityLabel}</p>
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
                    className={`${panelBase} w-[22rem] max-w-[calc(100vw-2rem)]`}
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
                <p className="text-xs font-semibold text-slate-900">When</p>
                <p className="truncate pt-0.5 text-sm text-slate-600">{selectedDateLabel}</p>
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
                <p className="text-xs font-semibold text-slate-900">Category</p>
                <p className="truncate pt-0.5 text-sm text-slate-600">{selectedCategoryLabel}</p>
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
                    className={`${panelBase} w-[22rem] max-w-[calc(100vw-2rem)]`}
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

            <label className="min-w-0 whitespace-nowrap overflow-hidden text-ellipsis rounded-2xl px-4 py-3 transition hover:bg-slate-50">
              <p className="text-xs font-semibold text-slate-900">Price</p>
              <input
                ref={priceInputRef}
                type="number"
                min="0"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="Set max budget"
                className="w-full bg-transparent pt-0.5 text-sm text-slate-700 caret-slate-900 placeholder:text-slate-400 outline-none"
              />
            </label>

            <div className="flex min-w-0 items-center justify-end px-2 py-1 max-md:justify-stretch">
              <button
                type="button"
                onClick={onSearch}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-brand-700 max-md:w-full"
                aria-label="Search discovery listings"
              >
                <FiSearch size={16} />
                Search
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default DiscoverySearchBar;
