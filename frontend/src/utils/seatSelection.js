function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function seatLabelPrefix(label) {
  const raw = String(label || "").trim();
  if (!raw) {
    return "";
  }
  const dash = raw.indexOf("-");
  return dash > 0 ? raw.slice(0, dash).trim() : raw;
}

export function resolveLevelIdForSeat(seat, levels = []) {
  const list = levels || [];
  if (!list.length) {
    return null;
  }

  const categoryLabel = normalizeKey(seat?.category_label);
  if (categoryLabel) {
    const exact = list.find((level) => normalizeKey(level.name) === categoryLabel);
    if (exact?.id) {
      return String(exact.id);
    }
    const partial = list.find((level) => {
      const name = normalizeKey(level.name);
      return name && (categoryLabel.includes(name) || name.includes(categoryLabel));
    });
    if (partial?.id) {
      return String(partial.id);
    }
  }

  const prefix = normalizeKey(seatLabelPrefix(seat?.label));
  if (prefix) {
    const byPrefix = list.find((level) => normalizeKey(level.name) === prefix);
    if (byPrefix?.id) {
      return String(byPrefix.id);
    }
  }

  const category = Number(seat?.category);
  if (Number.isFinite(category) && category >= 1 && list[category - 1]?.id) {
    return String(list[category - 1].id);
  }

  return list[0]?.id ? String(list[0].id) : null;
}

export function buildCartFromSelectedSeats(selectedSeats, levels) {
  const cart = {};
  for (const level of levels || []) {
    if (level?.id) {
      cart[String(level.id)] = 0;
    }
  }
  for (const seat of selectedSeats || []) {
    const levelId = resolveLevelIdForSeat(seat, levels);
    if (levelId) {
      cart[levelId] = (cart[levelId] || 0) + 1;
    }
  }
  return cart;
}

export function groupSelectedSeatsForDisplay(selectedSeats, levels) {
  const groups = new Map();
  for (const seat of selectedSeats || []) {
    const levelId = resolveLevelIdForSeat(seat, levels) || "unknown";
    const level = (levels || []).find((row) => String(row.id) === levelId);
    if (!groups.has(levelId)) {
      groups.set(levelId, {
        levelId,
        levelName: level?.name || seat.category_label || "Ticket",
        seatLabels: []
      });
    }
    groups.get(levelId).seatLabels.push(seat.label);
  }
  return Array.from(groups.values()).sort((a, b) => a.levelName.localeCompare(b.levelName));
}

export function buildTicketItemsFromSelectedSeats(selectedSeats, levels) {
  const cart = buildCartFromSelectedSeats(selectedSeats, levels);
  return Object.entries(cart)
    .filter(([, qty]) => Number(qty) > 0)
    .map(([levelId, quantity]) => ({ level_id: levelId, quantity: Number(quantity) }));
}

export const SEATSIO_HOLD_MINUTES = 15;

export function seatHoldExpiresAtFromNow(minutes = SEATSIO_HOLD_MINUTES) {
  return Date.now() + Math.max(1, minutes) * 60 * 1000;
}
