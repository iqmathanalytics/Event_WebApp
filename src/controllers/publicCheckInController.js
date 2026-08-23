const asyncHandler = require("../utils/asyncHandler");
const bookingCheckInService = require("../services/bookingCheckInService");

const verifyTicket = asyncHandler(async (req, res) => {
  const booking = await bookingCheckInService.verifyBookingByCode(req.validated.query.code);
  return res.status(200).json({
    success: true,
    data: booking
  });
});

const checkInTicket = asyncHandler(async (req, res) => {
  const result = await bookingCheckInService.checkInBookingByCode({
    rawCode: req.validated.body.code,
    adminUserId: null
  });
  return res.status(200).json({
    success: true,
    message: result.message,
    data: result
  });
});

module.exports = {
  verifyTicket,
  checkInTicket
};
