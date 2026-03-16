const express = require("express");
const bookingController = require("../controllers/bookingController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  createBookingSchema,
  organizerBookingsSchema
} = require("../validators/bookingValidator");

const router = express.Router();

router.post("/", authMiddleware, validateRequest(createBookingSchema), bookingController.createBooking);
router.get(
  "/organizer",
  authMiddleware,
  roleMiddleware("organizer"),
  validateRequest(organizerBookingsSchema),
  bookingController.listOrganizerBookings
);
router.get(
  "/organizer/export",
  authMiddleware,
  roleMiddleware("organizer"),
  validateRequest(organizerBookingsSchema),
  bookingController.exportOrganizerBookings
);

module.exports = router;
