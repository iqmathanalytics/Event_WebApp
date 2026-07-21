import LandingReveal from "./LandingReveal";

export default function LandingPresenters({ presenters }) {
  if (!presenters?.logos?.length && !presenters?.poweredBy) return null;

  return (
    <section className="el-section el-section--tight el-presenters">
      <div className="el-container">
        <LandingReveal>
          {presenters.heading ? <p className="el-eyebrow">{presenters.heading}</p> : null}
          {presenters.logos?.length ? (
            <div className="el-presenters__logos">
              {presenters.logos.map((logo) =>
                logo.href ? (
                  <a key={logo.name} href={logo.href}>
                    <img src={logo.logoSrc} alt={logo.name} />
                  </a>
                ) : (
                  <img key={logo.name} src={logo.logoSrc} alt={logo.name} />
                )
              )}
            </div>
          ) : null}
          {presenters.poweredBy ? (
            <p className="el-presenters__powered">{presenters.poweredBy}</p>
          ) : null}
        </LandingReveal>
      </div>
    </section>
  );
}
