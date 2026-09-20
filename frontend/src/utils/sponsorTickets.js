/** Stable virtual ticket level for complimentary organizer sponsor bookings. */
export const SPONSOR_TICKET_LEVEL_ID = "sponsor";

export function isSponsorTicketsEnabled(event) {
  return (
    event?.sponsor_tickets_enabled === true ||
    event?.sponsor_tickets_enabled === 1 ||
    String(event?.sponsor_tickets_enabled || "") === "1"
  );
}

export function isSponsorTicketLevel(levelOrId) {
  if (levelOrId && typeof levelOrId === "object") {
    if (levelOrId.is_sponsor === true || levelOrId.is_sponsor === 1) {
      return true;
    }
    return String(levelOrId.id || "").trim() === SPONSOR_TICKET_LEVEL_ID;
  }
  return String(levelOrId || "").trim() === SPONSOR_TICKET_LEVEL_ID;
}

export function buildSponsorTicketLevel() {
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

export function viewerOwnsEvent(event, user) {
  if (!event || !user) {
    return false;
  }
  const viewerId = Number(user.id ?? user.userId);
  if (!Number.isFinite(viewerId) || viewerId <= 0) {
    return false;
  }
  return Number(event.organizer_id) === viewerId;
}

export function canBookSponsorTickets(event, user) {
  return (
    isSponsorTicketsEnabled(event) &&
    String(event?.ticket_sales_mode || "external").toLowerCase() === "platform" &&
    (event?.viewer_is_organizer === true || viewerOwnsEvent(event, user))
  );
}

export function splitCheckoutLevels(levels) {
  const list = Array.isArray(levels) ? levels : [];
  return {
    paidLevels: list.filter((level) => !isSponsorTicketLevel(level)),
    sponsorLevels: list.filter((level) => isSponsorTicketLevel(level))
  };
}
