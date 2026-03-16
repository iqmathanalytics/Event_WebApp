function OrganizerSidebar({ activeSection, onSectionChange }) {
  const items = [
    { key: "overview", label: "Overview" },
    { key: "my-events", label: "My Events" },
    { key: "bookings", label: "Event Bookings" }
  ];

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
      <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Organizer
      </p>
      <nav className="space-y-1">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSectionChange(item.key)}
            className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
              activeSection === item.key
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default OrganizerSidebar;
