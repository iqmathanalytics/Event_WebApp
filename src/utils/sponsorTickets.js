/** Stable virtual ticket level for complimentary organizer sponsor bookings. */
const SPONSOR_TICKET_LEVEL_ID = "sponsor";

function isSponsorTicketsEnabled(event) {
  return (
    event?.sponsor_tickets_enabled === true ||
    event?.sponsor_tickets_enabled === 1 ||
    String(event?.sponsor_tickets_enabled || "") === "1"
  );
}

function isSponsorTicketLevel(levelOrId) {
  if (levelOrId && typeof levelOrId === "object") {
    if (levelOrId.is_sponsor === true || levelOrId.is_sponsor === 1) {
      return true;
    }
    return String(levelOrId.id || "").trim() === SPONSOR_TICKET_LEVEL_ID;
  }
  return String(levelOrId || "").trim() === SPONSOR_TICKET_LEVEL_ID;
}

function buildSponsorTicketLevel() {
  return {
    id: SPONSOR_TICKET_LEVEL_ID,
    name: "Sponsor",
    description:
      "Free tickets for sponsors, partners, and special guests. Only you can book these — buyers never see this option.",
    price: 0,
    sort_order: 9999,
    seats: null,
    valid_upto: null,
    is_sponsor: true
  };
}

function viewerOwnsEvent(event, viewerUser) {
  if (!event || !viewerUser) {
    return false;
  }
  const viewerId = Number(viewerUser.id ?? viewerUser.userId ?? viewerUser.sub);
  if (!Number.isFinite(viewerId) || viewerId <= 0) {
    return false;
  }
  return Number(event.organizer_id) === viewerId;
}

function canBookSponsorTickets(event, viewerUser) {
  return (
    isSponsorTicketsEnabled(event) &&
    String(event?.ticket_sales_mode || "external").toLowerCase() === "platform" &&
    viewerOwnsEvent(event, viewerUser)
  );
}

function cartHasSponsorTickets(cart) {
  return (cart || []).some((row) => isSponsorTicketLevel(row?.level_id) && Number(row?.quantity) > 0);
}

function cartIsSponsorOnly(cart) {
  const rows = (cart || []).filter((row) => Number(row?.quantity) > 0);
  return rows.length > 0 && rows.every((row) => isSponsorTicketLevel(row.level_id));
}

/**
 * Append the virtual sponsor tier when the viewer is the owning organizer.
 * Never stores sponsor in ticket_levels_json — injection is response-only.
 */
function withSponsorTicketLevelForViewer(event, viewerUser) {
  if (!event) {
    return event;
  }
  const next = { ...event, sponsor_tickets_enabled: isSponsorTicketsEnabled(event) };
  if (!canBookSponsorTickets(next, viewerUser)) {
    return next;
  }
  const levels = Array.isArray(next.ticket_levels) ? [...next.ticket_levels] : [];
  if (!levels.some((level) => isSponsorTicketLevel(level))) {
    levels.push(buildSponsorTicketLevel());
  }
  next.ticket_levels = levels;
  next.viewer_is_organizer = true;
  return next;
}

module.exports = {
  SPONSOR_TICKET_LEVEL_ID,
  isSponsorTicketsEnabled,
  isSponsorTicketLevel,
  buildSponsorTicketLevel,
  viewerOwnsEvent,
  canBookSponsorTickets,
  cartHasSponsorTickets,
  cartIsSponsorOnly,
  withSponsorTicketLevelForViewer
};
