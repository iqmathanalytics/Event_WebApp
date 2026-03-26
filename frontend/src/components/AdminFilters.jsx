import { useEffect, useMemo, useRef, useState } from "react";
import { FiMapPin, FiTag } from "react-icons/fi";
import { categories } from "../utils/filterOptions";
import AirbnbDatePickerPanel from "./AirbnbDatePickerPanel";
import FilterPopupField from "./FilterPopupField";
import { formatDateUS } from "../utils/format";
import useCityFilter from "../hooks/useCityFilter";

function AdminFilters({ filters, onChange, onApply, onReset, canApply = true }) {
  const containerRef = useRef(null);
  const [activePanel, setActivePanel] = useState(null);
  const [cityQuery, setCityQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const { cities } = useCityFilter();

  useEffect(() => {
    const onDocClick = (event) => {
      if (event.target?.closest?.("[data-filter-popup-portal='true']")) {
        return;
      }
      if (!containerRef.current?.contains(event.target)) {
        setActivePanel(null);
      }
    };
    window.addEventListener("click", onDocClick);
    return () => window.removeEventListener("click", onDocClick);
  }, []);

  const cityLabel = useMemo(
    () => cities.find((item) => item.value === filters.city)?.label || "All Cities",
    [filters.city]
  );
  const categoryLabel = useMemo(
    () => categories.find((item) => item.value === filters.category)?.label || "All Categories",
    [filters.category]
  );
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

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Mobile + Tablet layout (does not affect desktop). */}
      <div className="lg:hidden rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-soft">
        <div className="grid grid-cols-2 gap-2">
          <FilterPopupField
            label="Date"
            value={filters.date ? formatDateUS(filters.date) : "Any Date"}
            isActive={activePanel === "date"}
            onToggle={(e) => {
              e.stopPropagation();
              setActivePanel((prev) => (prev === "date" ? null : "date"));
            }}
            usePortal
            panelClassName="w-fit max-w-[calc(100vw-2rem)]"
            panelContent={
              <AirbnbDatePickerPanel
                value={filters.date}
                onChange={(next) => onChange("date", next)}
                closeOnSelect
                onClose={() => setActivePanel(null)}
              />
            }
          />

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
                      onChange("city", "");
                      setActivePanel(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <FiMapPin className="text-slate-400" /> All Cities
                  </button>
                  {filteredCities.map((city) => (
                    <button
                      key={city.value}
                      type="button"
                      onClick={() => {
                        onChange("city", city.value);
                        setActivePanel(null);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <FiMapPin className="text-slate-400" /> {city.label}
                    </button>
                  ))}
                  {filteredCities.length === 0 ? (
                    <p className="px-2.5 py-3 text-sm text-slate-500">No cities found.</p>
                  ) : null}
                </div>
              </div>
            }
          />

          <div className="col-span-2 grid grid-cols-[1fr_120px] gap-2">
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
                        onChange("category", "");
                        setActivePanel(null);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <FiTag className="text-slate-400" /> All Categories
                    </button>
                    {filteredCategories.map((category) => (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => {
                          onChange("category", category.value);
                          setActivePanel(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        <FiTag className="text-slate-400" /> {category.label}
                      </button>
                    ))}
                    {filteredCategories.length === 0 ? (
                      <p className="px-2.5 py-3 text-sm text-slate-500">No categories found.</p>
                    ) : null}
                  </div>
                </div>
              }
            />

            <div className="grid grid-rows-2 gap-2">
              <button
                type="button"
                onClick={onApply}
                disabled={!canApply}
                className="min-h-9 rounded-2xl bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={onReset}
                className="min-h-9 rounded-2xl border border-slate-300 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-700"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop layout (unchanged). */}
      <div className="hidden lg:grid grid-cols-1 gap-2 rounded-[2rem] border border-slate-200 bg-white p-3 shadow-soft sm:grid-cols-2 lg:grid-cols-5">
        <FilterPopupField
          label="Date"
          value={filters.date ? formatDateUS(filters.date) : "Any Date"}
          isActive={activePanel === "date"}
          onToggle={(e) => {
            e.stopPropagation();
            setActivePanel((prev) => (prev === "date" ? null : "date"));
          }}
          usePortal
          panelClassName="w-fit max-w-[calc(100vw-2rem)]"
          panelContent={
            <AirbnbDatePickerPanel
              value={filters.date}
              onChange={(next) => onChange("date", next)}
              closeOnSelect
              onClose={() => setActivePanel(null)}
            />
          }
        />

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
                    onChange("city", "");
                    setActivePanel(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <FiMapPin className="text-slate-400" /> All Cities
                </button>
                {filteredCities.map((city) => (
                  <button
                    key={city.value}
                    type="button"
                    onClick={() => {
                      onChange("city", city.value);
                      setActivePanel(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <FiMapPin className="text-slate-400" /> {city.label}
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
                    onChange("category", "");
                    setActivePanel(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <FiTag className="text-slate-400" /> All Categories
                </button>
                {filteredCategories.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => {
                      onChange("category", category.value);
                      setActivePanel(null);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <FiTag className="text-slate-400" /> {category.label}
                  </button>
                ))}
                {filteredCategories.length === 0 ? (
                  <p className="px-2.5 py-3 text-sm text-slate-500">No categories found.</p>
                ) : null}
              </div>
            </div>
          }
        />

        <button
          type="button"
          onClick={onApply}
          disabled={!canApply}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply Filters
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default AdminFilters;
