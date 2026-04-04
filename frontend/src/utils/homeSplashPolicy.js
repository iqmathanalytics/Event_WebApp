/**
 * Landing splash: full document load / reload on home only — not on client-side navigation to /.
 * Import this module from main.jsx before the app tree so DOCUMENT_ENTRY_PATH matches the real entry URL.
 */

export const DOCUMENT_ENTRY_PATH = window.location.pathname || "";

let homeSplashConsumedInThisDocument = false;

function pathIsHome(path) {
  const p = path || "";
  return p === "/" || p === "";
}

/**
 * @returns {boolean}
 */
export function shouldShowHomeSplash() {
  if (homeSplashConsumedInThisDocument) {
    return false;
  }
  const entries = typeof performance !== "undefined" ? performance.getEntriesByType("navigation") : [];
  const nav = entries[0];
  const type = nav && "type" in nav ? nav.type : undefined;
  const pathNow = window.location.pathname || "";

  if (type === "reload") {
    return pathIsHome(pathNow);
  }

  return pathIsHome(DOCUMENT_ENTRY_PATH);
}

export function markHomeSplashConsumed() {
  homeSplashConsumedInThisDocument = true;
}
