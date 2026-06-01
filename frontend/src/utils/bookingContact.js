export function splitFullName(full) {
  const parts = String(full || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) {
    return { firstName: "", lastName: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function formatBookingContactName({ firstName, lastName, name }) {
  const first = String(firstName || "").trim();
  const last = String(lastName || "").trim();
  if (first && last) {
    return `${first} ${last}`;
  }
  if (first) {
    return first;
  }
  if (last) {
    return last;
  }
  return String(name || "").trim();
}

export function validateBookingContactNames({ firstName, lastName, name }) {
  const first = String(firstName || "").trim();
  const last = String(lastName || "").trim();
  if (first.length < 1) {
    return { ok: false, message: "First name is required." };
  }
  if (last.length < 1) {
    return { ok: false, message: "Last name is required." };
  }
  const full = formatBookingContactName({ firstName: first, lastName: last, name });
  if (full.length < 2) {
    return { ok: false, message: "Enter a valid first and last name." };
  }
  return { ok: true, firstName: first, lastName: last, name: full };
}
