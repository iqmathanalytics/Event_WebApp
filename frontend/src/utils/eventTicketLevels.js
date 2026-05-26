const MAX_LEVELS = 12;

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
  return Array.isArray(parsed) ? parsed : [];
}

function normalizeTicketLevel(row, index) {
  const name = String(row?.name || "").trim();
  if (!name) {
    return null;
  }
  const price = Number(row?.price);
  return {
    id: String(row?.id || `level-${index}`).trim() || `level-${index}`,
    name,
    description: String(row?.description || "").trim(),
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    sort_order: Number.isFinite(Number(row?.sort_order)) ? Number(row.sort_order) : index
  };
}

function levelsFromRaw(raw) {
  return parseTicketLevelsRaw(raw)
    .map((row, index) => normalizeTicketLevel(row, index))
    .filter(Boolean)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "en"));
}

export function parseTicketLevelsFromEvent(event) {
  if (!event) {
    return [];
  }
  const fromLevels = levelsFromRaw(event.ticket_levels);
  if (fromLevels.length) {
    return fromLevels;
  }
  return levelsFromRaw(event.ticket_levels_json);
}

export function getCheckoutTicketLevels(event) {
  const levels = parseTicketLevelsFromEvent(event);
  if (levels.length) {
    return levels;
  }
  if ((event?.ticket_sales_mode || "external") === "platform") {
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

export function createEmptyCart(levels) {
  return Object.fromEntries((levels || []).map((level) => [level.id, 0]));
}

export function cartFromItems(levels, items) {
  const cart = createEmptyCart(levels);
  (items || []).forEach((row) => {
    const id = String(row?.level_id || row?.levelId || "").trim();
    const qty = Number(row?.quantity);
    if (id && cart[id] != null && Number.isFinite(qty) && qty > 0) {
      cart[id] = Math.min(50, Math.floor(qty));
    }
  });
  return cart;
}

export function cartTicketCount(cart) {
  return Object.values(cart || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
}

export function computeCartSubtotal(levels, cart, totalDays) {
  const days = Math.max(1, Number(totalDays) || 1);
  const byId = new Map((levels || []).map((l) => [l.id, l]));
  let subtotal = 0;
  Object.entries(cart || {}).forEach(([id, qty]) => {
    const level = byId.get(id);
    const count = Number(qty) || 0;
    if (!level || count <= 0) {
      return;
    }
    subtotal += Number(level.price || 0) * count * days;
  });
  return Number(subtotal.toFixed(2));
}

export function buildTicketItemsPayload(levels, cart) {
  const byId = new Map((levels || []).map((l) => [l.id, l]));
  return Object.entries(cart || {})
    .filter(([, qty]) => Number(qty) > 0)
    .map(([levelId, qty]) => ({
      level_id: levelId,
      quantity: Number(qty)
    }))
    .filter((row) => byId.has(row.level_id));
}

export function formatLevelPriceRange(levels) {
  const prices = (levels || []).map((l) => Number(l.price || 0)).filter((p) => Number.isFinite(p));
  if (!prices.length) {
    return null;
  }
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, single: min === max };
}

export function newTicketLevelId() {
  return `lvl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export const TICKET_LEVEL_PRESETS = [
  {
    name: "General Admission",
    description: "Standard entry to the event."
  },
  {
    name: "Premium",
    description:
      "Close to the action! Premium seating with an elevated view and experience."
  },
  {
    name: "VIP",
    description:
      "Front row. Best view. Ultimate vibes — exclusive seating and premium perks."
  }
];

export function serializeTicketLevelsForApi(rows) {
  return (rows || [])
    .map((row, index) => {
      const name = String(row?.name || "").trim();
      if (!name) {
        return null;
      }
      const price = Number(row?.price);
      return {
        id: String(row?.id || newTicketLevelId()).trim(),
        name,
        description: String(row?.description || "").trim(),
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        sort_order: index
      };
    })
    .filter(Boolean);
}

export function ticketLevelsToFormRows(levels) {
  return (levels || []).map((level, index) => ({
    id: level.id || newTicketLevelId(),
    name: level.name || "",
    description: level.description || "",
    price: level.price != null && level.price !== "" ? String(level.price) : "",
    sort_order: level.sort_order ?? index
  }));
}

export { MAX_LEVELS };
