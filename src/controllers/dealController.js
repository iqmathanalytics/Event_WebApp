const asyncHandler = require("../utils/asyncHandler");
const dealService = require("../services/dealService");

const fetchDeals = asyncHandler(async (req, res) => {
  const rows = await dealService.fetchDeals(req.validated.query, req.user);
  res.status(200).json({
    success: true,
    data: rows
  });
});

module.exports = { fetchDeals };
