const byLabelAsc = (a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" });

/** Display names for the five metros (same order as API). */
export const ALLOWED_CITY_NAMES_IN_ORDER = ["Atlanta", "Austin", "Dallas", "Houston", "San Antonio"];

/** Must match `APP_METRO_SEED` slugs in `src/services/cityService.js` (one row per slug). */
export const APP_METRO_SLUGS_IN_ORDER = ["atlanta-ga", "austin-tx", "dallas-tx", "houston-tx", "san-antonio-tx"];

/**
 * City dropdowns use `useCityFilter()` (loaded from `/meta/cities` with real DB ids).
 * Rows are filtered by `slug` so homonyms (e.g. Dallas GA) never appear.
 */
export function orderAllowedCities(rows) {
  const allowedSlugs = new Set(APP_METRO_SLUGS_IN_ORDER);
  return (rows || [])
    .filter((r) => r.slug && allowedSlugs.has(String(r.slug).trim()))
    .sort(
      (a, b) =>
        APP_METRO_SLUGS_IN_ORDER.indexOf(String(a.slug).trim()) -
        APP_METRO_SLUGS_IN_ORDER.indexOf(String(b.slug).trim())
    )
    .map((r) => ({
      value: String(r.value),
      label: r.label || r.name,
      name: r.name || r.label,
      state: r.state,
      slug: r.slug
    }));
}

export const categories = [
  { value: "1", label: "Music" },
  { value: "2", label: "Nightlife" },
  { value: "3", label: "Fashion" },
  { value: "4", label: "Food & Drinks" },
  { value: "5", label: "Beauty & Services" },
  { value: "6", label: "Comedy" },
  { value: "7", label: "Technology" },
  { value: "8", label: "Startup / Networking" },
  { value: "9", label: "Business / Conference" },
  { value: "10", label: "Health & Wellness" },
  { value: "11", label: "Fitness" },
  { value: "12", label: "Art & Culture" },
  { value: "13", label: "Festival" },
  { value: "14", label: "Workshops" },
  { value: "15", label: "Education" },
  { value: "16", label: "Family Events" },
  { value: "17", label: "Outdoor Events" },
  { value: "18", label: "Sports" },
  { value: "19", label: "Influencer Meetups" },
  { value: "20", label: "Community Events" }
].sort(byLabelAsc);

export const sortOptions = [
  { value: "popularity", label: "Popularity" },
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "price", label: "Price" }
].sort(byLabelAsc);
