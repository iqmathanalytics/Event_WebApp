const express = require("express");
const rateLimit = require("express-rate-limit");
const validateRequest = require("../middleware/validateRequest");
const authMiddleware = require("../middleware/authMiddleware");
const checkInAccessMiddleware = require("../middleware/checkInAccessMiddleware");
const {
  adminVerifyTicketSchema,
  adminCheckInTicketSchema
} = require("../validators/adminValidator");
const publicTicketQrController = require("../controllers/publicTicketQrController");
const publicCheckInController = require("../controllers/publicCheckInController");

const router = express.Router();

const qrLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

const checkInLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false
});

router.get("/ticket-qr/:code", qrLimiter, publicTicketQrController.getTicketQrPng);

// Venue check-in requires staff/organizer auth (possession of QR alone is not enough).
router.get(
  "/check-in/verify",
  checkInLimiter,
  authMiddleware,
  checkInAccessMiddleware,
  validateRequest(adminVerifyTicketSchema),
  publicCheckInController.verifyTicket
);

router.post(
  "/check-in",
  checkInLimiter,
  authMiddleware,
  checkInAccessMiddleware,
  validateRequest(adminCheckInTicketSchema),
  publicCheckInController.checkInTicket
);

module.exports = router;
