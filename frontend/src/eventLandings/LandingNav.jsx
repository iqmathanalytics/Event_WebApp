import { useMemo, useState } from "react";

function buildNavItems(config) {
  const items = [];
  if (config.about) items.push({ id: config.about.id || "about", label: "About" });
  if (config.media?.items?.length) items.push({ id: config.media.id || "media", label: "Media" });
  if (config.experience?.items?.length) {
    items.push({ id: config.experience.id || "experience", label: "Experience" });
  }
  if (config.tickets) items.push({ id: config.tickets.id || "tickets", label: "Tickets" });
  if (config.vipPerk) items.push({ id: config.vipPerk.id || "vip", label: "VIP" });
  if (config.activities) items.push({ id: config.activities.id || "activities", label: "Join" });
  if (config.sponsors) items.push({ id: config.sponsors.id || "sponsors", label: "Sponsors" });
  return items;
}

export default function LandingNav({ config }) {
  const [open, setOpen] = useState(false);
  const items = useMemo(() => buildNavItems(config), [config]);
  const brand = config.brand || {};
  const ticketsHref = `#${config.tickets?.id || "tickets"}`;

  const close = () => setOpen(false);

  return (
    <nav className="el-nav" aria-label="Event">
      <div className="el-nav__inner">
        <a className="el-nav__brand" href="#top" onClick={close}>
          {brand.logoSrc ? (
            <img src={brand.logoSrc} alt="" />
          ) : null}
          <span>{brand.name || "Event"}</span>
        </a>

        <ul className="el-nav__links">
          {items.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`}>{item.label}</a>
            </li>
          ))}
        </ul>

        <div className="el-nav__actions">
          {config.tickets ? (
            <a className="el-btn el-btn--primary" href={ticketsHref}>
              Buy tickets
            </a>
          ) : null}
          <button
            type="button"
            className="el-nav__menu-btn"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      <div className={`el-nav__drawer${open ? " is-open" : ""}`}>
        {items.map((item) => (
          <a key={item.id} href={`#${item.id}`} onClick={close}>
            {item.label}
          </a>
        ))}
        {config.tickets ? (
          <a href={ticketsHref} onClick={close}>
            Buy tickets
          </a>
        ) : null}
      </div>
    </nav>
  );
}
