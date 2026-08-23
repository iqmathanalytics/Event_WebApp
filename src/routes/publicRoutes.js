const express = require("express");
const rateLimit = require("express-rate-limit");
const validateRequest = require("../middleware/validateRequest");
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

router.get(
  "/check-in/verify",
  checkInLimiter,
  validateRequest(adminVerifyTicketSchema),
  publicCheckInController.verifyTicket
);

router.post(
  "/check-in",
  checkInLimiter,
  validateRequest(adminCheckInTicketSchema),
  publicCheckInController.checkInTicket
);

module.exports = router;
