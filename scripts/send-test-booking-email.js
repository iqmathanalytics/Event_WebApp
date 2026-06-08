/**
 * Send a production-identical booking confirmation email (Brevo + same HTML template + QR).
 *
 *   node scripts/send-test-booking-email.js
 *   node scripts/send-test-booking-email.js you@example.com
 *
 * Set PUBLIC_API_URL=https://www.bookmytickets.us/api in .env so the QR image loads in email clients.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });

const { pool } = require("../src/config/db");
const { sendTransactionalEmail } = require("../src/utils/emailIntegrations");
const {
  buildBookingConfirmationEmail,
  ticketBlocksFromCart
} = require("../src/utils/transactionalEmailTemplates");
const { publicBookingQrImageUrl } = require("../src/utils/bookingQr");
const { generateCheckInCode } = require("../src/utils/bookingCheckIn");
const { dashboardUrl } = require("../src/utils/brandEmail");

async function loadSampleEvent() {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, public_slug
       FROM events
       WHERE status = 'approved'
       ORDER BY id DESC
       LIMIT 1`
    );
    if (rows?.[0]) {
      return rows[0];
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[send-test-booking-email] Could not load event from DB:", err.message);
  }
  return {
    id: 1,
    title: "Sample Event",
    public_slug: "sample-event"
  };
}

async function main() {
  const to = String(process.argv[2] || "harijo560@gmail.com").trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.error("Usage: node scripts/send-test-booking-email.js [recipient@email.com]");
    process.exit(1);
  }

  const event = await loadSampleEvent();
  const bookingId = 900000 + Math.floor(Math.random() * 99999);
  const checkInCode = generateCheckInCode();
  const guestName = "Test Guest";
  const selectedDates = ["2026-06-15"];
  const totalDays = 1;
  const attendeeCount = 2;
  const ticketCart = [{ level_name: "General Admission", quantity: 2, unit_price: 50 }];
  const subtotalAmount = 100;
  const discountAmount = 0;
  const totalAmount = 104.37;
  const paymentStatus = "paid";
  const qrImageUrl = publicBookingQrImageUrl(checkInCode);
  const guestAccount = {
    created: true,
    email: to,
    setPasswordUrl: `${dashboardUrl("/set-password")}?token=demo-link-for-email-preview`
  };

  const mail = buildBookingConfirmationEmail({
    guestName,
    eventTitle: event.title,
    event,
    bookingId,
    selectedDates,
    totalDays,
    attendeeCount,
    ticketBlocks: ticketBlocksFromCart(ticketCart, totalDays),
    subtotalAmount,
    discountAmount,
    totalAmount,
    couponCode: null,
    paymentStatus,
    qrImageUrl,
    guestAccount
  });

  // eslint-disable-next-line no-console
  console.log(`Sending booking confirmation to ${to}…`);
  // eslint-disable-next-line no-console
  console.log(`  Event: ${event.title} (id ${event.id})`);
  // eslint-disable-next-line no-console
  console.log(`  Booking ref: #${bookingId} (test only, not in database)`);
  // eslint-disable-next-line no-console
  console.log(`  QR image URL: ${qrImageUrl}`);

  const result = await sendTransactionalEmail({
    to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html
  });

  if (result.sent) {
    // eslint-disable-next-line no-console
    console.log("Sent successfully via Brevo.", result);
    process.exit(0);
  }

  // eslint-disable-next-line no-console
  console.error("Email was not sent:", result);
  process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    pool.end?.().catch(() => {});
  });
