function splitFullName(full) {
  const parts = String(full || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) {
    return { first_name: "", last_name: "" };
  }
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: "" };
  }
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

function formatBookingContactName({ first_name, last_name, name }) {
  const first = String(first_name || "").trim();
  const last = String(last_name || "").trim();
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

function assertBookingContactNames({ first_name, last_name, name }) {
  const first = String(first_name || "").trim();
  const last = String(last_name || "").trim();
  if (first.length < 1) {
    return { ok: false, message: "First name is required." };
  }
  if (last.length < 1) {
    return { ok: false, message: "Last name is required." };
  }
  const full = formatBookingContactName({ first_name: first, last_name: last, name });
  if (full.length < 2) {
    return { ok: false, message: "Enter a valid first and last name." };
  }
  return { ok: true, first_name: first, last_name: last, name: full };
}

module.exports = {
  splitFullName,
  formatBookingContactName,
  assertBookingContactNames
};
