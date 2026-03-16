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

function AdminListingsTable({
  rows,
  loading,
  type,
  onApprove,
  onReject,
  onDelete,
  onEdit
}) {
  if (loading) {
    return <p className="text-sm text-slate-500">Loading listing records...</p>;
  }

  if (!rows.length) {
    return <p className="text-sm text-slate-500">No listings match the selected filters.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">City</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Value</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} className="border-b border-slate-100">
              <td className="px-4 py-3 font-medium text-slate-900">{getListingTitle(item)}</td>
              <td className="px-4 py-3 text-slate-600">{item.city_name || "-"}</td>
              <td className="px-4 py-3 text-slate-600">{item.category_name || "-"}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">
                  {item.status || "n/a"}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">{getListingPrimaryMeta(item)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {type === "events" && item.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onApprove(item)}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(item)}
                        className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                  {type !== "events" || item.status !== "rejected" ? (
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold"
                    >
                      Edit
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminListingsTable;
