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

function resolveLevelIdForSeat(seat, levels = []) {
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

function buildCartFromSelectedSeats(selectedSeats = [], ticketLevels = [], totalDays = 1) {
  const levels = ticketLevels || [];
  const grouped = {};
  for (const seat of selectedSeats || []) {
    const levelId = resolveLevelIdForSeat(seat, levels);
    if (!levelId) {
      continue;
    }
    const level = levels.find((row) => String(row.id) === levelId);
    if (!grouped[levelId]) {
      grouped[levelId] = {
        level_id: levelId,
        level_name: level?.name || seat.category_label || `Category ${seat.category || ""}`.trim(),
        unit_price: Number(seat.price) || Number(level?.price) || 0,
        quantity: 0,
        seats: []
      };
    }
    grouped[levelId].quantity += 1;
    grouped[levelId].seats.push({
      label: seat.label,
      category: seat.category,
      category_label: seat.category_label || null
    });
  }
  const cart = Object.values(grouped);
  const attendeeCount = selectedSeats.length;
  const subtotal = cart.reduce(
    (sum, row) => sum + row.unit_price * row.quantity * Math.max(1, totalDays),
    0
  );
  return { cart, attendeeCount, subtotal };
}

module.exports = {
  buildCartFromSelectedSeats,
  resolveLevelIdForSeat
};
