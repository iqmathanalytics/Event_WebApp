/** Strip to digits for placeholder checks. */
function phoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

/**
 * Test / directory-style numbers that should never be stored on a user profile.
 * Booking rows may still keep whatever the buyer typed.
 */
function isPlaceholderPhone(value) {
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

/** Profile fields stay empty unless the person entered a real number themselves. */
function profileMobileOrNull(value) {
  const raw = String(value || "").trim();
  if (!raw || isPlaceholderPhone(raw)) {
    return null;
  }
  return raw;
}

module.exports = {
  phoneDigits,
  isPlaceholderPhone,
  profileMobileOrNull
};
