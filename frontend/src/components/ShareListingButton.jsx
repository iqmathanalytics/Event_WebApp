import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Link2, Share2, X } from "lucide-react";

const LABELS = {
  event: "event",
  deal: "deal",
  influencer: "creator profile"
};

/**
 * Top-right share control for listing detail cards. Opens a modal to copy the public link.
 */
export default function ShareListingButton({ url, title, listingType = "event" }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const inputRef = useRef(null);
  const copyResetRef = useRef(null);

  const listingLabel = LABELS[listingType] || "listing";

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setCopyError(false);
      return undefined;
    }
    const onKey = (e) => {
      if (e.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  useEffect(() => {
    return () => {
      if (copyResetRef.current) {
        window.clearTimeout(copyResetRef.current);
      }
    };
  }, []);

  const copyLink = async () => {
    setCopyError(false);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (inputRef.current) {
        inputRef.current.select();
        document.execCommand("copy");
      } else {
        throw new Error("Clipboard unavailable");
      }
      setCopied(true);
      if (copyResetRef.current) {
        window.clearTimeout(copyResetRef.current);
      }
      copyResetRef.current = window.setTimeout(() => {
        setCopied(false);
        copyResetRef.current = null;
      }, 2400);
    } catch {
      setCopyError(true);
    }
  };

  const modal = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="share-backdrop"
          className="fixed inset-0 z-[350] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={close}
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-listing-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/[0.04]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-brand-50/40 px-5 py-5 sm:px-6">
              <button
                type="button"
                onClick={close}
                className="absolute right-3 top-3 grid h-8 w-8 place-content-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3 pr-8">
                <div className="grid h-11 w-11 shrink-0 place-content-center rounded-xl bg-slate-900 text-white shadow-md shadow-slate-900/20">
                  <Link2 className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h2 id="share-listing-title" className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                    Share this {listingLabel}
                  </h2>
                  {title ? (
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{title}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              <p className="text-xs leading-relaxed text-slate-500">
                Anyone with this link can view the {listingLabel}. Copy and send it by message, email, or social.
              </p>

              <div className="relative">
                <label htmlFor="share-listing-url" className="sr-only">
                  Link to share
                </label>
                <input
                  id="share-listing-url"
                  ref={inputRef}
                  type="text"
                  readOnly
                  value={url}
                  className={`w-full rounded-xl border bg-slate-50/80 py-3 pl-3.5 pr-3 text-[13px] font-medium text-slate-800 shadow-inner transition-colors selection:bg-brand-100 ${
                    copied
                      ? "border-emerald-300/90 ring-2 ring-emerald-500/20"
                      : "border-slate-200/90 focus:border-slate-300"
                  }`}
                  onFocus={(e) => e.target.select()}
                />
                <AnimatePresence>
                  {copied ? (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="pointer-events-none absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800"
                    >
                      <Check className="h-3 w-3" aria-hidden />
                      Copied
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>

              {copyError ? (
                <p className="text-xs font-medium text-rose-600">Could not copy automatically. Select the link above and copy manually.</p>
              ) : null}

              <motion.button
                type="button"
                onClick={copyLink}
                animate={
                  copied
                    ? { scale: [1, 1.03, 1], backgroundColor: ["#0f172a", "#059669", "#047857"] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.35 }}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white shadow-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                  copied
                    ? "bg-emerald-600 shadow-emerald-600/25 hover:bg-emerald-700"
                    : "bg-slate-900 shadow-slate-900/20 hover:bg-slate-800"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden />
                    Link copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden />
                    Copy link
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute right-4 top-4 z-[1] inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-900/[0.03] backdrop-blur-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-md sm:right-5 sm:top-5 sm:gap-2 sm:px-3.5 lg:right-6 lg:top-6"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Share2 className="h-3.5 w-3.5 text-brand-600" aria-hidden />
        <span>Share</span>
      </button>
      {typeof document !== "undefined" ? createPortal(modal, document.body) : null}
    </>
  );
}
