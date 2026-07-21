import LandingReveal from "./LandingReveal";

export default function LandingExperience({ experience }) {
  if (!experience?.items?.length) return null;
  const id = experience.id || "experience";

  return (
    <section className="el-section el-experience" id={id}>
      <div className="el-container">
        <LandingReveal>
          <p className="el-eyebrow">Highlights</p>
          <h2 className="el-heading">{experience.heading || "The Experience"}</h2>
        </LandingReveal>

        <div className="el-experience__grid">
          {experience.items.map((item, idx) => (
            <LandingReveal key={item.title} delay={idx * 0.08}>
              <article className="el-experience__card">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            </LandingReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
