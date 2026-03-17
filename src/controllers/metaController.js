const asyncHandler = require("../utils/asyncHandler");
const cityService = require("../services/cityService");

const listCities = asyncHandler(async (req, res) => {
  const rows = await cityService.fetchCities({
    q: req.query.q,
    limit: req.query.limit
  });

  res.status(200).json({
    success: true,
    data: rows
  });
});

module.exports = {
  listCities
};
