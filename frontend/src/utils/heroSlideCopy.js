/** Copy blocks for the hero text column, synced to the active slideshow slide */

export const DEFAULT_HERO_NARRATIVE = {
  headline: "Discover events, deals, and creators around you.",
  subline:
    "Explore trusted local experiences with one unified platform built for city life."
};

function truncateTitle(raw, max = 46) {
  const t = String(raw || "").trim();
  if (!t) return "this handpicked moment";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/**
 * @param {{ title?: string, variant?: string, countdownLabel?: string | null }} slide
 */
export function buildHeroNarrativeFromSlide(slide) {
  const title = slide?.title || "Featured experience";
  const short = truncateTitle(title);
  const countdown = slide?.countdownLabel ? String(slide.countdownLabel) : "";
  const isYay = slide?.variant === "yay";

  if (isYay) {
    return {
      headline: `Yay! members get the glow-up on ${short}`,
      subline: countdown
        ? `${countdown} until go-time — early access, add-ons, and perks that turn a ticket into a flex.`
        : "The Yay! circle locked this one early — unlock perks, skip FOMO, and feel like an insider."
    };
  }

  return {
    headline: `Tonight’s energy: ${short}`,
    subline: countdown
      ? `Clock says ${countdown} — grab seats while the group chat is still hyping it.`
      : "Handpicked for your city: the rooms, stages, and tables where stories actually happen."
  };
}
