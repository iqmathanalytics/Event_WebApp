import { useMemo, useState } from "react";
import SortDropdown from "./SortDropdown";
import { categories, cities, sortOptions } from "../utils/filterOptions";

function FiltersPanel({
  city,
  onCityChange,
  category,
  onCategoryChange,
  date,
  onDateChange,
  time,
  onTimeChange,
  priceMin,
  onPriceMinChange,
  priceMax,
  onPriceMaxChange,
  sortBy,
  onSortChange,
  showPriceFilters = true,
  onApply,
  onReset,
  canApply = true
}) {
  const [cityQuery, setCityQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
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
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <input
            type="text"
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
            placeholder="Search cities"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 caret-slate-900 placeholder:text-slate-400 outline-none"
          />
          <select
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none"
          >
            <option value="">All Cities</option>
            {filteredCities.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <input
            type="text"
            value={categoryQuery}
            onChange={(e) => setCategoryQuery(e.target.value)}
            placeholder="Search categories"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 caret-slate-900 placeholder:text-slate-400 outline-none"
          />
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none"
        >
          <option value="">All Categories</option>
          {filteredCategories.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none"
        />
        {showPriceFilters ? (
          <input
            type="number"
            min="0"
            placeholder="Price min"
            value={priceMin}
            onChange={(e) => onPriceMinChange(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none"
          />
        ) : null}
        {showPriceFilters ? (
          <input
            type="number"
            min="0"
            placeholder="Price max"
            value={priceMax}
            onChange={(e) => onPriceMaxChange(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none"
          />
        ) : null}
        <SortDropdown
          value={sortBy}
          onChange={onSortChange}
          options={sortOptions}
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
    </section>
  );
}

export default FiltersPanel;
