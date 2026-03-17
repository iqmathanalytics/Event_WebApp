export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function formatDateUS(value) {
  if (!value) {
    return "";
  }
  const normalized = String(value).slice(0, 10);
  const parsed = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  }).format(parsed);
}
