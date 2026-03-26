export function safeReturnPath(next) {
  if (!next || typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return null;
  }
  return next;
}
