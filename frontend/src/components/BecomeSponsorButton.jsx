import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Handshake, Mail, Phone, X } from "lucide-react";

/**
 * Event-page sponsor CTA — opens a modal with organizer contact details.
 */
export default function BecomeSponsorButton({ email, phone, eventTitle }) {
  const [open, setOpen] = useState(false);
  const contactEmail = String(email || "").trim();
  const contactPhone = String(phone || "").trim();

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) {
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

  if (!contactEmail && !contactPhone) {
    return null;
  }

  const mailto = contactEmail ? `mailto:${contactEmail}?subject=${encodeURIComponent(`Sponsorship inquiry — ${eventTitle || "your event"}`)}` : null;
  const tel = contactPhone ? `tel:${contactPhone.replace(/[^\d+]/g, "")}` : null;

  const modal = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="sponsor-backdrop"
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
            aria-labelledby="sponsor-inquiry-title"
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/[0.04]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-amber-50 via-white to-orange-50/60 px-5 py-5 sm:px-6">
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-amber-200/40 blur-2xl"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              />
              <button
                type="button"
                onClick={close}
                className="absolute right-3 top-3 grid h-8 w-8 place-content-center rounded-full text-slate-500 transition hover:bg-white/80 hover:text-slate-800"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="relative flex items-start gap-3 pr-8">
                <motion.div
                  className="grid h-11 w-11 shrink-0 place-content-center rounded-xl bg-slate-900 text-amber-300 shadow-md shadow-slate-900/20"
                  initial={{ rotate: -8, scale: 0.9 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 18 }}
                >
                  <Handshake className="h-5 w-5" aria-hidden />
                </motion.div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-800/80">
                    Partner with us
                  </p>
                  <h2
                    id="sponsor-inquiry-title"
                    className="mt-0.5 text-base font-bold tracking-tight text-slate-900 sm:text-lg"
                  >
                    Become a sponsor for this event
                  </h2>
                  {eventTitle ? (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{eventTitle}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              <p className="text-sm leading-relaxed text-slate-600">
                Put your brand in front of a live audience. Reach out to sponsor this show — we’d love to build
                something memorable together.
              </p>

              <div className="space-y-2.5">
                {contactEmail ? (
                  <motion.a
                    href={mailto}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 }}
                    className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3.5 py-3 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50/60 hover:text-slate-900"
                  >
                    <span className="grid h-9 w-9 place-content-center rounded-lg bg-white text-amber-700 shadow-sm ring-1 ring-slate-900/[0.04]">
                      <Mail className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Email
                      </span>
                      <span className="block truncate">{contactEmail}</span>
                    </span>
                  </motion.a>
                ) : null}

                {contactPhone ? (
                  <motion.a
                    href={tel || undefined}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3.5 py-3 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50/60 hover:text-slate-900"
                  >
                    <span className="grid h-9 w-9 place-content-center rounded-lg bg-white text-amber-700 shadow-sm ring-1 ring-slate-900/[0.04]">
                      <Phone className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Phone
                      </span>
                      <span className="block truncate">{contactPhone}</span>
                    </span>
                  </motion.a>
                ) : null}
              </div>

              <p className="text-xs leading-relaxed text-slate-500">
                Tap email or phone to reach the organizer directly about sponsorship packages.
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.97 }}
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/90 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 text-xs font-semibold text-amber-950 shadow-sm ring-1 ring-amber-900/[0.04] backdrop-blur-sm transition hover:border-amber-300 hover:from-amber-100 hover:to-orange-100 hover:shadow-md sm:gap-2 sm:px-3.5"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Handshake className="h-3.5 w-3.5 text-amber-700" aria-hidden />
        <span className="hidden sm:inline">Become a Sponsor</span>
        <span className="sm:hidden">Sponsor</span>
      </motion.button>
      {typeof document !== "undefined" ? createPortal(modal, document.body) : null}
    </>
  );
}
