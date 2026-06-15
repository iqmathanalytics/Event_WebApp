export const SEATING_MODES = Object.freeze({
  GENERAL: "general",
  RESERVED: "reserved"
});

export function normalizeSeatingMode(value) {
  const raw = String(value || SEATING_MODES.GENERAL).trim().toLowerCase();
  return raw === SEATING_MODES.RESERVED ? SEATING_MODES.RESERVED : SEATING_MODES.GENERAL;
}

export function isReservedSeating(event) {
  return normalizeSeatingMode(event?.seating_mode) === SEATING_MODES.RESERVED;
}
