import useCityFilter from "../hooks/useCityFilter";

function CitySelector({ value, onChange }) {
  const { cities } = useCityFilter();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none"
    >
      <option value="">All Cities</option>
      {cities.map((city) => (
        <option key={city.value} value={city.value}>
          {city.label}
        </option>
      ))}
    </select>
  );
}

export default CitySelector;
