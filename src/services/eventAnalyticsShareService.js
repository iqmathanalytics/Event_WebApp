const ApiError = require("../utils/ApiError");
const { findEventById } = require("../models/eventModel");
const { findUserByEmail, findUserById } = require("../models/userModel");
const shareModel = require("../models/eventAnalyticsShareModel");
const { sendTransactionalEmail, isBrevoConfigured } = require("../utils/emailIntegrations");
const { dashboardUrl } = require("../utils/brandEmail");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isOrganizerCapable(user) {
  if (!user || !user.is_active) {
    return false;
  }
  return (
    user.organizer_enabled === 1 ||
    user.organizer_enabled === true ||
    user.can_post_events === 1 ||
    user.can_post_events === true ||
    String(user.role || "").toLowerCase() === "organizer" ||
    String(user.role || "").toLowerCase() === "admin"
  );
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

  const result = await sendTransactionalEmail({
    to,
    subject: `${ownerName} invited you to view event analytics`,
    html: `
      <p>Hi ${invitee.name || "there"},</p>
      <p><strong>${ownerName}</strong> invited you to view performance analytics for
      <strong>${eventTitle}</strong>.</p>
      <p>Access is not granted until you accept this invitation.</p>
      <p><a href="${acceptUrl}">Accept invitation</a></p>
      <p>If you did not expect this, you can ignore this email.</p>
    `,
    text: `${ownerName} invited you to view analytics for "${eventTitle}". Accept: ${acceptUrl}`
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
    throw new ApiError(400, "Enter a valid organizer email address.");
  }

  const invitee = await findUserByEmail(email);
  if (!invitee || !invitee.is_active) {
    throw new ApiError(
      404,
      "No active organizer account found for that email. Ask them to sign up and enable organizer access first."
    );
  }
  if (!isOrganizerCapable(invitee)) {
    throw new ApiError(
      400,
      "That account is not an organizer yet. Ask them to enable organizer access, then try again."
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

  const event = await findEventById(result.event_id);
  const owner = await findUserById(result.owner_user_id);

  return {
    alreadyAccepted: Boolean(result.alreadyAccepted),
    share_id: result.id,
    event_id: result.event_id,
    title: event?.title || null,
    owner: owner
      ? { id: owner.id, name: owner.name || null, email: owner.email || null }
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
