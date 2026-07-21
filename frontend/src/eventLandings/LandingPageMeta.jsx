import { useEffect } from "react";

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Client-side SEO for SPA event landings (title, description, OG, Twitter, canonical).
 */
export default function LandingPageMeta({ seo, brandName }) {
  useEffect(() => {
    if (!seo) return;

    const prevTitle = document.title;
    const title = seo.title || brandName || "Event";
    document.title = title;

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const canonical = seo.canonicalPath
      ? `${origin}${seo.canonicalPath.startsWith("/") ? seo.canonicalPath : `/${seo.canonicalPath}`}`
      : window.location.href;
    const ogImage = seo.ogImage
      ? seo.ogImage.startsWith("http")
        ? seo.ogImage
        : `${origin}${seo.ogImage}`
      : undefined;

    upsertMeta("name", "description", seo.description);
    upsertLink("canonical", canonical);

    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", seo.description);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:url", canonical);
    if (ogImage) upsertMeta("property", "og:image", ogImage);

    upsertMeta("name", "twitter:card", seo.twitterCard || "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", seo.description);
    if (ogImage) upsertMeta("name", "twitter:image", ogImage);

    return () => {
      document.title = prevTitle;
    };
  }, [seo, brandName]);

  return null;
}
