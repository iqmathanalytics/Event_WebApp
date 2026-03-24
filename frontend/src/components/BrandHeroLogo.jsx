import React from "react";

function BrandHeroLogo({ className = "" }) {
  return (
    <h1
      className={`yay-hero-logo ${className}`}
      style={{
        fontFamily: '"Sora", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: "1em",
        letterSpacing: "-0.03em",
        lineHeight: 1,
      }}
    >
      <span className="yay-hero-word yay-hero-strong yay-hero-gradient-text inline-block">Yay</span>
      <span className="yay-hero-bang inline-block">!</span>
      <span className="yay-hero-word yay-hero-soft yay-hero-gradient-text inline-block">&nbsp;Tickets</span>
    </h1>
  );
}

export default BrandHeroLogo;
