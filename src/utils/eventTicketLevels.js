const crypto = require("crypto");

const MAX_LEVELS = 12;
const MAX_LEVEL_NAME = 120;
const MAX_LEVEL_DESC = 2000;

function slugifyId(value) {
  const base = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || `level-${crypto.randomBytes(4).toString("hex")}`;
}

function parseTicketLevelsRaw(raw) {
  if (!raw) {
    return [];
  }
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (_err) {
      return [];
    }
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed;
}

function normalizeTicketLevel(row, index) {
  const name = String(row?.name || "").trim();
  if (!name) {
    return null;
  }
  const price = Number(row?.price);
  const id = String(row?.id || "").trim() || slugifyId(name);
  return {
    id: id.slice(0, 80),
    name: name.slice(0, MAX_LEVEL_NAME),
    description: String(row?.description || "")
      .trim()
      .slice(0, MAX_LEVEL_DESC),
    price: Number.isFinite(price) && price >= 0 ? Number(price.toFixed(2)) : 0,
    sort_order: Number.isFinite(Number(row?.sort_order)) ? Number(row.sort_order) : index
  };
}

function normalizeTicketLevelsInput(input) {
  const rows = parseTicketLevelsRaw(input);
  const seen = new Set();
  const out = [];
  rows.forEach((row, index) => {
    const level = normalizeTicketLevel(row, index);
    if (!level) {
      return;
    }
    let id = level.id;
    let suffix = 1;
    while (seen.has(id)) {
      id = `${level.id}-${suffix}`;
      suffix += 1;
    }
    seen.add(id);
    out.push({ ...level, id });
  });
  return out.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "en"));
}

function parseTicketLevelsFromEvent(event) {
  if (!event) {
    return [];
  }
  if (Array.isArray(event.ticket_levels)) {
    return normalizeTicketLevelsInput(event.ticket_levels);
  }
  return normalizeTicketLevelsInput(event.ticket_levels_json);
}

function getCheckoutTicketLevels(event) {
  const levels = parseTicketLevelsFromEvent(event);
  if (levels.length) {
    return levels;
  }
  const mode = event?.ticket_sales_mode || "external";
  if (mode === "platform") {
    const price = Number(event?.price || 0);
    return [
      {
        id: "general-admission",
        name: "General Admission",
        description: "",
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        sort_order: 0
      }
    ];
  }
  return [];
}

function sanitizeTicketLevelsForSave(input, { platformMode = false } = {}) {
  const levels = normalizeTicketLevelsInput(input);
  if (!platformMode) {
    return { levels: [], json: null, displayPrice: null };
  }
  if (!levels.length) {
    return { levels: [], json: null, displayPrice: 0 };
  }
  return {
    levels,
    json: JSON.stringify(levels),
    displayPrice: Math.min(...levels.map((l) => l.price))
  };
}

function assertValidTicketLevelsForPlatform(levels) {
  if (!levels.length) {
    throw new Error("Add at least one ticket level for on-site sales, or use a single price tier.");
  }
  if (levels.length > MAX_LEVELS) {
    throw new Error(`You can add up to ${MAX_LEVELS} ticket levels.`);
  }
}

function normalizeTicketItemsInput(items, levels) {
  const byId = new Map(levels.map((l) => [l.id, l]));
  const rows = Array.isArray(items) ? items : [];
  const cart = [];
  rows.forEach((row) => {
    const levelId = String(row?.level_id || row?.levelId || "").trim();
    const qty = Number(row?.quantity);
    if (!levelId || !byId.has(levelId) || !Number.isFinite(qty) || qty <= 0) {
      return;
    }
    const level = byId.get(levelId);
    cart.push({
      level_id: level.id,
      level_name: level.name,
      unit_price: level.price,
      quantity: Math.min(50, Math.floor(qty))
    });
  });
  return cart;
}

function cartTicketCount(cart) {
  return (cart || []).reduce((sum, row) => sum + Number(row.quantity || 0), 0);
}

function computeCartSubtotal(cart, totalDays) {
  const days = Math.max(1, Number(totalDays) || 1);
  const subtotal = (cart || []).reduce(
    (sum, row) => sum + Number(row.unit_price || 0) * Number(row.quantity || 0) * days,
    0
  );
  return Number(subtotal.toFixed(2));
}

function buildCartFromLegacy({ levels, attendeeCount, totalDays }) {
  const guests = Math.max(1, Number(attendeeCount) || 1);
  const primary = levels[0];
  if (!primary) {
    return [];
  }
  return [
    {
      level_id: primary.id,
      level_name: primary.name,
      unit_price: primary.price,
      quantity: guests
    }
  ];
}

function resolveBookingCart(event, { ticket_items: ticketItems, attendee_count: attendeeCount }) {
  const levels = getCheckoutTicketLevels(event);
  if (!levels.length) {
    throw new Error("This event has no ticket levels configured.");
  }

  let cart = normalizeTicketItemsInput(ticketItems, levels);
  if (!cart.length) {
    cart = buildCartFromLegacy({ levels, attendeeCount, totalDays: 1 });
  }

  const tickets = cartTicketCount(cart);
  if (tickets < 1) {
    throw new Error("Select at least one ticket.");
  }
  if (tickets > 50) {
    throw new Error("You can book up to 50 tickets per order.");
  }

  return { levels, cart, attendeeCount: tickets };
}

module.exports = {
  MAX_LEVELS,
  normalizeTicketLevelsInput,
  parseTicketLevelsFromEvent,
  getCheckoutTicketLevels,
  sanitizeTicketLevelsForSave,
  assertValidTicketLevelsForPlatform,
  normalizeTicketItemsInput,
  cartTicketCount,
  computeCartSubtotal,
  resolveBookingCart
};
