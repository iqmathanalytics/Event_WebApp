function phoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

export function isPlaceholderPhone(value) {
  const digits = phoneDigits(value);
  if (!digits) {
    return true;
  }
  if (/^(\d)\1{6,}$/.test(digits)) {
    return true;
  }
  if (digits === "5551234567" || digits === "1234567890" || digits === "0123456789") {
    return true;
  }
  if (digits.length === 10 && digits.slice(3, 6) === "555") {
    return true;
  }
  if (digits.length === 11 && digits[0] === "1" && digits.slice(4, 7) === "555") {
    return true;
  }
  if (/^12345678/.test(digits)) {
    return true;
  }
  return false;
}

export function profileMobileOrEmpty(value) {
  const raw = String(value || "").trim();
  if (!raw || isPlaceholderPhone(raw)) {
    return "";
  }
  return raw;
}
