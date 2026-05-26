const ApiError = require("../utils/ApiError");
const { createAdminNotification } = require("../models/adminModel");
const { findUserById, updateUserCapabilitiesById } = require("../models/userModel");
const {
  createPlatformTicketAccessRequest,
  findPendingRequestByUserId,
  findLatestRequestByUserId,
  findRequestById,
  listPlatformTicketAccessRequests,
  updateRequestStatus
} = require("../models/platformTicketRequestModel");
const { sendTransactionalEmail } = require("../utils/emailIntegrations");
const {
  buildPlatformTicketRequestAdminEmail,
  buildPlatformTicketRequestUserEmail
} = require("../utils/transactionalEmailTemplates");
const { PLATFORM_TICKETS_REQUEST_EMAIL } = require("../utils/platformTickets");

async function getMyPlatformTicketAccessRequest(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const latest = await findLatestRequestByUserId(userId);
  return {
    can_sell_platform_tickets: user.can_sell_platform_tickets === 1,
    request: latest
  };
}

async function submitPlatformTicketAccessRequest(userId, payload) {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.can_sell_platform_tickets === 1) {
    throw new ApiError(400, "On-site ticket sales are already enabled for your account.");
  }

  const pending = await findPendingRequestByUserId(userId);
  if (pending) {
    throw new ApiError(409, "You already have a pending request. We will email you after admin review.");
  }

  const requestId = await createPlatformTicketAccessRequest({
    userId,
    name: payload.name,
    email: payload.email,
    mobileNumber: payload.mobile_number,
    organizationName: payload.organization_name,
    message: payload.message
  });

  try {
    await createAdminNotification({
      type: "system",
      entityType: "other",
      entityId: requestId,
      title: "On-site ticket sales request",
      message: `${payload.name} requested on-site ticket hosting (request #${requestId}). Review under Admin → Ticket access.`
    });
  } catch (err) {
    console.error("[platformTicketRequest] admin notification failed:", err?.message || err);
  }

  const adminRecipients = [
    process.env.ADMIN_NOTIFICATION_EMAIL,
    process.env.ADMIN_CONTACT_EMAIL,
    PLATFORM_TICKETS_REQUEST_EMAIL
  ].filter(Boolean);
  const uniqueRecipients = [...new Set(adminRecipients)];

  const mail = buildPlatformTicketRequestAdminEmail({
    requestId,
    name: payload.name,
    email: payload.email,
    mobileNumber: payload.mobile_number,
    organizationName: payload.organization_name,
    message: payload.message
  });

  for (const to of uniqueRecipients) {
    await sendTransactionalEmail({
      to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      replyTo: payload.email
    }).catch(() => {});
  }

  const userMail = buildPlatformTicketRequestUserEmail({ name: payload.name });
  await sendTransactionalEmail({
    to: payload.email,
    subject: userMail.subject,
    text: userMail.text,
    html: userMail.html
  }).catch(() => {});

  return { requestId };
}

async function listRequestsForAdmin({ status } = {}) {
  return listPlatformTicketAccessRequests({ status });
}

async function approvePlatformTicketAccessRequest({ requestId, adminId, note }) {
  const row = await findRequestById(requestId);
  if (!row) {
    throw new ApiError(404, "Request not found");
  }
  if (row.status !== "pending") {
    throw new ApiError(400, "This request has already been reviewed.");
  }

  const updated = await updateRequestStatus({
    id: requestId,
    status: "approved",
    adminId,
    adminNote: note
  });
  if (!updated) {
    throw new ApiError(400, "Could not approve request");
  }

  const user = await findUserById(row.user_id);
  await updateUserCapabilitiesById({
    id: row.user_id,
    can_post_events: user?.can_post_events === 1,
    can_create_influencer_profile: user?.can_create_influencer_profile === 1,
    can_post_deals: user?.can_post_deals === 1,
    can_sell_platform_tickets: true
  });

  const mail = buildPlatformTicketRequestUserEmail({
    name: row.name,
    approved: true
  });
  await sendTransactionalEmail({
    to: row.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html
  }).catch(() => {});
}

async function rejectPlatformTicketAccessRequest({ requestId, adminId, note }) {
  const row = await findRequestById(requestId);
  if (!row) {
    throw new ApiError(404, "Request not found");
  }
  if (row.status !== "pending") {
    throw new ApiError(400, "This request has already been reviewed.");
  }

  const updated = await updateRequestStatus({
    id: requestId,
    status: "rejected",
    adminId,
    adminNote: note
  });
  if (!updated) {
    throw new ApiError(400, "Could not reject request");
  }

  const mail = buildPlatformTicketRequestUserEmail({
    name: row.name,
    approved: false,
    note
  });
  await sendTransactionalEmail({
    to: row.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html
  }).catch(() => {});
}

module.exports = {
  getMyPlatformTicketAccessRequest,
  submitPlatformTicketAccessRequest,
  listRequestsForAdmin,
  approvePlatformTicketAccessRequest,
  rejectPlatformTicketAccessRequest
};
