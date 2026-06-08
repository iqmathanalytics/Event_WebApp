const express = require("express");
const rateLimit = require("express-rate-limit");
const publicTicketQrController = require("../controllers/publicTicketQrController");

const router = express.Router();

const qrLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

router.get("/ticket-qr/:code", qrLimiter, publicTicketQrController.getTicketQrPng);

module.exports = router;
