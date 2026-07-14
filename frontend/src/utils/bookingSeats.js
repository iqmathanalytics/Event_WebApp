export function parseSelectedSeats(value) {
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

function seatsFromTicketItemsJson(booking) {
  try {
    const raw = booking?.ticket_items_json;
    if (!raw) {
      return [];
    }
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parseSelectedSeats(
      parsed.flatMap((item) => (Array.isArray(item?.seats) ? item.seats : []))
    );
  } catch (_err) {
    return [];
  }
}

export function formatBookingSeatsLabel(booking) {
  let seats = Array.isArray(booking?.selected_seats) ? booking.selected_seats.filter(Boolean) : [];
  if (!seats.length) {
    seats = parseSelectedSeats(booking?.selected_seats_json);
  }
  if (!seats.length) {
    seats = seatsFromTicketItemsJson(booking);
  }
  if (!seats.length && typeof booking?.selected_seats_label === "string") {
    return booking.selected_seats_label.trim();
  }
  if (!seats.length) {
    return "";
  }
  return seats.map((seat) => (typeof seat === "string" ? seat : seat.label)).filter(Boolean).join(", ");
}
