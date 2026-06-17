function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ");
}

function seatLabelPrefix(label) {
  const raw = String(label || "").trim();
  if (!raw) {
    return "";
  }
  const dash = raw.search(/[-\u2010-\u2015\u2212]/);
  return dash > 0 ? raw.slice(0, dash).trim() : raw;
}

function levelIndexFromCategoryLabel(categoryLabel) {
  const normalized = normalizeKey(categoryLabel);
  const match = /^category (\d+)$/.exec(normalized);
  if (!match) {
    return -1;
  }
  return Number(match[1]) - 1;
}

function resolveLevelIdFromLabelPrefix(label, levels = []) {
  const raw = String(label || "").trim();
  if (!raw) {
    return null;
  }
  const normalizedLabel = normalizeKey(raw);
  const sorted = [...levels].sort(
    (a, b) => normalizeKey(b.name).length - normalizeKey(a.name).length
  );
  for (const level of sorted) {
    const name = normalizeKey(level.name);
    if (!name || !level?.id) {
      continue;
    }
    if (normalizedLabel === name) {
      return String(level.id);
    }
    if (normalizedLabel.startsWith(`${name}-`) || normalizedLabel.startsWith(`${name} -`)) {
      return String(level.id);
    }
  }
  const prefix = normalizeKey(seatLabelPrefix(label));
  if (!prefix) {
    return null;
  }
  for (const level of sorted) {
    if (normalizeKey(level.name) === prefix && level?.id) {
      return String(level.id);
    }
  }
  return null;
}

function resolveLevelIdFromChartPricing(seat, levels = [], chartPricing = []) {
  const categoryKey = Number(seat?.category);
  if (!Number.isFinite(categoryKey) || !chartPricing.length) {
    return null;
  }
  const row = chartPricing.find((entry) => Number(entry.category) === categoryKey);
  if (!row) {
    return null;
  }
  if (row.label) {
    const byLabel = levels.find((level) => normalizeKey(level.name) === normalizeKey(row.label));
    if (byLabel?.id) {
      return String(byLabel.id);
    }
  }
  const price = Number(row.price);
  if (Number.isFinite(price)) {
    const matches = levels.filter((level) => Number(level.price) === price);
    if (matches.length === 1 && matches[0]?.id) {
      return String(matches[0].id);
    }
  }
  return null;
}

function resolveLevelIdFromSeatPrice(seat, levels = []) {
  const seatPrice = Number(seat?.price);
  if (!Number.isFinite(seatPrice) || seatPrice <= 0) {
    return null;
  }
  const matches = levels.filter((level) => Number(level.price) === seatPrice);
  if (matches.length === 1 && matches[0]?.id) {
    return String(matches[0].id);
  }
  return null;
}

function resolveLevelIdForSeat(seat, levels = [], options = {}) {
  const list = levels || [];
  const chartCategoryKeys = options.chartCategoryKeys || [];
  const chartPricing = options.chartPricing || [];

  if (!list.length || !seat) {
    return null;
  }

  const fromLabel = resolveLevelIdFromLabelPrefix(seat.label, list);
  if (fromLabel) {
    return fromLabel;
  }

  const fromPricing = resolveLevelIdFromChartPricing(seat, list, chartPricing);
  if (fromPricing) {
    return fromPricing;
  }

  const fromSeatPrice = resolveLevelIdFromSeatPrice(seat, list);
  if (fromSeatPrice) {
    return fromSeatPrice;
  }

  const categoryKey = Number(seat.category);
  if (Number.isFinite(categoryKey) && chartCategoryKeys.length) {
    const idx = chartCategoryKeys.findIndex((key) => Number(key) === categoryKey);
    if (idx >= 0 && list[idx]?.id) {
      return String(list[idx].id);
    }
  }

  const categoryLabelNorm = normalizeKey(seat?.category_label);
  if (categoryLabelNorm) {
    const byName = list.find((level) => normalizeKey(level.name) === categoryLabelNorm);
    if (byName?.id) {
      return String(byName.id);
    }

    const fromGenericLabel = levelIndexFromCategoryLabel(seat.category_label);
    if (fromGenericLabel >= 0 && list[fromGenericLabel]?.id) {
      return String(list[fromGenericLabel].id);
    }
  }

  return null;
}

function buildCartFromSelectedSeats(
  selectedSeats = [],
  ticketLevels = [],
  totalDays = 1,
  chartCategoryKeys = [],
  chartPricing = []
) {
  const levels = ticketLevels || [];
  const options = { chartCategoryKeys, chartPricing };
  const grouped = {};
  for (const seat of selectedSeats || []) {
    const levelId = resolveLevelIdForSeat(seat, levels, options);
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
