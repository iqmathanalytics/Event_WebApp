const MAX_LEVELS = 12;

function todayYmd(referenceDate = new Date()) {
  const d = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseValidUpto(value) {
  const raw = String(value || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return null;
  }
  return raw;
}

export function isTicketLevelSaleActive(level, referenceDate = new Date()) {
  const validUpto = parseValidUpto(level?.valid_upto);
  if (!validUpto) {
    return true;
  }
  return todayYmd(referenceDate) <= validUpto;
}

export function filterActiveTicketLevelsForCheckout(levels, referenceDate = new Date()) {
  return (levels || []).filter((level) => isTicketLevelSaleActive(level, referenceDate));
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
  return Array.isArray(parsed) ? parsed : [];
}

function parseLevelSeats(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return Math.floor(n);
}

function normalizeTicketLevel(row, index) {
  const name = String(row?.name || "").trim();
  if (!name) {
    return null;
  }
  const price = Number(row?.price);
  const seats = parseLevelSeats(row?.seats);
  const valid_upto = parseValidUpto(row?.valid_upto);
  const level = {
    id: String(row?.id || `level-${index}`).trim() || `level-${index}`,
    name,
    description: String(row?.description || "").trim(),
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    sort_order: Number.isFinite(Number(row?.sort_order)) ? Number(row.sort_order) : index,
    seats,
    valid_upto
  };
  if (row?.level_seats_remaining != null) {
    level.level_seats = row.level_seats ?? seats;
    level.level_booked = Number(row.level_booked) || 0;
    level.level_seats_remaining = Number(row.level_seats_remaining);
    level.level_sold_out = Boolean(row.level_sold_out);
  } else if (seats != null) {
    level.level_seats = seats;
    level.level_seats_remaining = seats;
    level.level_sold_out = false;
  }
  return level;
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

export function resolveEventListPrice(event, referenceDate = new Date()) {
  const levels = parseTicketLevelsFromEvent(event);
  const active = filterActiveTicketLevelsForCheckout(levels, referenceDate);
  if (active.length > 0) {
    return Math.min(...active.map((l) => l.price));
  }
  const mode = String(event?.ticket_sales_mode || "external").toLowerCase();
  if (mode === "platform" && levels.length > 0) {
    return null;
  }
  const price = Number(event?.price);
  return Number.isFinite(price) && price >= 0 ? price : 0;
}

export function getCheckoutTicketLevels(event) {
  const levels = filterActiveTicketLevelsForCheckout(parseTicketLevelsFromEvent(event));
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
        sort_order: 0,
        seats: null,
        valid_upto: null
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
      const seats = parseLevelSeats(row?.seats);
      const valid_upto = parseValidUpto(row?.valid_upto);
      return {
        id: String(row?.id || newTicketLevelId()).trim(),
        name,
        description: String(row?.description || "").trim(),
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        sort_order: index,
        ...(seats != null ? { seats } : {}),
        ...(valid_upto ? { valid_upto } : {})
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
    seats:
      level.seats != null && level.seats !== ""
        ? String(level.seats)
        : level.level_seats != null
          ? String(level.level_seats)
          : "",
    valid_upto: level.valid_upto ? String(level.valid_upto).slice(0, 10) : "",
    sort_order: level.sort_order ?? index
  }));
}

export { MAX_LEVELS };
