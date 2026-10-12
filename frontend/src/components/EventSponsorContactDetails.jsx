import { Handshake, Mail, Phone, Sparkles } from "lucide-react";

/**
 * Partner contact box for sponsor or influencer inquiries.
 * `variant`: "sponsor" | "influencer"
 */
export default function EventSponsorContactDetails({
  email,
  phone,
  eventTitle,
  compact = false,
  variant = "sponsor",
  inquirySubject = null
}) {
  const contactEmail = String(email || "").trim();
  const contactPhone = String(phone || "").trim();
  const isInfluencer = variant === "influencer";

  if (!contactEmail && !contactPhone) {
    return null;
  }

  const subject =
    inquirySubject ||
    (isInfluencer
      ? `Influencer partner inquiry — ${eventTitle || "your event"}`
      : `Sponsorship inquiry — ${eventTitle || "your event"}`);
  const mailto = contactEmail
    ? `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}`
    : null;
  const tel = contactPhone ? `tel:${contactPhone.replace(/[^\d+]/g, "")}` : null;

  const accent = isInfluencer
    ? {
        box: "border-violet-200/80 from-violet-50/90 via-white to-fuchsia-50/50 ring-violet-900/[0.04]",
        eyebrow: "text-violet-800/80",
        iconWrap: "text-violet-300",
        hover: "hover:border-violet-300 hover:bg-violet-50/60",
        iconFg: "text-violet-700",
        footer: "influencer partnerships"
      }
    : {
        box: "border-amber-200/80 from-amber-50/90 via-white to-orange-50/50 ring-amber-900/[0.04]",
        eyebrow: "text-amber-800/80",
        iconWrap: "text-amber-300",
        hover: "hover:border-amber-300 hover:bg-amber-50/60",
        iconFg: "text-amber-700",
        footer: "sponsorship packages"
      };

  const contactLinks = (
    <div className="space-y-2.5">
      {contactEmail ? (
        <a
          href={mailto}
          className={`flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white/90 px-3.5 py-3 text-sm font-medium text-slate-800 transition hover:text-slate-900 ${accent.hover}`}
        >
          <span
            className={`grid h-9 w-9 place-content-center rounded-lg bg-white shadow-sm ring-1 ring-slate-900/[0.04] ${accent.iconFg}`}
          >
            <Mail className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">email</span>
            <span className="block truncate">{contactEmail}</span>
          </span>
        </a>
      ) : null}

      {contactPhone ? (
        <a
          href={tel || undefined}
          className={`flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white/90 px-3.5 py-3 text-sm font-medium text-slate-800 transition hover:text-slate-900 ${accent.hover}`}
        >
          <span
            className={`grid h-9 w-9 place-content-center rounded-lg bg-white shadow-sm ring-1 ring-slate-900/[0.04] ${accent.iconFg}`}
          >
            <Phone className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</span>
            <span className="block truncate">{contactPhone}</span>
          </span>
        </a>
      ) : null}
    </div>
  );

  if (compact) {
    return <div className="space-y-2.5">{contactLinks}</div>;
  }

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br p-4 shadow-sm ring-1 sm:p-5 ${accent.box}`}
    >
      <div className="mb-3 flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-content-center rounded-xl bg-slate-900 shadow-md shadow-slate-900/15 ${accent.iconWrap}`}
        >
          {isInfluencer ? (
            <Sparkles className="h-5 w-5" aria-hidden />
          ) : (
            <Handshake className="h-5 w-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${accent.eyebrow}`}>
            Partner with us
          </p>
          <h2 className="mt-0.5 text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            {isInfluencer ? "Become an Influencer Partner" : "Become a sponsor for this event"}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            {isInfluencer
              ? "Are you an influencer? Partner with us to promote this event and get rewarded for your impact!"
              : "Put your brand in front of a live audience. Reach out to sponsor this show — we’d love to build something memorable together."}
          </p>
        </div>
      </div>

      {contactLinks}

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Tap email or phone to reach the organizer directly about {accent.footer}.
      </p>
    </div>
  );
}
