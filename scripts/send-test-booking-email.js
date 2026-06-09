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
const { dispatchBookingEmails } = require("../src/services/bookingService");
const { ensureGuestUserAccount } = require("../src/services/guestAccountService");
const { createBooking } = require("../src/models/bookingModel");

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

  const guestAccount = await ensureGuestUserAccount({ name: guestName, email: to, phone: "5551234567" });

  const created = await createBooking({
    event_id: event.id,
    organizer_id: event.organizer_id || 1,
    user_id: guestAccount?.userId || null,
    is_guest_booking: true,
    name: guestName,
    email: to,
    phone: "5551234567",
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

  const pricing = {
    event,
    organizerId: event.organizer_id || 1,
    userName: guestName,
    userEmail: to,
    userPhone: "5551234567",
    selectedDates,
    totalDays,
    attendeeCount,
    ticketCart,
    subtotalAmount,
    discountAmount,
    totalAmount,
    couponCode: null,
    isGuest: true
  };

  const payload = { name: guestName, email: to, phone: "5551234567", event_id: event.id };

  // eslint-disable-next-line no-console
  console.log(`Sending booking emails for ${to}…`);
  // eslint-disable-next-line no-console
  console.log(`  Event: ${event.title} (id ${event.id})`);
  // eslint-disable-next-line no-console
  console.log(`  Booking ref: #${created.id}`);
  if (guestAccount?.created && guestAccount.temporaryPassword) {
    // eslint-disable-next-line no-console
    console.log(`  Welcome email will include temporary password for new guest account.`);
  }

  await dispatchBookingEmails({
    bookingId: created.id,
    checkInCode: created.check_in_code,
    payload,
    pricing,
    paymentStatus,
    guestAccount: guestAccount?.created ? guestAccount : null
  });

  // eslint-disable-next-line no-console
  console.log("Emails dispatched (confirmation, welcome if new guest, organizer notification).");
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
