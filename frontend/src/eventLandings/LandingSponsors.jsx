import LandingLeadForm from "./LandingLeadForm";
import LandingReveal from "./LandingReveal";

export default function LandingSponsors({ sponsors }) {
  if (!sponsors) return null;
  const id = sponsors.id || "sponsors";
  const hasTitle = Boolean(sponsors.titleSponsor);
  const hasTiers = sponsors.tiers?.length > 0;
  const hasForm = sponsors.enquiryForm?.fields?.length > 0;
  if (!hasTitle && !hasTiers && !hasForm) return null;

  return (
    <section className="el-section el-sponsors" id={id}>
      <div className="el-container">
        <LandingReveal>
          <p className="el-eyebrow">Partners</p>
          <h2 className="el-heading">{sponsors.heading || "Sponsors"}</h2>
        </LandingReveal>

        {hasTitle ? (
          <LandingReveal>
            <div className="el-sponsors__title">
              <span className="el-eyebrow">Title sponsor</span>
              {sponsors.titleSponsor.href ? (
                <a href={sponsors.titleSponsor.href} target="_blank" rel="noopener noreferrer">
                  <img
                    src={sponsors.titleSponsor.logoSrc}
                    alt={sponsors.titleSponsor.name || "Title sponsor"}
                  />
                </a>
              ) : (
                <img
                  src={sponsors.titleSponsor.logoSrc}
                  alt={sponsors.titleSponsor.name || "Title sponsor"}
                />
              )}
            </div>
          </LandingReveal>
        ) : null}

        {hasTiers
          ? sponsors.tiers.map((tier) => (
              <div className="el-sponsors__tier" key={tier.name}>
                <h3>{tier.name}</h3>
                <div className="el-sponsors__logos">
                  {(tier.logos || []).map((logo) =>
                    logo.href ? (
                      <a
                        key={logo.name}
                        href={logo.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img src={logo.logoSrc} alt={logo.name} />
                      </a>
                    ) : (
                      <img key={logo.name} src={logo.logoSrc} alt={logo.name} />
                    )
                  )}
                </div>
              </div>
            ))
          : null}

        {hasForm ? (
          <LandingReveal delay={0.08}>
            <LandingLeadForm form={sponsors.enquiryForm} idPrefix="el-spn" />
          </LandingReveal>
        ) : null}
      </div>
    </section>
  );
}
