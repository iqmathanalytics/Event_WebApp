import { looksLikeHtml, sanitizeRichTextHtml } from "../utils/richText";

/**
 * Renders event description: sanitized HTML when rich, plain text otherwise.
 * Legacy plain-text descriptions keep newlines via whitespace-pre-wrap.
 */
export default function RichTextContent({
  html,
  className = "text-[15px] font-medium leading-relaxed text-slate-800 lg:text-sm lg:leading-6",
  emptyLabel = "No event description provided yet."
}) {
  const raw = String(html || "");
  if (!raw.trim()) {
    return <p className={className}>{emptyLabel}</p>;
  }

  if (!looksLikeHtml(raw)) {
    return <p className={`${className} whitespace-pre-wrap`}>{raw}</p>;
  }

  const safe = sanitizeRichTextHtml(raw);
  if (!safe.trim()) {
    return <p className={className}>{emptyLabel}</p>;
  }

  return (
    <div
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
