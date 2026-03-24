function AnalyticsCards({ stats }) {
  const cards = [
    { label: "Total Users", value: stats.total_users ?? 0 },
    { label: "Total Events", value: stats.total_events ?? 0 },
    { label: "Pending Events", value: stats.pending_events ?? 0 },
    { label: "Active Deals", value: stats.active_deals ?? 0 },
    { label: "Total Influencers", value: stats.total_influencers ?? 0 }
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">{card.label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{card.value.toLocaleString("en-US")}</p>
        </div>
      ))}
    </div>
  );
}

export default AnalyticsCards;
