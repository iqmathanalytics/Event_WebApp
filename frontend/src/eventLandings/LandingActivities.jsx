import LandingLeadForm from "./LandingLeadForm";
import LandingReveal from "./LandingReveal";

export default function LandingActivities({ activities }) {
  if (!activities) return null;
  const id = activities.id || "activities";
  const hasCards = activities.cards?.length > 0;
  const hasForm = activities.form?.fields?.length > 0;
  if (!hasCards && !hasForm) return null;

  return (
    <section className="el-section" id={id}>
      <div className="el-container">
        <LandingReveal>
          <p className="el-eyebrow">Participate</p>
          <h2 className="el-heading">{activities.heading || "Get Involved"}</h2>
        </LandingReveal>

        {hasCards ? (
          <div className="el-cards">
            {activities.cards.map((card, idx) => (
              <LandingReveal key={card.title} delay={idx * 0.06}>
                <article className="el-card">
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              </LandingReveal>
            ))}
          </div>
        ) : null}

        {hasForm ? (
          <LandingReveal delay={0.1}>
            <LandingLeadForm form={activities.form} idPrefix="el-act" />
          </LandingReveal>
        ) : null}
      </div>
    </section>
  );
}
