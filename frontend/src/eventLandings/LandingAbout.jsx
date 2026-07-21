import LandingReveal from "./LandingReveal";

export default function LandingAbout({ about }) {
  if (!about) return null;
  const id = about.id || "about";

  return (
    <section className="el-section el-about" id={id}>
      <div className="el-container">
        <LandingReveal>
          <div className="el-about__grid">
            <div>
              <p className="el-eyebrow">About</p>
              <h2 className="el-heading">{about.heading || "About"}</h2>
              {(about.paragraphs || []).map((p) => (
                <p key={p.slice(0, 48)}>{p}</p>
              ))}
              {about.directorCredit ? (
                <p className="el-about__credit">{about.directorCredit}</p>
              ) : null}
            </div>
            <div>
              {about.ctas?.length ? (
                <div className="el-about__ctas">
                  {about.ctas.map((cta) => (
                    <a
                      key={cta.label}
                      className={`el-btn ${cta.variant === "outline" ? "el-btn--outline" : "el-btn--primary"}`}
                      href={cta.href}
                    >
                      {cta.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
