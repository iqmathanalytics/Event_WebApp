import { useEffect, useMemo, useState } from "react";

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

function getStatusBadgeClass(status) {
  const value = String(status || "").toLowerCase();
  if (value === "approved") return "bg-emerald-100 text-emerald-700";
  if (value === "rejected") return "bg-rose-100 text-rose-700";
  if (value === "pending") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
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
  const perPage = 5;
  const [mobilePage, setMobilePage] = useState(1);
  const mobileTotalPages = useMemo(() => Math.max(1, Math.ceil(rows.length / perPage)), [rows.length]);
  const mobileRows = useMemo(() => {
    const start = (mobilePage - 1) * perPage;
    return rows.slice(start, start + perPage);
  }, [rows, mobilePage]);

  useEffect(() => {
    if (mobilePage > mobileTotalPages) {
      setMobilePage(1);
    }
  }, [mobilePage, mobileTotalPages]);

  return (
    <>
      <div className="space-y-3 md:hidden">
        {mobileRows.map((item) => (
          <article
            key={`card-${item.id}`}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft"
          >
            <button
              type="button"
              onClick={() => (String(item.status || "").toLowerCase() === "pending" ? onApprove(item) : onView(item))}
              className="w-full text-left"
            >
              <div className="bg-gradient-to-br from-slate-50 via-white to-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 flex-1 text-sm font-semibold text-slate-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                    {getListingTitle(item)}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${getStatusBadgeClass(
                      item.status
                    )}`}
                  >
                    {item.status || "n/a"}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex max-w-full items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                    <span className="truncate">
                      {type === "dealers" ? item.location_text || item.city_name || "-" : item.city_name || "-"}
                    </span>
                  </span>
                  <span className="inline-flex max-w-full items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                    <span className="truncate">{item.category_name || "-"}</span>
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                    {labels.value}: {getListingPrimaryMeta(item)}
                  </span>
                </div>
              </div>
            </button>

            <div className="p-3">
              <div className="grid grid-cols-2 gap-2">
                {String(item.status || "").toLowerCase() === "pending" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onApprove(item)}
                      className="min-h-9 rounded-2xl bg-emerald-600 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-sm"
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(item)}
                      className="min-h-9 rounded-2xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-semibold text-rose-700"
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onView(item)}
                      className="min-h-9 rounded-2xl border border-slate-300 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-800"
                    >
                      View details
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      className="min-h-9 rounded-2xl bg-rose-600 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-sm"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
        {mobileTotalPages > 1 ? (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            <button
              type="button"
              disabled={mobilePage <= 1}
              onClick={() => setMobilePage((p) => Math.max(1, p - 1))}
              className="rounded-lg px-2 py-1 font-semibold disabled:opacity-40"
            >
              Prev
            </button>
            <span className="font-medium">
              Page {mobilePage} of {mobileTotalPages}
            </span>
            <button
              type="button"
              disabled={mobilePage >= mobileTotalPages}
              onClick={() => setMobilePage((p) => Math.min(mobileTotalPages, p + 1))}
              className="rounded-lg px-2 py-1 font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        ) : null}
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
