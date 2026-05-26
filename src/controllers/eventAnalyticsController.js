const asyncHandler = require("../utils/asyncHandler");
const eventAnalyticsService = require("../services/eventAnalyticsService");

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

module.exports = {
  listOrganizerInsights,
  getOrganizerEventInsights
};
