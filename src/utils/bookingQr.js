const QRCode = require("qrcode");
const { publicApiBaseUrl } = require("./brandEmail");

/** QR payload is the check-in code only (faster scan than embedding a full URL). */
function qrPayloadForCheckInCode(checkInCode) {
  return String(checkInCode || "").trim();
}

/** Hosted PNG URL for email clients (Brevo does not render data: or cid: inline images). */
function publicBookingQrImageUrl(checkInCode) {
  const code = qrPayloadForCheckInCode(checkInCode);
  if (!code) {
    return null;
  }
  const base = publicApiBaseUrl();
  return `${base}/public/ticket-qr/${encodeURIComponent(code)}.png`;
}

async function generateBookingQrPngBuffer(checkInCode) {
  const payload = qrPayloadForCheckInCode(checkInCode);
  return QRCode.toBuffer(payload, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 280,
    color: { dark: "#0f172a", light: "#ffffff" }
  });
}

module.exports = {
  qrPayloadForCheckInCode,
  publicBookingQrImageUrl,
  generateBookingQrPngBuffer
};
