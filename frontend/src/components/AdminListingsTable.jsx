function getListingTitle(item) {
  return item.title || item.name || "Untitled";
}

function getListingPrimaryMeta(item) {
  if (item.price !== undefined && item.price !== null) {
    return `$${Number(item.price).toFixed(0)}`;
  }
  if (item.discounted_price !== undefined && item.discounted_price !== null) {
    return `$${Number(item.discounted_price).toFixed(0)}`;
  }
  if (item.price_min !== undefined && item.price_min !== null) {
    return `$${Number(item.price_min).toFixed(0)}`;
  }
  return "-";
}

function getColumnLabels(type) {
  if (type === "deals") {
    return {
      title: "Deal Title",
      city: "City",
      category: "Category",
      value: "Deal Value"
    };
  }
  if (type === "influencers") {
    return {
      title: "Profile Name",
      city: "City",
      category: "Category",
      value: "Reach/Value"
    };
  }
  if (type === "dealers") {
    return {
      title: "Business Name",
      city: "Business City",
      category: "Business Category",
      value: "Profile Value"
    };
  }
  return {
    title: "Event Title",
    city: "City",
    category: "Category",
    value: "Value"
  };
}

function AdminListingsTable({
  rows,
  loading,
  type,
  onView,
  onApprove,
  onReject,
  onDelete
}) {
  if (loading) {
    return <p className="text-sm text-slate-500">Loading listing records...</p>;
  }

  if (!rows.length) {
    return <p className="text-sm text-slate-500">No listings match the selected filters.</p>;
  }

  const labels = getColumnLabels(type);

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((item) => (
          <article key={`card-${item.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">{getListingTitle(item)}</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase text-slate-700">
                {item.status || "n/a"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <p>
                <span className="font-semibold text-slate-700">{labels.city}: </span>
                {type === "dealers" ? item.location_text || item.city_name || "-" : item.city_name || "-"}
              </p>
              <p>
                <span className="font-semibold text-slate-700">{labels.category}: </span>
                {item.category_name || "-"}
              </p>
              <p className="col-span-2">
                <span className="font-semibold text-slate-700">{labels.value}: </span>
                {getListingPrimaryMeta(item)}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.status === "pending" ? (
                <>
                  <button
                    type="button"
                    onClick={() => onApprove(item)}
                    className="min-h-11 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Review & Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(item)}
                    className="min-h-11 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                  >
                    Reject
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onView(item)}
                    className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    className="min-h-11 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3">{labels.title}</th>
            <th className="px-4 py-3">{labels.city}</th>
            <th className="px-4 py-3">{labels.category}</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">{labels.value}</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} className="border-b border-slate-100">
              <td className="px-4 py-3 font-medium text-slate-900">{getListingTitle(item)}</td>
              <td className="px-4 py-3 text-slate-600">
                {type === "dealers" ? item.location_text || item.city_name || "-" : item.city_name || "-"}
              </td>
              <td className="px-4 py-3 text-slate-600">{item.category_name || "-"}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">
                  {item.status || "n/a"}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-slate-600">{getListingPrimaryMeta(item)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {item.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onApprove(item)}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        Review & Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(item)}
                        className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onView(item)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </>
  );
}

export default AdminListingsTable;
