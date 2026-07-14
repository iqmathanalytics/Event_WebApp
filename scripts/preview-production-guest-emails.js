/**
 * Build confirmation email HTML for production guest bookings (no send).
 * Useful when Brevo blocks the local IP — files can be reviewed, and
 * server-side resend can be used after deploy.
 *
 *   node scripts/preview-production-guest-emails.js sukanthisridhar@gmail.com
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });

const fs = require("fs");
const path = require("path");
const {
  buildBookingConfirmationEmail,
  buildOrganizerBookingNotificationEmail,
  ticketBlocksFromCart
} = require("../src/utils/transactionalEmailTemplates");
const { formatSelectedSeatsLabel, parseSelectedSeatsJson } = require("../src/utils/bookingSeats");
const { publicBookingQrImageUrl } = require("../src/utils/bookingQr");
const { normalizeDateList } = require("../src/utils/eventSchedule");

const API_BASE = process.env.RESEND_API_BASE || "https://www.bookmytickets.us/api";
const ORGANIZER_EMAIL = process.env.RESEND_ORGANIZER_EMAIL || "";
const ORGANIZER_PASSWORD = process.env.RESEND_ORGANIZER_PASSWORD || "";

if (!process.env.PUBLIC_APP_URL) process.env.PUBLIC_APP_URL = "https://www.bookmytickets.us";
if (!process.env.FRONTEND_URL) process.env.FRONTEND_URL = "https://www.bookmytickets.us";

function parseTicketItemsRaw(booking) {
  try {
    const raw = booking.ticket_items_json;
    if (raw) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_err) {
    /* ignore */
  }
  return Array.isArray(booking.ticket_items) ? booking.ticket_items : [];
}

function extractSeatsFromBooking(booking) {
  const fromColumn = parseSelectedSeatsJson(booking.selected_seats_json);
  if (fromColumn.length) return fromColumn;
  const nested = [];
  for (const item of parseTicketItemsRaw(booking)) {
    for (const seat of Array.isArray(item?.seats) ? item.seats : []) {
      const label = String(seat?.label || "").trim();
      if (!label) continue;
      nested.push({
        label,
        category: seat?.category,
        category_label: seat?.category_label || item?.level_name,
        price: seat?.price
      });
    }
  }
  return nested;
}

function parseTicketItems(booking) {
  return parseTicketItemsRaw(booking)
    .map((row) => ({
      level_id: String(row?.level_id || "").trim(),
      level_name: String(row?.level_name || "Ticket").trim(),
      unit_price: Number(row?.unit_price) || 0,
      quantity: Math.max(0, Number(row?.quantity) || 0)
    }))
    .filter((row) => row.quantity > 0);
}

async function main() {
  const guestEmail = String(process.argv[2] || "").trim().toLowerCase();
  const password = ORGANIZER_PASSWORD || process.argv[3] || "";
  if (!guestEmail || !password || !ORGANIZER_EMAIL) {
    console.error(
      "Usage: RESEND_ORGANIZER_EMAIL=... RESEND_ORGANIZER_PASSWORD=... node scripts/preview-production-guest-emails.js guest@email.com"
    );
    process.exit(1);
  }

  const loginRes = await fetch(`${API_BASE}/auth/login/user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ORGANIZER_EMAIL, password })
  });
  const login = await loginRes.json();
  const token = login?.data?.accessToken || login?.data?.token;
  if (!token) throw new Error(login?.message || "Login failed");

  const booksRes = await fetch(`${API_BASE}/bookings/organizer`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const booksJson = await booksRes.json();
  const rows = (booksJson.data || [])
    .filter((b) => String(b.email || "").trim().toLowerCase() === guestEmail)
    .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));

  if (!rows.length) {
    throw new Error(`No bookings for ${guestEmail}`);
  }

  const outDir = path.resolve(__dirname, "..", "docs", "email-outbox");
  fs.mkdirSync(outDir, { recursive: true });

  for (const row of rows) {
    const selectedDates = normalizeDateList(
      Array.isArray(row.selected_dates) ? row.selected_dates : []
    );
    const selectedSeats = extractSeatsFromBooking(row);
    const selectedSeatsLabel = formatSelectedSeatsLabel(selectedSeats);
    const ticketCart = parseTicketItems(row);
    const totalDays = Number(row.total_days) || 1;
    const paymentStatus = String(row.payment_status || "paid").toLowerCase();
    const qrImageUrl =
      row.check_in_code && (paymentStatus === "paid" || paymentStatus === "free")
        ? publicBookingQrImageUrl(row.check_in_code)
        : null;
    const ticketBlocks = ticketBlocksFromCart(ticketCart, totalDays, selectedSeats);
    const event = { id: row.event_id, title: row.event_title, public_slug: null };
    const isGuest =
      row.is_guest_booking === 1 ||
      row.is_guest_booking === true ||
      String(row.is_guest_booking || "") === "1" ||
      row.user_id == null;

    const guestMail = buildBookingConfirmationEmail({
      guestName: row.name || "Guest",
      eventTitle: event.title,
      event,
      bookingId: row.id,
      selectedDates,
      totalDays,
      attendeeCount: Number(row.attendee_count) || 0,
      selectedSeatsLabel,
      ticketBlocks,
      subtotalAmount: row.subtotal_amount,
      discountAmount: row.discount_amount,
      totalAmount: row.total_amount,
      couponCode: row.coupon_code,
      paymentStatus,
      qrImageUrl,
      isGuestBooking: isGuest
    });

    const file = path.join(outDir, `booking-${row.id}-guest.html`);
    fs.writeFileSync(file, guestMail.html, "utf8");
    console.log(`Wrote ${file}`);
    console.log(`  seats: ${selectedSeatsLabel || "n/a"}`);
    console.log(`  subject: ${guestMail.subject}`);
  }

  console.log(`Done. ${rows.length} preview file(s) in ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
