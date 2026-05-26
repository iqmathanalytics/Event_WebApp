/**
 * Public listing URLs: /events/jazz-night-at-the-park-514878
 * Suffix numeric id guarantees uniqueness and stable lookups.
 */

function slugifyText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

function buildListingPublicSlug(titleOrName, id) {
  const base = slugifyText(titleOrName) || "listing";
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return base.slice(0, 200);
  }
  const suffix = `-${numericId}`;
  const maxBase = Math.max(1, 200 - suffix.length);
  return `${base.slice(0, maxBase)}${suffix}`;
}

/**
 * @param {string} param - URL segment (numeric id or public slug)
 * @returns {{ id: number|null, slug: string|null }}
 */
function resolveListingIdFromParam(param) {
  const raw = String(param || "").trim();
  if (!raw) {
    return { id: null, slug: null };
  }
  if (/^\d+$/.test(raw)) {
    return { id: Number(raw), slug: null };
  }
  const match = raw.match(/^(.*)-(\d+)$/);
  if (match && /^\d+$/.test(match[2])) {
    return { id: Number(match[2]), slug: raw };
  }
  return { id: null, slug: raw };
}

module.exports = {
  slugifyText,
  buildListingPublicSlug,
  resolveListingIdFromParam
};
