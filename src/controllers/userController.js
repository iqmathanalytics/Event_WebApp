const asyncHandler = require("../utils/asyncHandler");
const { findUserById } = require("../models/userModel");
const bookingService = require("../services/bookingService");

const getMe = asyncHandler(async (req, res) => {
  const user = await findUserById(req.user.id);
  res.status(200).json({
    success: true,
    data: user
  });
});

const getMyBookings = asyncHandler(async (req, res) => {
  const rows = await bookingService.fetchUserBookings({ userId: req.user.id });
  res.status(200).json({
    success: true,
    data: rows
  });
});

module.exports = { getMe, getMyBookings };
