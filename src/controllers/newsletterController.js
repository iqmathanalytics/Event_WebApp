const asyncHandler = require("../utils/asyncHandler");
const newsletterService = require("../services/newsletterService");

const subscribe = asyncHandler(async (req, res) => {
  await newsletterService.subscribe(req.validated.body);
  res.status(200).json({
    success: true,
    message: "Subscribed successfully"
  });
});

module.exports = { subscribe };
