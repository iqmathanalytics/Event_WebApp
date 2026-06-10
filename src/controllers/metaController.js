const asyncHandler = require("../utils/asyncHandler");
const cityService = require("../services/cityService");

const listCities = asyncHandler(async (req, res) => {
  const parsedLimit = req.query.limit != null ? Number(req.query.limit) : undefined;
  const limit = Number.isFinite(parsedLimit) ? Math.min(parsedLimit, 128) : undefined;

  const rows = await cityService.fetchCities({
    q: req.query.q,
    limit
  });

  res.status(200).json({
    success: true,
    data: rows
  });
});

module.exports = {
  listCities
};
