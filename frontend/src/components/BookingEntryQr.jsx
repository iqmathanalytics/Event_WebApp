import { ticketQrImageUrl } from "../utils/bookingCheckIn";

/**
 * Entry QR for a paid/free booking that has a check-in code.
 * Uses the same public PNG endpoint as confirmation emails.
 */
export default function BookingEntryQr({
  booking,
  size = 160,
  className = "",
  compact = false
}) {
  const code = String(booking?.check_in_code || "").trim();
  const show = Boolean(booking?.has_ticket_qr && code);
  if (!show) {
    return null;
  }

  const src = ticketQrImageUrl(code);
  if (!src) {
    return null;
  }

  const checkedIn = Boolean(booking?.checked_in || booking?.checked_in_at);
  const px = Math.max(96, Math.min(240, Number(size) || 160));

  return (
    <div
      className={[
        compact
          ? "flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5"
          : "flex flex-col items-center rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 py-4 text-center",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <img
        src={src}
        alt="Entry QR code"
        width={px}
        height={px}
        className={[
          "rounded-xl border-4 border-white bg-white shadow-sm",
          compact ? "h-24 w-24 shrink-0" : "h-auto w-full max-w-[11rem]"
        ].join(" ")}
        style={compact ? undefined : { width: px, height: px }}
        loading="lazy"
        decoding="async"
      />
      <div className={compact ? "min-w-0 flex-1 text-left" : "mt-3"}>
        <p className={`font-semibold text-slate-900 ${compact ? "text-xs" : "text-sm"}`}>
          {compact ? "Entry QR" : "Show this QR at the venue"}
        </p>
        <p className={`mt-0.5 text-slate-500 ${compact ? "text-[11px] leading-snug" : "text-xs"}`}>
          {checkedIn ? "Already checked in" : "Staff will scan this code for check-in"}
        </p>
      </div>
    </div>
  );
}
