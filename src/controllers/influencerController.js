const asyncHandler = require("../utils/asyncHandler");
const influencerService = require("../services/influencerService");

const fetchInfluencers = asyncHandler(async (req, res) => {
  const rows = await influencerService.fetchInfluencers(req.validated.query);
  res.status(200).json({
    success: true,
    data: rows
  });
});

module.exports = { fetchInfluencers };
