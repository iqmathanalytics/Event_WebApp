function parseSelectedSeatsJson(value) {
  if (!value) {
    return [];
  }
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch (_err) {
      return [];
    }
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .map((seat) => {
      if (typeof seat === "string") {
        const label = seat.trim();
        return label ? { label } : null;
      }
      const label = String(seat?.label || "").trim();
      if (!label) {
        return null;
      }
      return {
        label,
        category: seat?.category,
        category_label: seat?.category_label ? String(seat.category_label).trim() : undefined,
        price: seat?.price
      };
    })
    .filter(Boolean);
}

function formatSelectedSeatsLabel(seats) {
  if (!Array.isArray(seats) || !seats.length) {
    return "";
  }
  return seats
    .map((seat) => (typeof seat === "string" ? seat.trim() : String(seat?.label || "").trim()))
    .filter(Boolean)
    .join(", ");
}

module.exports = {
  parseSelectedSeatsJson,
  formatSelectedSeatsLabel
};
