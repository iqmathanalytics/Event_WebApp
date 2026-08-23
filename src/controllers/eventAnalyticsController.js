const asyncHandler = require("../utils/asyncHandler");
const eventAnalyticsService = require("../services/eventAnalyticsService");
const eventAnalyticsShareService = require("../services/eventAnalyticsShareService");

const listOrganizerInsights = asyncHandler(async (req, res) => {
  const data = await eventAnalyticsService.getOrganizerInsightsSummary(req.user.id);
  res.status(200).json({ success: true, data });
});

const getOrganizerEventInsights = asyncHandler(async (req, res) => {
  const hourlyDate = req.query.hourly_date || req.query.hourlyDate || null;
  const data = await eventAnalyticsService.getOrganizerEventInsights(req.user.id, req.params.eventId, {
    hourlyDate
  });
  res.status(200).json({ success: true, data });
});

const listSharedInsights = asyncHandler(async (req, res) => {
  const data = await eventAnalyticsShareService.listSharedAnalyticsForUser(req.user.id);
  res.status(200).json({ success: true, data });
});

const listEventAnalyticsShares = asyncHandler(async (req, res) => {
  const data = await eventAnalyticsShareService.listEventAnalyticsShares(
    req.user.id,
    Number(req.params.eventId)
  );
  res.status(200).json({ success: true, data });
});

const createEventAnalyticsShare = asyncHandler(async (req, res) => {
  const result = await eventAnalyticsShareService.createEventAnalyticsShare(
    req.user.id,
    Number(req.params.eventId),
    req.validated.body.email
  );

  let message = "Invitation sent. Access is granted after they accept.";
  if (result.alreadyAccepted) {
    message = "This organizer already has analytics access";
  } else if (result.resent) {
    message = result.emailSent
      ? "Invitation resent. Access is granted after they accept."
      : "Invitation is still pending, but the email could not be sent.";
  } else if (!result.emailSent) {
    message = result.emailSkipped
      ? "Invite created, but email is not configured on this server."
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

const revokeEventAnalyticsShare = asyncHandler(async (req, res) => {
  await eventAnalyticsShareService.revokeEventAnalyticsShare(
    req.user.id,
    Number(req.params.eventId),
    Number(req.params.shareId)
  );
  res.status(200).json({ success: true, message: "Analytics access revoked" });
});

const acceptAnalyticsInvite = asyncHandler(async (req, res) => {
  const data = await eventAnalyticsShareService.acceptAnalyticsInvite(
    req.user.id,
    req.validated.body.token
  );
  res.status(200).json({
    success: true,
    message: data.alreadyAccepted
      ? "Invitation already accepted"
      : "Invitation accepted. You can view this event under Shared with me.",
    data
  });
});

const getOrganizerCheckInInsights = asyncHandler(async (req, res) => {
  const data = await eventAnalyticsService.getOrganizerCheckInInsights(req.user.id, req.params.eventId);
  res.status(200).json({ success: true, data });
});

module.exports = {
  listOrganizerInsights,
  getOrganizerEventInsights,
  getOrganizerCheckInInsights,
  listSharedInsights,
  listEventAnalyticsShares,
  createEventAnalyticsShare,
  revokeEventAnalyticsShare,
  acceptAnalyticsInvite
};
