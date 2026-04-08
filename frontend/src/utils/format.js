export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

/**
 * US short date: "MM/DD/YYYY" (zero-padded month and day).
 * Accepts `YYYY-MM-DD`, ISO datetimes, and other strings `Date` can parse.
 */
export function formatDateUS(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const s = String(value).trim();
  let parsed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    parsed = new Date(`${s}T00:00:00`);
  } else {
    parsed = new Date(s);
  }
  if (Number.isNaN(parsed.getTime())) {
    return s;
  }
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const yyyy = String(parsed.getFullYear());
  return `${mm}/${dd}/${yyyy}`;
}
