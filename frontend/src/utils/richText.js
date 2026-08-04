import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "a",
  "h2",
  "h3",
  "blockquote"
];

const ALLOWED_ATTR = ["href", "target", "rel", "class"];

/** True when the string already contains HTML tags. */
export function looksLikeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ""));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strip tags for hero copy, truncation, and empty checks. */
export function plainTextFromHtml(value) {
  const raw = String(value || "");
  if (!raw.trim()) {
    return "";
  }
  if (!looksLikeHtml(raw)) {
    return raw.replace(/\s+/g, " ").trim();
  }
  return raw
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<\/li>/gi, " ")
    .replace(/<\/h[1-6]>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRichTextEmpty(value) {
  return !plainTextFromHtml(value);
}

/** Sanitize HTML for safe display / storage (browser). */
export function sanitizeRichTextHtml(value) {
  const raw = String(value || "");
  if (!raw.trim()) {
    return "";
  }
  if (!looksLikeHtml(raw)) {
    return raw;
  }
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false
  });
}

/**
 * Convert stored description (plain or HTML) into HTML TipTap can load.
 * Existing plain-text events keep their content via escaped paragraphs.
 */
export function toEditorHtml(value) {
  const raw = String(value || "");
  if (!raw.trim()) {
    return "";
  }
  if (looksLikeHtml(raw)) {
    return sanitizeRichTextHtml(raw);
  }
  return raw
    .split(/\n{2,}/)
    .map((block) => {
      const lines = escapeHtml(block).replace(/\n/g, "<br>");
      return `<p>${lines}</p>`;
    })
    .join("");
}

/** Truncate for guest previews using plain text (never cuts mid-tag). */
export function truncateDescriptionPlain(value, maxLen = 240) {
  const plain = plainTextFromHtml(value);
  if (!plain) {
    return "";
  }
  if (plain.length <= maxLen) {
    return plain;
  }
  return `${plain.slice(0, maxLen).trim()}...`;
}
