const SEATING_MODES = Object.freeze({
  GENERAL: "general",
  RESERVED: "reserved"
});

function normalizeSeatingMode(value) {
  const raw = String(value || SEATING_MODES.GENERAL).trim().toLowerCase();
  return raw === SEATING_MODES.RESERVED ? SEATING_MODES.RESERVED : SEATING_MODES.GENERAL;
}

function isReservedSeating(event) {
  return normalizeSeatingMode(event?.seating_mode) === SEATING_MODES.RESERVED;
}

module.exports = {
  SEATING_MODES,
  normalizeSeatingMode,
  isReservedSeating
};
