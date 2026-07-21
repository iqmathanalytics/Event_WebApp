import { useMemo, useState } from "react";
import LandingReveal from "./LandingReveal";

function toEmbedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

export default function LandingTickets({ tickets }) {
  const [videoOpen, setVideoOpen] = useState(false);
  const embedUrl = useMemo(() => toEmbedUrl(tickets?.howToVideoUrl), [tickets?.howToVideoUrl]);

  if (!tickets) return null;
  const id = tickets.id || "tickets";
  const isExternal = tickets.mode !== "internal";

  const primaryHref = isExternal
    ? tickets.externalUrl
    : tickets.internalCheckoutUrl || tickets.externalUrl;

  return (
    <section className="el-section el-tickets" id={id}>
      <div className="el-container">
        <LandingReveal>
          <p className="el-eyebrow">Access</p>
          <h2 className="el-heading">{tickets.heading || "Tickets"}</h2>

          <div className="el-tickets__panel">
            <div>
              {tickets.promoCode ? (
                <div className="el-tickets__promo">
                  <p className="el-eyebrow" style={{ marginBottom: "0.35rem" }}>
                    Promo code
                  </p>
                  <p className="el-tickets__code">{tickets.promoCode}</p>
                  {tickets.promoHint ? (
                    <p className="el-lede" style={{ fontSize: "0.9rem" }}>
                      {tickets.promoHint}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="el-tickets__actions">
                {primaryHref ? (
                  <a
                    className="el-btn el-btn--primary"
                    href={primaryHref}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                  >
                    {tickets.unlockLabel || (isExternal ? "Unlock tickets" : "Buy tickets")}
                  </a>
                ) : null}
                {embedUrl ? (
                  <button
                    type="button"
                    className="el-btn el-btn--outline"
                    onClick={() => setVideoOpen(true)}
                  >
                    How to buy
                  </button>
                ) : null}
              </div>

              {tickets.note ? <p className="el-tickets__note">{tickets.note}</p> : null}
            </div>

            {tickets.seatMapImage ? (
              <div className="el-tickets__map">
                <img src={tickets.seatMapImage} alt="Seat map preview" />
              </div>
            ) : null}
          </div>
        </LandingReveal>
      </div>

      {videoOpen && embedUrl ? (
        <div
          className="el-modal"
          role="dialog"
          aria-modal="true"
          aria-label="How to buy tickets"
          onClick={() => setVideoOpen(false)}
        >
          <div className="el-modal__panel" onClick={(e) => e.stopPropagation()}>
            <div className="el-modal__head">
              <strong>How to buy</strong>
              <button type="button" aria-label="Close" onClick={() => setVideoOpen(false)}>
                ×
              </button>
            </div>
            <div className="el-modal__frame">
              <iframe
                title="How to buy tickets"
                src={embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
