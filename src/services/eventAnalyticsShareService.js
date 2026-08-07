const ApiError = require("../utils/ApiError");
const { findEventById } = require("../models/eventModel");
const { findUserByEmail, findUserById, enableOrganizerById } = require("../models/userModel");
const shareModel = require("../models/eventAnalyticsShareModel");
const { sendTransactionalEmail, isBrevoConfigured } = require("../utils/emailIntegrations");
const { dashboardUrl } = require("../utils/brandEmail");
const { buildAnalyticsShareInviteEmail } = require("../utils/transactionalEmailTemplates");

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
    status: row.status || "pending",
    accepted_at: row.accepted_at || null,
    created_at: row.created_at
  };
}

async function assertOwnsEvent(eventId, ownerUserId) {
  const event = await findEventById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  if (Number(event.organizer_id) !== Number(ownerUserId)) {
    throw new ApiError(403, "You can only manage sharing for your own events");
  }
  return event;
}

async function sendInviteEmail({ owner, invitee, event, inviteToken, email }) {
  const acceptUrl = dashboardUrl(
    `/dashboard/organizer?section=shared&invite=${encodeURIComponent(inviteToken)}`
  );
  const ownerName = owner?.name || "An organizer";
  const eventTitle = event.title || "an event";
  const to = invitee.email || email;

  if (!isBrevoConfigured()) {
    // eslint-disable-next-line no-console
    console.warn(
      "[eventAnalyticsShare] Invite email not sent: Brevo is not configured (BREVO_API_KEY / BREVO_FROM_EMAIL)."
    );
    return { sent: false, skipped: true, error: "Email provider is not configured on this server." };
  }

  const mail = buildAnalyticsShareInviteEmail({
    inviteeName: invitee.name,
    ownerName,
    eventTitle,
    acceptUrl
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
      "[eventAnalyticsShare] Invite email failed:",
      result.error || (result.skipped ? "skipped" : "unknown")
    );
  }

  return result;
}

async function listEventAnalyticsShares(ownerUserId, eventId) {
  await assertOwnsEvent(eventId, ownerUserId);
  const rows = await shareModel.listSharesForEvent(eventId, ownerUserId);
  return rows.map(mapShareRow);
}

async function createEventAnalyticsShare(ownerUserId, eventId, emailInput) {
  const event = await assertOwnsEvent(eventId, ownerUserId);
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
    throw new ApiError(400, "You already own this event’s analytics.");
  }

  const result = await shareModel.createShare({
    eventId,
    ownerUserId,
    sharedWithUserId: invitee.id,
    sharedWithEmail: email
  });

  const sharePayload = {
    id: result.id,
    event_id: eventId,
    shared_with_user_id: invitee.id,
    email: invitee.email || email,
    name: invitee.name || null,
    status: result.status || "pending"
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

async function revokeEventAnalyticsShare(ownerUserId, eventId, shareId) {
  await assertOwnsEvent(eventId, ownerUserId);
  const share = await shareModel.findShareByIdForOwner(shareId, ownerUserId);
  if (!share || Number(share.event_id) !== Number(eventId)) {
    throw new ApiError(404, "Share not found");
  }
  const ok = await shareModel.revokeShare(shareId, ownerUserId);
  if (!ok) {
    throw new ApiError(400, "Could not revoke this share");
  }
  return { revoked: true };
}

/** Only accepted shares appear on Shared with me. */
async function listSharedAnalyticsForUser(userId) {
  const rows = await shareModel.listSharedEventsForUser(userId);
  return rows
    .filter((row) => String(row.status || "accepted").toLowerCase() === "accepted")
    .map((row) => ({
      share_id: row.share_id,
      share_status: row.status || "accepted",
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

async function acceptAnalyticsInvite(userId, inviteToken) {
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
    throw new ApiError(404, "Invitation not found or no longer valid");
  }

  // Unlock Event Analytics nav/access for invitees who had not enabled organizer tools yet.
  await enableOrganizerById(userId);
  const user = await findUserById(userId);

  const event = await findEventById(result.event_id);
  const owner = await findUserById(result.owner_user_id);

  return {
    alreadyAccepted: Boolean(result.alreadyAccepted),
    organizerEnabled: true,
    share_id: result.id,
    event_id: result.event_id,
    title: event?.title || null,
    owner: owner
      ? { id: owner.id, name: owner.name || null, email: owner.email || null }
      : null,
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizer_enabled: user.organizer_enabled === 1 ? 1 : 0,
          can_post_events: user.can_post_events === 1 ? 1 : 0,
          can_create_influencer_profile: user.can_create_influencer_profile === 1 ? 1 : 0,
          can_post_deals: user.can_post_deals === 1 ? 1 : 0,
          can_sell_platform_tickets: user.can_sell_platform_tickets === 1 ? 1 : 0,
          profile_image_url: user.profile_image_url || null
        }
      : null
  };
}

module.exports = {
  listEventAnalyticsShares,
  createEventAnalyticsShare,
  revokeEventAnalyticsShare,
  listSharedAnalyticsForUser,
  acceptAnalyticsInvite,
  hasActiveAnalyticsShare: shareModel.hasActiveAnalyticsShare
};
