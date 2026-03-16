function SearchBar({ value, onChange, placeholder = "Search listings, events, or providers..." }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none ring-brand-200 transition focus:ring"
    />
  );
}

export default SearchBar;
