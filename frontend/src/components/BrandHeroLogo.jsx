import React from "react";
import { motion } from "framer-motion";

/** Smooth deceleration — avoids filter/blur glitches with gradient text */
const sleekEase = [0.25, 0.46, 0.45, 0.94];

const logoContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.08,
      staggerChildren: 0.11
    }
  }
};

const logoBit = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.72, ease: sleekEase }
  }
};

const bangExtra = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.62, ease: [0.34, 1.56, 0.64, 1] }
  }
};

function BrandHeroLogo({ className = "", entranceActive = true }) {
  return (
    <motion.div
      aria-label="Yay! Tickets"
      className={`yay-hero-logo ${className}`}
      style={{
        fontFamily: '"Sora", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        fontSize: "1em",
        letterSpacing: "-0.03em",
        lineHeight: 1
      }}
      variants={logoContainer}
      initial="hidden"
      animate={entranceActive ? "visible" : "hidden"}
    >
      <motion.span
        className="yay-hero-word yay-hero-strong yay-hero-gradient-text inline-block"
        variants={logoBit}
      >
        Yay
      </motion.span>
      <motion.span className="yay-hero-bang inline-block" variants={bangExtra}>
        !
      </motion.span>
      <motion.span
        className="yay-hero-word yay-hero-soft yay-hero-gradient-text inline-block"
        variants={logoBit}
      >
        &nbsp;Tickets
      </motion.span>
    </motion.div>
  );
}

export default BrandHeroLogo;
