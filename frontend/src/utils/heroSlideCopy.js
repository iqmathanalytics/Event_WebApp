/** Copy blocks for the hero text column, synced to the active slideshow slide */

export const DEFAULT_HERO_NARRATIVE = {
  headline: "Discover events, deals, and creators around you.",
  subline:
    "Explore trusted local experiences with Book My Tickets — one platform built for city life.",
  detailPath: null
};

function trimDescription(raw, max = 720) {
  const text = String(raw || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).trim()}…`;
}

/**
 * @param {{ title?: string, description?: string, variant?: string, countdownLabel?: string | null, detailPath?: string | null }} slide
 */
export function buildHeroNarrativeFromSlide(slide) {
  const title = String(slide?.title || "").trim() || DEFAULT_HERO_NARRATIVE.headline;
  const description =
    trimDescription(slide?.description) ||
    "See dates, venue, and ticket options on the event page.";

  return {
    headline: title,
    subline: description,
    detailPath: slide?.detailPath || null
  };
}
