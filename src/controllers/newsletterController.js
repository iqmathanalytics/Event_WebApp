const asyncHandler = require("../utils/asyncHandler");
const newsletterService = require("../services/newsletterService");

const subscribe = asyncHandler(async (req, res) => {
  const u = req.user || {};
  const mergedUser = { ...u, id: u.id ?? u.userId ?? u.user_id ?? u.sub };
  const result = await newsletterService.subscribe(req.validated.body, mergedUser);
  res.status(200).json({
    success: true,
    message: result.alreadySubscribed ? "Already subscribed. You are on our VIP update list." : "Subscribed successfully",
    data: result
  });
});

const getMySubscriptionStatus = asyncHandler(async (req, res) => {
  const u = req.user || {};
  const mergedUser = {
    ...u,
    id: u.id ?? u.userId ?? u.user_id ?? u.sub
  };
  const result = await newsletterService.getSubscriptionStatus(req.validated.query, mergedUser);
  res.status(200).json({
    success: true,
    data: result
  });
});

const subscribeGuest = asyncHandler(async (req, res) => {
  const result = await newsletterService.subscribeGuest(req.validated.body);
  res.status(200).json({
    success: true,
    message: result.alreadySubscribed
      ? "Already subscribed. You are on our VIP update list."
      : "Subscribed successfully",
    data: result
  });
});

module.exports = { subscribe, getMySubscriptionStatus, subscribeGuest };
