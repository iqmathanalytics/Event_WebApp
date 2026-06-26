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
    size === "fullscreen"
      ? "h-screen w-screen rounded-none"
      : size === "full"
      ? "h-[min(92vh,900px)] w-[min(96vw,1200px)]"
      : "h-[min(80vh,720px)] w-[min(92vw,900px)]";
  const overlayPadding = size === "fullscreen" ? "p-0" : "p-3 sm:p-4";
  const shellRadius = size === "fullscreen" ? "" : "rounded-2xl";
  const bodyOverflow = size === "fullscreen" ? "overflow-hidden" : "overflow-auto";
  const headerPadding = size === "fullscreen" ? "px-3 py-1.5 sm:px-4" : "px-4 py-3 sm:px-5";
  const titleClass = size === "fullscreen" ? "text-sm font-bold sm:text-base" : "text-base font-bold sm:text-lg";
  const closePadding = size === "fullscreen" ? "p-1.5" : "p-2";
  const footerPadding = size === "fullscreen" ? "px-3 py-1.5 sm:px-4" : "px-4 py-3 sm:px-5";

  return createPortal(
    <div className={`fixed inset-0 z-[350] flex items-center justify-center bg-slate-900/60 ${overlayPadding}`}>
      <div
        className={`flex flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl ${shellRadius} ${widthClass}`}
        role="dialog"
        aria-modal="true"
      >
        <header className={`flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 ${headerPadding}`}>
          <div className="min-w-0">
            <h2 className={`truncate text-slate-900 ${titleClass}`}>{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg ${closePadding} text-slate-500 transition hover:bg-slate-100 hover:text-slate-800`}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className={`min-h-0 flex-1 ${bodyOverflow}`}>{children}</div>
        {footer ? (
          <footer className={`shrink-0 border-t border-slate-100 bg-slate-50/80 ${footerPadding}`}>{footer}</footer>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
