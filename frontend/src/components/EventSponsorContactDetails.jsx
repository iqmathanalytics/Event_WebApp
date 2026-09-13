import { Handshake, Mail, Phone } from "lucide-react";

/**
 * Inline sponsor contact block (same details as the Become a Sponsor modal).
 */
export default function EventSponsorContactDetails({ email, phone, eventTitle, compact = false }) {
  const contactEmail = String(email || "").trim();
  const contactPhone = String(phone || "").trim();

  if (!contactEmail && !contactPhone) {
    return null;
  }

  const mailto = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(`Sponsorship inquiry — ${eventTitle || "your event"}`)}`
    : null;
  const tel = contactPhone ? `tel:${contactPhone.replace(/[^\d+]/g, "")}` : null;

  return (
    <div
      className={
        compact
          ? "space-y-2.5"
          : "rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/50 p-4 shadow-sm ring-1 ring-amber-900/[0.04] sm:p-5"
      }
    >
      {!compact ? (
        <div className="mb-3 flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-content-center rounded-xl bg-slate-900 text-amber-300 shadow-md shadow-slate-900/15">
            <Handshake className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-800/80">Partner with us</p>
            <h2 className="mt-0.5 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
              Become a sponsor for this event
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Put your brand in front of a live audience. Reach out to sponsor this show — we’d love to build
              something memorable together.
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-2.5">
        {contactEmail ? (
          <a
            href={mailto}
            className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white/90 px-3.5 py-3 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50/60 hover:text-slate-900"
          >
            <span className="grid h-9 w-9 place-content-center rounded-lg bg-white text-amber-700 shadow-sm ring-1 ring-slate-900/[0.04]">
              <Mail className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</span>
              <span className="block truncate">{contactEmail}</span>
            </span>
          </a>
        ) : null}

        {contactPhone ? (
          <a
            href={tel || undefined}
            className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white/90 px-3.5 py-3 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50/60 hover:text-slate-900"
          >
            <span className="grid h-9 w-9 place-content-center rounded-lg bg-white text-amber-700 shadow-sm ring-1 ring-slate-900/[0.04]">
              <Phone className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</span>
              <span className="block truncate">{contactPhone}</span>
            </span>
          </a>
        ) : null}
      </div>

      {!compact ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Tap email or phone to reach the organizer directly about sponsorship packages.
        </p>
      ) : null}
    </div>
  );
}
