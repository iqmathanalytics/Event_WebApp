const byLabelAsc = (a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" });

/** Legacy metro list — dropdown cities are managed in DB (`show_in_dropdown`). */
export const ALLOWED_CITY_NAMES_IN_ORDER = [
  "Atlanta",
  "Austin",
  "Dallas",
  "Houston",
  "San Antonio",
  "Simi Valley",
  "Boise",
  "Phoenix",
  "San Francisco",
  "Ashburn",
  "Raleigh"
];

export const APP_METRO_SLUGS_IN_ORDER = [
  "atlanta-ga",
  "austin-tx",
  "dallas-tx",
  "houston-tx",
  "san-antonio-tx",
  "simi-valley-ca",
  "boise-id",
  "phoenix-az",
  "san-francisco-ca",
  "ashburn-va",
  "raleigh-nc"
];

/** Must match `OTHERS_CITY` in `src/services/cityService.js` (not shown in public city dropdowns). */
export const OTHERS_CITY_SLUG = "others-us";

const ALLOWED_CITY_SLUGS_IN_ORDER = [...APP_METRO_SLUGS_IN_ORDER];

function citySlugSortIndex(slug) {
  const normalized = String(slug || "").trim();
  const index = ALLOWED_CITY_SLUGS_IN_ORDER.indexOf(normalized);
  return index === -1 ? 999 : index;
}

function formatCityOptionLabel(row) {
  return row.label || row.name || "";
}

/**
 * City dropdowns use `useCityFilter()` (loaded from `/meta/cities` with real DB ids).
 * Rows are filtered by `slug` so homonyms (e.g. Dallas GA) never appear.
 */
export function orderAllowedCities(rows) {
  return (rows || [])
    .sort((a, b) => {
      const orderDiff = citySlugSortIndex(a.slug) - citySlugSortIndex(b.slug);
      if (orderDiff !== 0) {
        return orderDiff;
      }
      return formatCityOptionLabel(a).localeCompare(formatCityOptionLabel(b), "en", {
        sensitivity: "base"
      });
    })
    .map((r) => ({
      value: String(r.value),
      label: formatCityOptionLabel(r),
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
  { value: "event_date", label: "Event date" },
  { value: "popularity", label: "Popularity" },
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "price", label: "Price" }
];
