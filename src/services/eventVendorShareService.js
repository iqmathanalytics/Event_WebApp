const ApiError = require("../utils/ApiError");
const { findEventById } = require("../models/eventModel");
const { findUserByEmail, findUserById, enableOrganizerById } = require("../models/userModel");
const shareModel = require("../models/eventVendorShareModel");
const { sendTransactionalEmail, isBrevoConfigured } = require("../utils/emailIntegrations");
const { dashboardUrl, eventDetailUrl } = require("../utils/brandEmail");
const { buildVendorShareInviteEmail } = require("../utils/transactionalEmailTemplates");
const { parseTicketLevelsFromEvent } = require("../utils/eventTicketLevels");
const {
  resolveTicketTierKey,
  chartColorForTierKey,
  parseTicketItemsJson
} = require("../utils/ticketTierInsights");

function buildTierInsightsFromBookings(event, bookingRows) {
  const configuredLevels = parseTicketLevelsFromEvent(event);
  const levelById = new Map(configuredLevels.map((l) => [String(l.id), l]));
  const accum = new Map();

  const ensureTier = (levelId, levelName, unitPrice, indexHint) => {
    const id = String(levelId || "unknown");
    if (!accum.has(id)) {
      const level =
        levelById.get(id) ||
        configuredLevels.find((l) => String(l.id) === id) || {
          id,
          name: levelName || "Ticket",
          price: Number(unitPrice) || 0,
          sort_order: indexHint
        };
      const tierKey = resolveTicketTierKey(level, configuredLevels.indexOf(level), configuredLevels);
      accum.set(id, {
        level_id: id,
        level_name: level.name || levelName || "Ticket",
        tier_key: tierKey,
        color: chartColorForTierKey(tierKey, level.color),
        unit_price: Number(level.price ?? unitPrice) || 0,
        tickets_sold: 0,
        gross_revenue: 0,
        booking_count: 0
      });
    }
    return accum.get(id);
  };

  for (const row of bookingRows || []) {
    const days = Math.max(1, Number(row.total_days) || 1);
    let items = parseTicketItemsJson(row.ticket_items_json);
    if (!items.length && configuredLevels.length) {
      const primary = configuredLevels[0];
      const qty = Math.max(1, Number(row.attendee_count) || 1);
      items = [
        {
          level_id: primary.id,
          level_name: primary.name,
          unit_price: primary.price,
          quantity: qty
        }
      ];
    } else if (!items.length) {
      const qty = Math.max(1, Number(row.attendee_count) || 1);
      items = [{ level_id: "legacy", level_name: "General Admission", unit_price: 0, quantity: qty }];
    }

    const touched = new Set();
    for (const item of items) {
      const levelId = String(item.level_id || item.levelId || "").trim();
      const qty = Number(item.quantity) || 0;
      if (!levelId || qty <= 0) {
        continue;
      }
      const tier = ensureTier(levelId, item.level_name, item.unit_price, accum.size);
      const unit = Number(item.unit_price ?? tier.unit_price) || 0;
      const lineRevenue = unit * qty * days;
      tier.tickets_sold += qty;
      tier.gross_revenue = Number((tier.gross_revenue + lineRevenue).toFixed(2));
      touched.add(levelId);
    }
    for (const id of touched) {
      accum.get(id).booking_count += 1;
    }
  }

  const tiers = [...accum.values()].sort(
    (a, b) => b.tickets_sold - a.tickets_sold || a.level_name.localeCompare(b.level_name)
  );
  const totalTickets = tiers.reduce((s, t) => s + t.tickets_sold, 0);
  const totalTierRevenue = tiers.reduce((s, t) => s + t.gross_revenue, 0);

  return {
    tiers: tiers.map((t) => ({
      ...t,
      share_tickets_pct:
        totalTickets > 0 ? Number(((t.tickets_sold / totalTickets) * 100).toFixed(1)) : 0,
      share_revenue_pct:
        totalTierRevenue > 0 ? Number(((t.gross_revenue / totalTierRevenue) * 100).toFixed(1)) : 0
    })),
    configured_levels: configuredLevels.map((l, index) => ({
      id: l.id,
      name: l.name,
      price: l.price,
      tier_key: resolveTicketTierKey(l, index, configuredLevels),
      chart_color: chartColorForTierKey(resolveTicketTierKey(l, index, configuredLevels), l.color)
    })),
    total_tier_tickets: totalTickets,
    total_tier_revenue: Number(totalTierRevenue.toFixed(2))
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function mapShareRow(row) {
  return {
    id: row.id,
    event_id: row.event_id,
    shared_with_user_id: row.shared_with_user_id,
    email: row.shared_with_user_email || row.shared_with_email,
    name: row.shared_with_name || null,
    vendor_code: row.vendor_code,
    status: row.status || "pending",
    accepted_at: row.accepted_at || null,
    created_at: row.created_at,
    revoked_at: row.revoked_at || null,
    is_revoked: Boolean(row.revoked_at)
  };
}

function vendorEventLink(event, vendorCode) {
  const base = eventDetailUrl(event);
  const code = shareModel.normalizeVendorCode(vendorCode);
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}vendor=${encodeURIComponent(code)}`;
}

async function assertOwnsEvent(eventId, ownerUserId) {
  const event = await findEventById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  if (Number(event.organizer_id) !== Number(ownerUserId)) {
    throw new ApiError(403, "You can only manage vendor links for your own events");
  }
  return event;
}

/**
 * Resolve which share/code a viewer may see.
 * Partner: their accepted share only.
 * Owner: any share on the event (including revoked) via share_id or vendor_code.
 */
async function resolveVendorAccess(eventId, userId, { shareId = null, vendorCode = null } = {}) {
  const event = await findEventById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  const isOwner = Number(event.organizer_id) === Number(userId);

  if (isOwner) {
    let share = null;
    if (shareId) {
      share = await shareModel.findShareByIdForOwner(shareId, userId);
      if (!share || Number(share.event_id) !== Number(eventId)) {
        throw new ApiError(404, "Vendor share not found");
      }
    } else if (vendorCode) {
      share = await shareModel.findShareByCode(eventId, vendorCode);
      if (!share || Number(share.owner_user_id) !== Number(userId)) {
        throw new ApiError(404, "Vendor share not found");
      }
    } else {
      throw new ApiError(400, "Choose a vendor partner to view.");
    }
    return {
      event,
      access: "owner",
      share,
      vendorCode: share.vendor_code,
      isRevoked: Boolean(share.revoked_at)
    };
  }

  const share = await shareModel.findAcceptedShare(eventId, userId);
  if (!share) {
    throw new ApiError(403, "Vendor dashboard access is not available for this event.");
  }
  return {
    event,
    access: "partner",
    share,
    vendorCode: share.vendor_code,
    isRevoked: false
  };
}

async function sendInviteEmail({ owner, invitee, event, inviteToken, vendorCode, email }) {
  const acceptUrl = dashboardUrl(
    `/dashboard/user?host=vendor&vendorInvite=${encodeURIComponent(inviteToken)}`
  );
  const shareUrl = vendorEventLink(event, vendorCode);
  const ownerName = owner?.name || "An organizer";
  const eventTitle = event.title || "an event";
  const to = invitee.email || email;

  if (!isBrevoConfigured()) {
    // eslint-disable-next-line no-console
    console.warn(
      "[eventVendorShare] Invite email not sent: Brevo is not configured (BREVO_API_KEY / BREVO_FROM_EMAIL)."
    );
    return { sent: false, skipped: true, error: "Email provider is not configured on this server." };
  }

  const mail = buildVendorShareInviteEmail({
    inviteeName: invitee.name,
    ownerName,
    eventTitle,
    vendorCode,
    acceptUrl,
    shareUrl
  });

  const result = await sendTransactionalEmail({
    to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text
  });

  if (!result.sent) {
    // eslint-disable-next-line no-console
    console.warn(
      "[eventVendorShare] Invite email failed:",
      result.error || (result.skipped ? "skipped" : "unknown")
    );
  }

  return result;
}

async function listEventVendorShares(ownerUserId, eventId) {
  const event = await assertOwnsEvent(eventId, ownerUserId);
  const rows = await shareModel.listSharesForEvent(eventId, ownerUserId, { includeRevoked: true });
  const mapped = [];
  for (const row of rows) {
    const base = mapShareRow(row);
    const [hits, bookings] = await Promise.all([
      shareModel.getHitInsights(eventId, row.vendor_code),
      shareModel.getBookingInsightsForVendor(eventId, row.vendor_code)
    ]);
    mapped.push({
      ...base,
      share_url: vendorEventLink(event, row.vendor_code),
      visits: hits.total_hits,
      unique_sessions: hits.unique_sessions,
      bookings: bookings.total_bookings,
      guests: bookings.total_attendees,
      revenue: bookings.gross_revenue
    });
  }
  return mapped;
}

async function createEventVendorShare(ownerUserId, eventId, { email: emailInput, vendor_code: codeInput }) {
  let event = await assertOwnsEvent(eventId, ownerUserId);

  // Sharing a vendor link requires checkout tracking so bookings store the code.
  const trackingOn =
    event.vendor_code_enabled === true ||
    event.vendor_code_enabled === 1 ||
    String(event.vendor_code_enabled || "") === "1";
  if (!trackingOn) {
    const { updateEventByOrganizer } = require("../models/eventModel");
    await updateEventByOrganizer({
      eventId,
      organizerId: ownerUserId,
      updates: { vendor_code_enabled: true }
    });
    event = await findEventById(eventId);
  }

  const email = normalizeEmail(emailInput);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "Enter a valid email address.");
  }

  const invitee = await findUserByEmail(email);
  if (!invitee || !invitee.is_active) {
    throw new ApiError(
      404,
      "No active account found for that email. Ask them to sign up first, then send the invite again."
    );
  }
  if (Number(invitee.id) === Number(ownerUserId)) {
    throw new ApiError(400, "You already own this event.");
  }

  let requestedCode = shareModel.normalizeVendorCode(codeInput);
  if (codeInput && (!requestedCode || requestedCode.length < 3)) {
    throw new ApiError(400, "Vendor code must be 3–40 letters or numbers.");
  }

  if (requestedCode) {
    const existingCode = await shareModel.findShareByCode(eventId, requestedCode);
    if (
      existingCode &&
      Number(existingCode.shared_with_user_id) !== Number(invitee.id) &&
      !existingCode.revoked_at
    ) {
      throw new ApiError(400, "That vendor code is already used for another partner on this event.");
    }
  }

  const result = await shareModel.createShare({
    eventId,
    ownerUserId,
    sharedWithUserId: invitee.id,
    sharedWithEmail: email,
    vendorCode: requestedCode || undefined
  });

  const sharePayload = {
    id: result.id,
    event_id: eventId,
    shared_with_user_id: invitee.id,
    email: invitee.email || email,
    name: invitee.name || null,
    vendor_code: result.vendorCode,
    status: result.status || "pending",
    share_url: vendorEventLink(event, result.vendorCode)
  };

  if (result.alreadyExists && result.status === "accepted") {
    return {
      alreadyExists: true,
      alreadyAccepted: true,
      emailSent: false,
      share: sharePayload
    };
  }

  const owner = await findUserById(ownerUserId);
  const inviteToken = result.inviteToken;
  if (!inviteToken) {
    throw new ApiError(500, "Could not create invite token");
  }

  const mail = await sendInviteEmail({
    owner,
    invitee,
    event,
    inviteToken,
    vendorCode: result.vendorCode,
    email
  });

  return {
    alreadyExists: Boolean(result.alreadyExists),
    resent: Boolean(result.resent || result.reactivated),
    emailSent: Boolean(mail.sent),
    emailSkipped: Boolean(mail.skipped),
    emailError: mail.error || null,
    share: sharePayload
  };
}

async function revokeEventVendorShare(ownerUserId, eventId, shareId) {
  await assertOwnsEvent(eventId, ownerUserId);
  const share = await shareModel.findShareByIdForOwner(shareId, ownerUserId);
  if (!share || Number(share.event_id) !== Number(eventId)) {
    throw new ApiError(404, "Share not found");
  }
  if (share.revoked_at) {
    return { revoked: true, alreadyRevoked: true };
  }
  const ok = await shareModel.revokeShare(shareId, ownerUserId);
  if (!ok) {
    throw new ApiError(400, "Could not revoke this share");
  }
  return { revoked: true };
}

async function listSharedVendorForUser(userId) {
  const rows = await shareModel.listSharedEventsForUser(userId);
  return rows.map((row) => ({
    share_id: row.share_id,
    share_status: row.status || "accepted",
    vendor_code: row.vendor_code,
    shared_at: row.shared_at,
    accepted_at: row.accepted_at,
    event_id: row.event_id,
    title: row.title,
    status: row.event_status,
    ticket_sales_mode: row.ticket_sales_mode,
    event_date: row.event_date,
    image_url: row.image_url,
    public_slug: row.public_slug,
    owner: {
      id: row.owner_user_id,
      name: row.owner_name,
      email: row.owner_email
    }
  }));
}

async function listOwnedVendorEvents(userId) {
  return shareModel.listOwnedEventsWithShares(userId);
}

async function acceptVendorInvite(userId, inviteToken) {
  const token = String(inviteToken || "").trim();
  if (!token) {
    throw new ApiError(400, "Invite token is required");
  }

  let result;
  try {
    result = await shareModel.acceptShareByToken({ inviteToken: token, userId });
  } catch (err) {
    if (err?.code === "FORBIDDEN") {
      throw new ApiError(403, "This invitation was sent to a different account. Sign in with the invited email.");
    }
    throw err;
  }
  if (!result) {
    throw new ApiError(404, "Invitation not found or already revoked.");
  }

  await enableOrganizerById(userId);
  const user = await findUserById(userId);
  const event = await findEventById(result.event_id);

  return {
    alreadyAccepted: Boolean(result.alreadyAccepted),
    share_id: result.id,
    event_id: result.event_id,
    vendor_code: result.vendor_code,
    event_title: event?.title || null,
    user
  };
}

async function getVendorInsights(userId, eventId, query = {}) {
  const access = await resolveVendorAccess(eventId, userId, {
    shareId: query.share_id ? Number(query.share_id) : null,
    vendorCode: query.vendor_code || null
  });

  const [hits, bookingBase] = await Promise.all([
    shareModel.getHitInsights(eventId, access.vendorCode),
    shareModel.getBookingInsightsForVendor(eventId, access.vendorCode)
  ]);

  const { tierRows, ...bookingInsights } = bookingBase;
  const tierInsights = buildTierInsightsFromBookings(access.event, tierRows);

  return {
    access: access.access,
    shared_view: access.access === "partner",
    is_revoked: access.isRevoked,
    vendor_code: access.vendorCode,
    share_id: access.share.id,
    share_url: vendorEventLink(access.event, access.vendorCode),
    partner: {
      email: access.share.shared_with_email,
      user_id: access.share.shared_with_user_id
    },
    event: {
      id: access.event.id,
      title: access.event.title,
      public_slug: access.event.public_slug,
      image_url: access.event.image_url,
      event_date: access.event.event_date,
      ticket_sales_mode: access.event.ticket_sales_mode
    },
    visits: hits,
    bookings: {
      ...bookingInsights,
      ...tierInsights
    }
  };
}

async function getVendorBookings(userId, eventId, query = {}) {
  const access = await resolveVendorAccess(eventId, userId, {
    shareId: query.share_id ? Number(query.share_id) : null,
    vendorCode: query.vendor_code || null
  });
  const rows = await shareModel.listBookingsForVendor(eventId, access.vendorCode);
  return {
    access: access.access,
    vendor_code: access.vendorCode,
    share_id: access.share.id,
    is_revoked: access.isRevoked,
    rows: rows.map((row) => ({
      id: row.id,
      event_id: row.event_id,
      event_title: row.event_title,
      name: row.name,
      email: row.email,
      phone: row.phone,
      attendee_count: row.attendee_count,
      ticket_items_json: row.ticket_items_json,
      booking_date: row.booking_date,
      selected_dates_json: row.selected_dates_json,
      total_days: row.total_days,
      total_amount: Number(row.total_amount) || 0,
      subtotal_amount: Number(row.subtotal_amount) || 0,
      discount_amount: Number(row.discount_amount) || 0,
      coupon_code: row.coupon_code,
      vendor_code: row.vendor_code,
      payment_status: row.payment_status,
      created_at: row.created_at,
      is_guest_booking: Boolean(row.is_guest_booking)
    }))
  };
}

async function recordVendorHit(eventId, { vendor_code, session_key, path }, reqMeta = {}) {
  const event = await findEventById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  const code = shareModel.normalizeVendorCode(vendor_code);
  if (!code || code.length < 3) {
    throw new ApiError(400, "A valid vendor code is required.");
  }
  const share = await shareModel.findShareByCode(eventId, code);
  const result = await shareModel.recordLinkHit({
    eventId,
    vendorCode: code,
    shareId: share?.id || null,
    sessionKey: session_key,
    path: path || null,
    userAgent: reqMeta.userAgent || null
  });
  return result;
}

module.exports = {
  listEventVendorShares,
  createEventVendorShare,
  revokeEventVendorShare,
  listSharedVendorForUser,
  listOwnedVendorEvents,
  acceptVendorInvite,
  getVendorInsights,
  getVendorBookings,
  recordVendorHit,
  vendorEventLink,
  resolveVendorAccess
};
