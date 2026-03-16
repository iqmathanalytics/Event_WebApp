const asyncHandler = require("../utils/asyncHandler");
const serviceService = require("../services/serviceService");

const fetchServices = asyncHandler(async (req, res) => {
  const rows = await serviceService.fetchServices(req.validated.query);
  res.status(200).json({
    success: true,
    data: rows
  });
});

module.exports = { fetchServices };
