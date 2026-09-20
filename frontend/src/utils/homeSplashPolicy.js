/**
 * Landing splash: full document load / reload on home only — not on client-side navigation to /.
 * Import this module from main.jsx before the app tree so DOCUMENT_ENTRY_PATH matches the real entry URL.
 *
 * Visual splash lives in index.html (#bmt-boot-splash). React only times the dismiss so there is
 * never a second overlay that replaces the first paint.
 */

export const DOCUMENT_ENTRY_PATH = window.location.pathname || "";

export const BOOT_SPLASH_ROOT_ID = "bmt-boot-splash";
export const BOOT_SPLASH_LOGO_ID = "bmt-boot-splash-logo";
export const BOOT_SPLASH_CAPTION_ID = "bmt-boot-splash-caption";

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

export function getHomeBootSplashRoot() {
  if (typeof document === "undefined") {
    return null;
  }
  return document.getElementById(BOOT_SPLASH_ROOT_ID);
}

export function getHomeBootSplashLogo() {
  if (typeof document === "undefined") {
    return null;
  }
  return document.getElementById(BOOT_SPLASH_LOGO_ID);
}

export function setHomeBootSplashCaption(text) {
  const el = typeof document === "undefined" ? null : document.getElementById(BOOT_SPLASH_CAPTION_ID);
  if (el && text) {
    el.textContent = text;
  }
}

/** Lower z-index so the flying logo can sit above; hide the static logo for the clone. */
export function beginHomeBootHandoff() {
  const root = getHomeBootSplashRoot();
  const logo = getHomeBootSplashLogo();
  if (logo) {
    logo.style.visibility = "hidden";
  }
  if (root) {
    root.classList.add("bmt-boot-handoff");
  }
}

export function fadeHomeBootSplash() {
  const root = getHomeBootSplashRoot();
  if (root) {
    root.classList.add("bmt-boot-exit");
  }
}

export function hideHomeBootSplash() {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.classList.remove("bmt-home-boot");
  const el = getHomeBootSplashRoot();
  if (el) {
    el.remove();
  }
}
