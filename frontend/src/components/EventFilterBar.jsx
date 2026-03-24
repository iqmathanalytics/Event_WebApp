import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiDollarSign,
  FiFilter,
  FiMapPin,
  FiSearch,
  FiSliders,
  FiTag,
  FiX
} from "react-icons/fi";
import { categories, sortOptions } from "../utils/filterOptions";
import AirbnbDatePickerPanel from "./AirbnbDatePickerPanel";
import FilterPopupField from "./FilterPopupField";
import { formatDateUS } from "../utils/format";
import useCityFilter from "../hooks/useCityFilter";

function EventFilterControls({
  query,
  setQuery,
  city,
  setCity,
  category,
  setCategory,
  date,
  setDate,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  sortBy,
  setSortBy,
  showDate = true,
  showPrice = true,
  searchPlaceholder = "Search events"
}) {
  const containerRef = useRef(null);
  const [activePanel, setActivePanel] = useState(null);
  const [cityQuery, setCityQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const { cities } = useCityFilter();

  useEffect(() => {
    const onDocClick = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setActivePanel(null);
      }
    };
    window.addEventListener("click", onDocClick);
    return () => window.removeEventListener("click", onDocClick);
  }, []);

  const cityLabel = useMemo(() => {
    return cities.find((item) => item.value === city)?.label || "All Cities";
  }, [city]);
  const categoryLabel = useMemo(() => {
    return categories.find((item) => item.value === category)?.label || "All Categories";
  }, [category]);
  const sortLabel = useMemo(() => {
    return sortOptions.find((item) => item.value === sortBy)?.label || "Sort";
  }, [sortBy]);
  const filteredCities = useMemo(() => {
    const query = cityQuery.trim().toLowerCase();
    if (!query) {
      return cities;
    }
    return cities.filter((item) => item.label.toLowerCase().includes(query));
  }, [cityQuery]);
  const filteredCategories = useMemo(() => {
    const query = categoryQuery.trim().toLowerCase();
    if (!query) {
      return categories;
    }
    return categories.filter((item) => item.label.toLowerCase().includes(query));
  }, [categoryQuery]);

  const dateLabel = date ? formatDateUS(date) : "Any Date";
  const priceLabel = priceMin || priceMax ? `${priceMin || 0} - ${priceMax || "Any"}` : "Any Price";

  return (
    <div ref={containerRef} className="contents">
      <label className="relative min-w-[210px] flex-1">
        <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-full border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 caret-slate-900 placeholder:text-slate-400 outline-none"
        />
      </label>

      <FilterPopupField
        label="City"
        value={cityLabel}
        isActive={activePanel === "city"}
        onToggle={(e) => {
          e.stopPropagation();
          setCityQuery("");
          setActivePanel((prev) => (prev === "city" ? null : "city"));
        }}
        panelClassName="w-full min-w-[220px]"
        panelContent={
          <div>
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
            <div className="hide-scrollbar max-h-56 space-y-0.5 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => {
                setCity("");
                setActivePanel(null);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <FiMapPin className="text-slate-400" /> All Cities
            </button>
            {filteredCities.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setCity(item.value);
                  setActivePanel(null);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <FiMapPin className="text-slate-400" /> {item.label}
              </button>
            ))}
            {filteredCities.length === 0 ? (
              <p className="px-2.5 py-3 text-sm text-slate-500">No cities found.</p>
            ) : null}
            </div>
          </div>
        }
      />

      <FilterPopupField
        label="Category"
        value={categoryLabel}
        isActive={activePanel === "category"}
        onToggle={(e) => {
          e.stopPropagation();
          setCategoryQuery("");
          setActivePanel((prev) => (prev === "category" ? null : "category"));
        }}
        panelClassName="w-full min-w-[220px]"
        panelContent={
          <div>
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
            <div className="hide-scrollbar max-h-56 space-y-0.5 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => {
                setCategory("");
                setActivePanel(null);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <FiTag className="text-slate-400" /> All Categories
            </button>
            {filteredCategories.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setCategory(item.value);
                  setActivePanel(null);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <FiTag className="text-slate-400" /> {item.label}
              </button>
            ))}
            {filteredCategories.length === 0 ? (
              <p className="px-2.5 py-3 text-sm text-slate-500">No categories found.</p>
            ) : null}
            </div>
          </div>
        }
      />

      {showDate ? (
        <FilterPopupField
          label="When"
          value={dateLabel}
          isActive={activePanel === "date"}
          onToggle={(e) => {
            e.stopPropagation();
            setActivePanel((prev) => (prev === "date" ? null : "date"));
          }}
          panelClassName="w-fit max-w-[calc(100vw-2rem)]"
          panelContent={
            <AirbnbDatePickerPanel
              value={date}
              onChange={setDate}
              minDate={new Date()}
              closeOnSelect
              onClose={() => setActivePanel(null)}
            />
          }
        />
      ) : null}

      {showPrice ? (
        <FilterPopupField
          label="Price"
          value={priceLabel}
          isActive={activePanel === "price"}
          onToggle={(e) => {
            e.stopPropagation();
            setActivePanel((prev) => (prev === "price" ? null : "price"));
          }}
          panelClassName="w-full min-w-[220px]"
          panelContent={
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Min
                <div className="relative mt-1">
                  <FiDollarSign className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-8 pr-3 text-sm text-slate-800 caret-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Max
                <div className="relative mt-1">
                  <FiDollarSign className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min="0"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="Any"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-8 pr-3 text-sm text-slate-800 caret-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </label>
            </div>
          }
        />
      ) : null}

      <FilterPopupField
        label="Sort"
        value={sortLabel}
        isActive={activePanel === "sort"}
        onToggle={(e) => {
          e.stopPropagation();
          setActivePanel((prev) => (prev === "sort" ? null : "sort"));
        }}
        panelClassName="w-full min-w-[220px]"
        panelContent={
          <div className="space-y-0.5">
            {sortOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setSortBy(item.value);
                  setActivePanel(null);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <FiSliders className="text-slate-400" /> {item.label}
              </button>
            ))}
          </div>
        }
      />
    </div>
  );
}

function EventFilterBar(props) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { onApply, onReset, canApply, mobileTitle = "Filter Events" } = props;

  useEffect(() => {
    if (!isMobileOpen) {
      return undefined;
    }
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [isMobileOpen]);

  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="hidden items-center gap-2 lg:flex">
          <EventFilterControls {...props} />
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={!canApply}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            <FiFilter />
            Filters
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={!canApply}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Search
          </button>
        </div>
      </section>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-900/45 lg:hidden">
          <div className="hide-scrollbar absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-28 shadow-2xl transition-transform duration-200 ease-out">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">{mobileTitle}</h3>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="grid h-11 w-11 place-content-center rounded-full border border-slate-300 text-slate-600"
              >
                <FiX />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <EventFilterControls {...props} />
            </div>
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] bg-gradient-to-t from-white via-white to-white/85 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
              <div className="mx-auto flex w-full max-w-3xl items-center justify-end gap-2 pointer-events-auto">
              <button
                type="button"
                onClick={onReset}
                className="min-h-11 rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  onApply();
                  setIsMobileOpen(false);
                }}
                disabled={!canApply}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiSliders />
                Apply Filters
              </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default EventFilterBar;
