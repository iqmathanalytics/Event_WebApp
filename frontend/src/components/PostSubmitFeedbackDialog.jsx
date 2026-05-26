import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const RELOAD_DELAY_MS = 1600;

/**
 * Full-screen success notice then reloads the page so dashboard data refetches.
 * Also offers an immediate refresh button (clears the scheduled reload).
 */
export default function PostSubmitFeedbackDialog({ open, title, description }) {
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      window.location.reload();
    }, RELOAD_DELAY_MS);
    return () => {
      if (timeoutRef.current != null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [open]);

  const refreshNow = () => {
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    window.location.reload();
  };

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-submit-success-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <h2 id="post-submit-success-title" className="text-lg font-bold text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
        <p className="mt-3 text-xs text-slate-500">
          This page will refresh automatically so your dashboard shows the latest information.
        </p>
        <button
          type="button"
          onClick={refreshNow}
          className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Refresh now
        </button>
      </div>
    </div>,
    document.body
  );
}
