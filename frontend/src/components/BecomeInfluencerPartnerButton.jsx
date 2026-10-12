import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import EventSponsorContactDetails from "./EventSponsorContactDetails";

/**
 * Event-page influencer partner CTA — opens a modal with the same organizer contact details.
 */
export default function BecomeInfluencerPartnerButton({ email, phone, eventTitle }) {
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

  const modal = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="influencer-partner-backdrop"
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
            aria-labelledby="influencer-partner-title"
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/[0.04]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/60 px-5 py-5 sm:px-6">
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-violet-200/40 blur-2xl"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              />
              <button
                type="button"
                onClick={close}
                className="absolute right-3 top-3 grid h-11 w-11 place-content-center rounded-full text-slate-500 transition hover:bg-white/80 hover:text-slate-800 lg:h-8 lg:w-8"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="relative flex items-start gap-3 pr-8">
                <motion.div
                  className="grid h-11 w-11 shrink-0 place-content-center rounded-xl bg-slate-900 text-violet-300 shadow-md shadow-slate-900/20"
                  initial={{ rotate: -8, scale: 0.9 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 18 }}
                >
                  <Sparkles className="h-5 w-5" aria-hidden />
                </motion.div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-800/80">
                    Partner with us
                  </p>
                  <h2
                    id="influencer-partner-title"
                    className="mt-0.5 text-base font-bold tracking-tight text-slate-900 sm:text-lg"
                  >
                    Become an Influencer Partner
                  </h2>
                  {eventTitle ? (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{eventTitle}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              <p className="text-sm leading-relaxed text-slate-600">
                Are you an influencer? Partner with us to promote this event and get rewarded for your impact!
              </p>
              <EventSponsorContactDetails
                email={contactEmail}
                phone={contactPhone}
                eventTitle={eventTitle}
                inquirySubject={`Influencer partner inquiry — ${eventTitle || "your event"}`}
                compact
              />
              <p className="text-xs leading-relaxed text-slate-500">
                Tap email or phone to reach the organizer about influencer partnerships.
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
        className="event-action-btn inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-violet-200/90 bg-gradient-to-r from-violet-50 to-fuchsia-50 px-2.5 py-1.5 text-xs font-semibold text-violet-950 shadow-sm ring-1 ring-violet-900/[0.04] backdrop-blur-sm transition hover:border-violet-300 hover:from-violet-100 hover:to-fuchsia-100 hover:shadow-md lg:gap-2 lg:px-3 lg:min-h-0"
        aria-label="Influencer partner"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Sparkles className="event-action-glyph h-3.5 w-3.5 text-violet-700" aria-hidden />
        <span className="hidden lg:inline">Influencer Partner</span>
        <span className="event-action-label lg:hidden">Influencer</span>
      </motion.button>
      {typeof document !== "undefined" ? createPortal(modal, document.body) : null}
    </>
  );
}
