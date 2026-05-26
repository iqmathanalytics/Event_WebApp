const asyncHandler = require("../utils/asyncHandler");
const couponService = require("../services/couponService");

const applyCoupon = asyncHandler(async (req, res) => {
  const {
    event_id,
    coupon_code,
    attendee_count,
    ticket_items,
    selected_dates,
    timezone_offset,
    hold_token
  } = req.validated.body;
  const data = await couponService.applyCouponHold({
    userId: req.user.id,
    eventId: event_id,
    couponCode: coupon_code,
    attendeeCount: attendee_count,
    ticketItems: ticket_items,
    selectedDates: selected_dates,
    timezoneOffsetMinutes: timezone_offset,
    existingHoldToken: hold_token || null
  });
  res.status(200).json({
    success: true,
    data
  });
});

const resumeCoupon = asyncHandler(async (req, res) => {
  const { event_id, hold_token, timezone_offset } = req.validated.body;
  const data = await couponService.resumeCouponHold({
    userId: req.user.id,
    eventId: event_id,
    holdToken: hold_token,
    timezoneOffsetMinutes: timezone_offset
  });
  res.status(200).json({
    success: true,
    data
  });
});

const releaseCoupon = asyncHandler(async (req, res) => {
  const { event_id, hold_token } = req.validated.body;
  await couponService.releaseCouponHold({
    userId: req.user.id,
    holdToken: hold_token,
    eventId: event_id ?? null
  });
  res.status(200).json({
    success: true,
    message: "Coupon hold released"
  });
});

const listCoupons = asyncHandler(async (req, res) => {
  const rows = await couponService.listOrganizerCoupons(req.user.id);
  res.status(200).json({ success: true, data: rows });
});

const createCoupon = asyncHandler(async (req, res) => {
  const row = await couponService.createOrganizerCoupon(req.user.id, req.validated.body);
  res.status(201).json({
    success: true,
    message: "Coupon created",
    data: row
  });
});

const updateCoupon = asyncHandler(async (req, res) => {
  const row = await couponService.updateOrganizerCoupon(
    req.user.id,
    Number(req.validated.params.id),
    req.validated.body
  );
  res.status(200).json({
    success: true,
    message: "Coupon updated",
    data: row
  });
});

const deactivateCoupon = asyncHandler(async (req, res) => {
  const row = await couponService.deactivateOrganizerCoupon(req.user.id, Number(req.validated.params.id));
  res.status(200).json({
    success: true,
    message: "Coupon deactivated",
    data: row
  });
});

const activateCoupon = asyncHandler(async (req, res) => {
  const row = await couponService.activateOrganizerCoupon(req.user.id, Number(req.validated.params.id));
  res.status(200).json({
    success: true,
    message: "Coupon activated",
    data: row
  });
});

const deleteCoupon = asyncHandler(async (req, res) => {
  await couponService.deleteOrganizerCoupon(req.user.id, Number(req.validated.params.id));
  res.status(200).json({
    success: true,
    message: "Coupon deleted"
  });
});

const getCoupon = asyncHandler(async (req, res) => {
  const row = await couponService.getOrganizerCouponDetail(req.user.id, Number(req.validated.params.id));
  res.status(200).json({ success: true, data: row });
});

module.exports = {
  applyCoupon,
  resumeCoupon,
  releaseCoupon,
  listCoupons,
  createCoupon,
  updateCoupon,
  deactivateCoupon,
  activateCoupon,
  deleteCoupon,
  getCoupon
};
