import LandingReveal from "./LandingReveal";

export default function LandingVipPerk({ vipPerk }) {
  if (!vipPerk) return null;
  const id = vipPerk.id || "vip";

  return (
    <section className="el-section el-section--tight" id={id}>
      <div className="el-container">
        <LandingReveal>
          <div className="el-vip">
            <p className="el-eyebrow">Exclusive</p>
            <h2 className="el-heading">{vipPerk.heading || "VIP Access"}</h2>
            {vipPerk.body ? <p>{vipPerk.body}</p> : null}
            {vipPerk.cta?.href ? (
              <div style={{ marginTop: "1.25rem" }}>
                <a className="el-btn el-btn--primary" href={vipPerk.cta.href}>
                  {vipPerk.cta.label || "Learn more"}
                </a>
              </div>
            ) : null}
          </div>
        </LandingReveal>
      </div>
    </section>
  );
}
