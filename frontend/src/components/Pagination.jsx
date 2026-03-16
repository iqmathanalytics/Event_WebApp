function Pagination({ page, totalPages, onPageChange }) {
  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
      >
        Prev
      </button>
      <span className="text-sm text-slate-600">
        Page {page} of {Math.max(1, totalPages)}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

export default Pagination;
