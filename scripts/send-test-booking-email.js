/**
 * Send production-identical booking emails (Brevo + same HTML templates + QR).
 *
 *   node scripts/send-test-booking-email.js
 *   node scripts/send-test-booking-email.js you@example.com "Guest Name"
 *
 * Set PUBLIC_API_URL=https://www.bookmytickets.us/api in .env so the QR image loads in email clients.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });

const { pool } = require("../src/config/db");
const { ensureGuestUserAccount, generateTemporaryPassword } = require("../src/services/guestAccountService");
const { createBooking } = require("../src/models/bookingModel");
const { generateCheckInCode } = require("../src/utils/bookingCheckIn");
const { publicBookingQrImageUrl } = require("../src/utils/bookingQr");
const { sendTransactionalEmail } = require("../src/utils/emailIntegrations");
const {
  buildWelcomeEmail,
  buildBookingConfirmationEmail,
  ticketBlocksFromCart
} = require("../src/utils/transactionalEmailTemplates");

async function loadSampleEvent() {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, public_slug, organizer_id, event_date
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
    public_slug: "sample-event",
    organizer_id: 1,
    event_date: "2026-06-15"
  };
}

async function main() {
  const to = String(process.argv[2] || "harijo560@gmail.com").trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    console.error("Usage: node scripts/send-test-booking-email.js [recipient@email.com] [guest name]");
    process.exit(1);
  }

  const event = await loadSampleEvent();
  const guestName = String(process.argv[3] || "Test Guest").trim() || "Test Guest";
  const bookingDate = String(event.event_date || "2026-06-15").slice(0, 10);
  const selectedDates = [bookingDate];
  const totalDays = 1;
  const attendeeCount = 2;
  const ticketCart = [{ level_name: "General Admission", quantity: 2, unit_price: 50 }];
  const subtotalAmount = 100;
  const discountAmount = 0;
  const totalAmount = 104.37;
  const paymentStatus = "paid";

  const guestAccount = await ensureGuestUserAccount({ name: guestName, email: to, phone: null });

  let created = { id: `TEST-${Date.now()}`, check_in_code: generateCheckInCode() };
  try {
    created = await createBooking({
      event_id: event.id,
      organizer_id: event.organizer_id || 1,
      user_id: guestAccount?.userId || null,
      is_guest_booking: true,
      name: guestName,
      email: to,
      phone: "",
      attendee_count: attendeeCount,
      ticket_items_json: JSON.stringify(
        ticketCart.map((row) => ({
          level_id: "general-admission",
          level_name: row.level_name,
          unit_price: row.unit_price,
          quantity: row.quantity
        }))
      ),
      booking_date: bookingDate,
      selected_dates_json: JSON.stringify(selectedDates),
      total_days: totalDays,
      total_amount: totalAmount,
      subtotal_amount: subtotalAmount,
      discount_amount: discountAmount,
      payment_status: paymentStatus,
      amount_paid_cents: Math.round(totalAmount * 100),
      currency: "usd",
      paid_at: new Date()
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[send-test-booking-email] Skipped booking insert (${err.message}). Sending emails anyway.`);
  }

  const checkInCode = created.check_in_code;
  const qrImageUrl = checkInCode ? publicBookingQrImageUrl(checkInCode) : null;
  const confirmation = buildBookingConfirmationEmail({
    guestName,
    eventTitle: event.title,
    event,
    bookingId: created.id,
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
    isGuestBooking: true
  });
  const welcomePassword =
    guestAccount?.created && guestAccount.temporaryPassword
      ? guestAccount.temporaryPassword
      : generateTemporaryPassword();
  const welcome = buildWelcomeEmail({
    firstName: guestName.split(/\s+/)[0] || "there",
    guestCheckout: true,
    loginEmail: to,
    temporaryPassword: welcomePassword
  });

  // eslint-disable-next-line no-console
  console.log(`Sending booking emails for ${to}…`);
  // eslint-disable-next-line no-console
  console.log(`  Event: ${event.title} (id ${event.id})`);
  // eslint-disable-next-line no-console
  console.log(`  Booking ref: #${created.id}`);

  const confirmationResult = await sendTransactionalEmail({
    to,
    subject: confirmation.subject,
    text: confirmation.text,
    html: confirmation.html
  });
  if (!confirmationResult?.sent) {
    throw new Error(
      `Booking confirmation email failed: ${confirmationResult?.error || (confirmationResult?.skipped ? "Brevo not configured" : "unknown")}`
    );
  }

  const welcomeResult = await sendTransactionalEmail({
    to,
    subject: guestAccount?.created ? welcome.subject : `[TEST] ${welcome.subject}`,
    text: welcome.text,
    html: welcome.html
  });
  if (!welcomeResult?.sent) {
    throw new Error(
      `Welcome email failed: ${welcomeResult?.error || (welcomeResult?.skipped ? "Brevo not configured" : "unknown")}`
    );
  }

  if (guestAccount?.created) {
    // eslint-disable-next-line no-console
    console.log("  Sent confirmation + welcome with a working temporary password (new guest account).");
  } else {
    // eslint-disable-next-line no-console
    console.log(
      "  Sent confirmation + sample welcome. This email already has an account — the password in the welcome mail is a preview only. Use Forgot password to sign in."
    );
  }

  process.exit(0);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    pool.end?.().catch(() => {});
  });
