const asyncHandler = require("../utils/asyncHandler");
const newsletterService = require("../services/newsletterService");

const subscribe = asyncHandler(async (req, res) => {
  const result = await newsletterService.subscribe(req.validated.body, req.user);
  res.status(200).json({
    success: true,
    message: result.alreadySubscribed ? "Already subscribed. You are on our VIP update list." : "Subscribed successfully",
    data: result
  });
});

const getMySubscriptionStatus = asyncHandler(async (req, res) => {
  const result = await newsletterService.getSubscriptionStatus(req.validated.query, req.user);
  res.status(200).json({
    success: true,
    data: result
  });
});

module.exports = { subscribe, getMySubscriptionStatus };
