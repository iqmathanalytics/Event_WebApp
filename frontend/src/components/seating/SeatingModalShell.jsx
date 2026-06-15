import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function SeatingModalShell({
  open,
  onClose,
  title,
  subtitle,
  footer,
  size = "full",
  children
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const widthClass =
    size === "full"
      ? "h-[min(92vh,900px)] w-[min(96vw,1200px)]"
      : "h-[min(80vh,720px)] w-[min(92vw,900px)]";

  return createPortal(
    <div className="fixed inset-0 z-[350] flex items-center justify-center bg-slate-900/60 p-3 sm:p-4">
      <div
        className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${widthClass}`}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        {footer ? (
          <footer className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">{footer}</footer>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
