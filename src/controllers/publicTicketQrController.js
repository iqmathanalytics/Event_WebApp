const QRCode = require("qrcode");
const asyncHandler = require("../utils/asyncHandler");
const { findBookingByCheckInCode } = require("../models/bookingModel");
const { normalizeCheckInCodeInput } = require("../utils/bookingCheckIn");
const { qrPayloadForCheckInCode } = require("../utils/bookingQr");

const getTicketQrPng = asyncHandler(async (req, res) => {
  const raw = String(req.params.code || "").replace(/\.png$/i, "");
  const code = normalizeCheckInCodeInput(raw);
  if (!code || code.length < 8) {
    return res.status(400).type("text/plain").send("Invalid ticket code");
  }

  const row = await findBookingByCheckInCode(code);
  if (!row) {
    return res.status(404).type("text/plain").send("Ticket not found");
  }

  const paymentStatus = String(row.payment_status || "").toLowerCase();
  if (paymentStatus !== "paid" && paymentStatus !== "free") {
    return res.status(404).type("text/plain").send("Ticket not confirmed");
  }

  const buffer = await QRCode.toBuffer(qrPayloadForCheckInCode(code), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: { dark: "#0f172a", light: "#ffffff" }
  });

  res.set("Content-Type", "image/png");
  res.set("Cache-Control", "public, max-age=86400, immutable");
  res.set("Content-Disposition", "inline");
  return res.send(buffer);
});

module.exports = {
  getTicketQrPng
};
