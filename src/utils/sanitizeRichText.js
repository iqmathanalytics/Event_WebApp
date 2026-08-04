const sanitizeHtml = require("sanitize-html");

const OPTIONS = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "a", "h2", "h3", "blockquote"],
  allowedAttributes: {
    a: ["href", "name", "target", "rel"]
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer nofollow",
      target: "_blank"
    })
  }
};

function looksLikeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ""));
}

/**
 * Sanitize event description HTML before persist.
 * Plain-text legacy values are returned unchanged (trimmed).
 */
function sanitizeEventDescription(input) {
  if (input == null) {
    return input;
  }
  const raw = String(input);
  if (!raw.trim()) {
    return "";
  }
  if (!looksLikeHtml(raw)) {
    return raw.trim();
  }
  return sanitizeHtml(raw, OPTIONS).trim();
}

module.exports = {
  sanitizeEventDescription
};
