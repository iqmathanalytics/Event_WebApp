const QRCode = require("qrcode");

/** QR payload is the check-in code only (faster scan than embedding a full URL). */
function qrPayloadForCheckInCode(checkInCode) {
  return String(checkInCode || "").trim();
}

async function generateBookingQrDataUrl(checkInCode) {
  const payload = qrPayloadForCheckInCode(checkInCode);
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: { dark: "#0f172a", light: "#ffffff" }
  });
}

async function generateBookingQrAttachment(checkInCode) {
  const payload = qrPayloadForCheckInCode(checkInCode);
  const buffer = await QRCode.toBuffer(payload, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: { dark: "#0f172a", light: "#ffffff" }
  });
  return {
    name: `ticket-${String(checkInCode || "qr").slice(0, 12)}.png`,
    content: buffer.toString("base64")
  };
}

module.exports = {
  generateBookingQrDataUrl,
  generateBookingQrAttachment
};
