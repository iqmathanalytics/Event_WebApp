import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";

/**
 * Phone empty state for listing grids. Desktop keeps the original one-line message.
 */
export default function ListingEmptyState({ message, actionLabel, onAction, href }) {
  const actionClass =
    "mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white";

  return (
    <div className="col-span-full min-w-full">
      <p className="hidden text-sm text-slate-500 lg:block">{message}</p>
      <div className="flex flex-col items-center rounded-3xl border border-slate-200 bg-white px-5 py-10 text-center shadow-sm lg:hidden">
        <span className="grid h-12 w-12 place-content-center rounded-2xl bg-brand-50 text-brand-600">
          <SearchX className="h-6 w-6" strokeWidth={2.25} aria-hidden />
        </span>
        <p className="mt-3 max-w-xs text-base font-semibold leading-snug text-slate-900">{message}</p>
        {onAction && actionLabel ? (
          <button type="button" onClick={onAction} className={actionClass}>
            {actionLabel}
          </button>
        ) : null}
        {!onAction && href && actionLabel ? (
          <Link to={href} className={actionClass}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
