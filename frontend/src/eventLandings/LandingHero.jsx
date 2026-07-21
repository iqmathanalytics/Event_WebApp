import { useState } from "react";
import LandingCountdown from "./LandingCountdown";
import LandingReveal from "./LandingReveal";

export default function LandingHero({ hero }) {
  const [bannerVisible, setBannerVisible] = useState(Boolean(hero?.banner?.text));

  if (!hero) return null;

  return (
    <header className="el-hero" id="top">
      <div className="el-hero__media" aria-hidden="true">
        {hero.backgroundType === "video" && hero.backgroundSrc ? (
          <video src={hero.backgroundSrc} autoPlay muted loop playsInline />
        ) : hero.backgroundSrc ? (
          <img src={hero.backgroundSrc} alt="" />
        ) : null}
      </div>
      <div className="el-hero__scrim" aria-hidden="true" />

      <div className="el-container">
        {bannerVisible && hero.banner?.text ? (
          <div className="el-hero__banner" role="status">
            <span>{hero.banner.text}</span>
            {hero.banner.dismissible !== false ? (
              <button
                type="button"
                aria-label="Dismiss banner"
                onClick={() => setBannerVisible(false)}
              >
                ×
              </button>
            ) : null}
          </div>
        ) : null}

        <LandingReveal>
          <h1 className="el-hero__title">{hero.title}</h1>
          {hero.subtitle ? <p className="el-hero__subtitle">{hero.subtitle}</p> : null}

          {hero.facts?.length ? (
            <dl className="el-hero__facts">
              {hero.facts.map((fact) => (
                <div className="el-hero__fact" key={`${fact.label}-${fact.value}`}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="el-hero__ctas">
            {hero.primaryCta?.href ? (
              <a className="el-btn el-btn--primary" href={hero.primaryCta.href}>
                {hero.primaryCta.label || "Buy tickets"}
              </a>
            ) : null}
            {hero.secondaryCta?.href ? (
              <a className="el-btn el-btn--outline" href={hero.secondaryCta.href}>
                {hero.secondaryCta.label || "Learn more"}
              </a>
            ) : null}
          </div>

          <LandingCountdown eventDateIso={hero.eventDateIso} />
        </LandingReveal>
      </div>
    </header>
  );
}
