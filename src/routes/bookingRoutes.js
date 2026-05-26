const express = require("express");
const bookingController = require("../controllers/bookingController");
const paymentController = require("../controllers/paymentController");
const couponController = require("../controllers/couponController");
const authMiddleware = require("../middleware/authMiddleware");
const organizerAccessMiddleware = require("../middleware/organizerAccessMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  createBookingSchema,
  guestCreateBookingSchema,
  confirmPaymentSchema,
  organizerBookingsSchema
} = require("../validators/bookingValidator");
const {
  applyCouponSchema,
  resumeCouponHoldSchema,
  releaseCouponHoldSchema,
  createCouponSchema,
  updateCouponSchema,
  couponIdParamSchema
} = require("../validators/couponValidator");

const router = express.Router();

router.post(
  "/guest/checkout",
  validateRequest(guestCreateBookingSchema),
  paymentController.createGuestBookingCheckout
);
router.post(
  "/guest/payment-intent",
  validateRequest(guestCreateBookingSchema),
  paymentController.createGuestPaymentIntent
);
router.post(
  "/guest/confirm-payment",
  validateRequest(confirmPaymentSchema),
  paymentController.confirmGuestPayment
);

router.post("/", authMiddleware, validateRequest(createBookingSchema), bookingController.createBooking);
router.post(
  "/checkout",
  authMiddleware,
  validateRequest(createBookingSchema),
  paymentController.createBookingCheckout
);
router.post(
  "/payment-intent",
  authMiddleware,
  validateRequest(createBookingSchema),
  paymentController.createPaymentIntent
);
router.post(
  "/confirm-payment",
  authMiddleware,
  validateRequest(confirmPaymentSchema),
  paymentController.confirmPayment
);
router.post(
  "/validate-coupon",
  authMiddleware,
  validateRequest(applyCouponSchema),
  couponController.applyCoupon
);
router.post(
  "/resume-coupon-hold",
  authMiddleware,
  validateRequest(resumeCouponHoldSchema),
  couponController.resumeCoupon
);
router.post(
  "/release-coupon-hold",
  authMiddleware,
  validateRequest(releaseCouponHoldSchema),
  couponController.releaseCoupon
);
router.get(
  "/coupons",
  authMiddleware,
  organizerAccessMiddleware,
  couponController.listCoupons
);
router.post(
  "/coupons",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(createCouponSchema),
  couponController.createCoupon
);
router.get(
  "/coupons/:id",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(couponIdParamSchema),
  couponController.getCoupon
);
router.patch(
  "/coupons/:id",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(updateCouponSchema),
  couponController.updateCoupon
);
router.post(
  "/coupons/:id/deactivate",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(couponIdParamSchema),
  couponController.deactivateCoupon
);
router.post(
  "/coupons/:id/activate",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(couponIdParamSchema),
  couponController.activateCoupon
);
router.delete(
  "/coupons/:id",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(couponIdParamSchema),
  couponController.deleteCoupon
);
router.get(
  "/organizer",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(organizerBookingsSchema),
  bookingController.listOrganizerBookings
);
router.get(
  "/organizer/export",
  authMiddleware,
  organizerAccessMiddleware,
  validateRequest(organizerBookingsSchema),
  bookingController.exportOrganizerBookings
);

module.exports = router;
