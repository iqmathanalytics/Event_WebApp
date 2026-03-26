function AnalyticsCards({ stats }) {
  const cards = [
    { label: "Total Users", value: stats.total_users ?? 0 },
    { label: "Total Events", value: stats.total_events ?? 0 },
    { label: "Pending Events", value: stats.pending_events ?? 0 },
    { label: "Active Deals", value: stats.active_deals ?? 0 },
    { label: "Total Influencers", value: stats.total_influencers ?? 0 }
  ];

  return (
    <>
      {/* Mobile + Tablet layout (does not affect desktop). */}
      <div className="lg:hidden grid grid-cols-2 gap-2">
        {cards
          .filter((card) => card.label !== "Pending Events")
          .slice(0, 4)
          .map((card) => {
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-3 shadow-sm"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{card.value.toLocaleString("en-US")}</p>
            </div>
          );
        })}
      </div>

      {/* Desktop layout (unchanged). */}
      <div className="hidden lg:grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{card.value.toLocaleString("en-US")}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export default AnalyticsCards;
