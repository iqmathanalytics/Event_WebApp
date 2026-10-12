const asyncHandler = require("../utils/asyncHandler");
const eventVendorShareService = require("../services/eventVendorShareService");

const listEventVendorShares = asyncHandler(async (req, res) => {
  const data = await eventVendorShareService.listEventVendorShares(
    req.user.id,
    Number(req.params.eventId)
  );
  res.status(200).json({ success: true, data });
});

const createEventVendorShare = asyncHandler(async (req, res) => {
  const result = await eventVendorShareService.createEventVendorShare(
    req.user.id,
    Number(req.params.eventId),
    req.validated.body
  );

  let message = "Invitation sent. Access is granted after they accept.";
  if (result.alreadyAccepted) {
    message = "This partner already has dashboard access.";
  } else if (result.resent) {
    message = result.emailSent
      ? "Invitation resent. Access is granted after they accept."
      : "Invitation is still pending, but the email could not be sent.";
  } else if (!result.emailSent) {
    message = result.emailSkipped
      ? "Invite created, but email could not be sent from this server."
      : `Invite created, but email failed${result.emailError ? `: ${result.emailError}` : "."}`;
  }

  res.status(result.alreadyAccepted ? 200 : result.alreadyExists ? 200 : 201).json({
    success: true,
    message,
    data: {
      ...result.share,
      email_sent: Boolean(result.emailSent),
      email_skipped: Boolean(result.emailSkipped),
      email_error: result.emailError || null
    }
  });
});

const revokeEventVendorShare = asyncHandler(async (req, res) => {
  await eventVendorShareService.revokeEventVendorShare(
    req.user.id,
    Number(req.params.eventId),
    Number(req.params.shareId)
  );
  res.status(200).json({ success: true, message: "Partner access revoked." });
});

const acceptVendorInvite = asyncHandler(async (req, res) => {
  const data = await eventVendorShareService.acceptVendorInvite(
    req.user.id,
    req.validated.body.token
  );
  res.status(200).json({
    success: true,
    message: data.alreadyAccepted
      ? "Invitation already accepted."
      : "Invitation accepted. Open Vendor to see results from your link.",
    data
  });
});

const listSharedVendor = asyncHandler(async (req, res) => {
  const data = await eventVendorShareService.listSharedVendorForUser(req.user.id);
  res.status(200).json({ success: true, data });
});

const listOwnedVendorEvents = asyncHandler(async (req, res) => {
  const data = await eventVendorShareService.listOwnedVendorEvents(req.user.id);
  res.status(200).json({ success: true, data });
});

const getVendorInsights = asyncHandler(async (req, res) => {
  const data = await eventVendorShareService.getVendorInsights(
    req.user.id,
    Number(req.params.eventId),
    req.validated.query || {}
  );
  res.status(200).json({ success: true, data });
});

const getVendorBookings = asyncHandler(async (req, res) => {
  const data = await eventVendorShareService.getVendorBookings(
    req.user.id,
    Number(req.params.eventId),
    req.validated.query || {}
  );
  res.status(200).json({ success: true, data });
});

const recordVendorHit = asyncHandler(async (req, res) => {
  const data = await eventVendorShareService.recordVendorHit(
    Number(req.params.eventId),
    req.validated.body,
    { userAgent: req.get("user-agent") || "" }
  );
  res.status(200).json({ success: true, data });
});

module.exports = {
  listEventVendorShares,
  createEventVendorShare,
  revokeEventVendorShare,
  acceptVendorInvite,
  listSharedVendor,
  listOwnedVendorEvents,
  getVendorInsights,
  getVendorBookings,
  recordVendorHit
};
