/**
 * Fetch organizer bookings from production and resend confirmation emails
 * for a guest address using local Brevo credentials.
 *
 *   node scripts/resend-production-guest-emails.js sukanthisridhar@gmail.com
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });

const nodemailer = require("nodemailer");
const { sendTransactionalEmail } = require("../src/utils/emailIntegrations");
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

// Prefer production frontend URLs for QR / CTA links in resent mail.
if (!process.env.PUBLIC_APP_URL) {
  process.env.PUBLIC_APP_URL = "https://www.bookmytickets.us";
}
if (!process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL = "https://www.bookmytickets.us";
}

async function sendViaGmailFallback({ to, subject, text, html }) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: ORGANIZER_EMAIL,
      pass: ORGANIZER_PASSWORD
    }
  });
  await transporter.sendMail({
    from: `"Book My Tickets (via BigBaskyEvent)" <${ORGANIZER_EMAIL}>`,
    to,
    subject,
    text,
    html
  });
  return { sent: true, provider: "gmail-fallback" };
}

async function sendMail({ to, subject, text, html }) {
  const brevo = await sendTransactionalEmail({ to, subject, text, html });
  if (brevo.sent) {
    return brevo;
  }
  console.warn(`  Brevo unavailable (${brevo.error || brevo.skipped || "unknown"}); trying Gmail SMTP fallback…`);
  return sendViaGmailFallback({ to, subject, text, html });
}

function parseTicketItemsRaw(booking) {
  try {
    const raw = booking.ticket_items_json;
    if (raw) {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (_err) {
    /* fall through */
  }
  return Array.isArray(booking.ticket_items) ? booking.ticket_items : [];
}

function extractSeatsFromBooking(booking) {
  const fromColumn = parseSelectedSeatsJson(booking.selected_seats_json);
  if (fromColumn.length) {
    return fromColumn;
  }
  if (Array.isArray(booking.selected_seats) && booking.selected_seats.length) {
    return parseSelectedSeatsJson(booking.selected_seats);
  }

  const nested = [];
  for (const item of parseTicketItemsRaw(booking)) {
    const seats = Array.isArray(item?.seats) ? item.seats : [];
    for (const seat of seats) {
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
  if (Array.isArray(booking.ticket_items) && booking.ticket_items.length) {
    return booking.ticket_items.map((row) => ({
      level_id: String(row?.level_id || "").trim(),
      level_name: String(row?.level_name || "Ticket").trim(),
      unit_price: Number(row?.unit_price) || 0,
      quantity: Math.max(0, Number(row?.quantity) || 0)
    })).filter((row) => row.quantity > 0);
  }
  try {
    const raw = booking.ticket_items_json;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        level_id: String(row?.level_id || "").trim(),
        level_name: String(row?.level_name || "Ticket").trim(),
        unit_price: Number(row?.unit_price) || 0,
        quantity: Math.max(0, Number(row?.quantity) || 0)
      }))
      .filter((row) => row.quantity > 0);
  } catch {
    return [];
  }
}

async function loginOrganizer() {
  const res = await fetch(`${API_BASE}/auth/login/user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ORGANIZER_EMAIL, password: ORGANIZER_PASSWORD })
  });
  const json = await res.json();
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || `Login failed (${res.status})`);
  }
  const token =
    json?.data?.accessToken ||
    json?.data?.token ||
    json?.accessToken ||
    json?.token;
  if (!token) {
    throw new Error("Login succeeded but no access token returned");
  }
  return { token, user: json.data?.user || json.data };
}

async function fetchOrganizerBookings(token) {
  const res = await fetch(`${API_BASE}/bookings/organizer`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json();
  if (!res.ok || !json?.success) {
    throw new Error(json?.message || `Fetch bookings failed (${res.status})`);
  }
  return Array.isArray(json.data) ? json.data : [];
}

async function main() {
  const guestEmail = String(process.argv[2] || "").trim().toLowerCase();
  if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
    console.error("Usage: RESEND_ORGANIZER_PASSWORD=... node scripts/resend-production-guest-emails.js guest@email.com");
    process.exit(1);
  }
  if (!ORGANIZER_EMAIL || !ORGANIZER_PASSWORD) {
    console.error(
      "Set RESEND_ORGANIZER_EMAIL and RESEND_ORGANIZER_PASSWORD before running."
    );
    process.exit(1);
  }

  console.log(`Logging into production as ${ORGANIZER_EMAIL}…`);
  const { token, user } = await loginOrganizer();
  const all = await fetchOrganizerBookings(token);
  const rows = all
    .filter((b) => String(b.email || "").trim().toLowerCase() === guestEmail)
    .sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")));

  if (!rows.length) {
    console.error(`No production bookings found for ${guestEmail} under this organizer.`);
    console.error(`Organizer has ${all.length} total booking(s).`);
    process.exit(1);
  }

  console.log(`Found ${rows.length} booking(s) for ${guestEmail}`);

  for (const row of rows) {
    const selectedDates = normalizeDateList(
      Array.isArray(row.selected_dates)
        ? row.selected_dates
        : (() => {
            try {
              const parsed = JSON.parse(row.selected_dates_json || "[]");
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })()
    );
    const selectedSeats = extractSeatsFromBooking(row);
    const selectedSeatsLabel =
      String(row.selected_seats_label || "").trim() || formatSelectedSeatsLabel(selectedSeats);
    const ticketCart = parseTicketItems(row);
    const totalDays = Number(row.total_days) || Math.max(1, selectedDates.length || 1);
    const attendeeCount = Number(row.attendee_count) || 0;
    const paymentStatus = String(row.payment_status || "paid").toLowerCase();
    const qrImageUrl =
      row.check_in_code && (paymentStatus === "paid" || paymentStatus === "free")
        ? publicBookingQrImageUrl(row.check_in_code)
        : null;
    const ticketBlocks = ticketBlocksFromCart(ticketCart, totalDays, selectedSeats);
    const isGuest =
      row.is_guest_booking === 1 ||
      row.is_guest_booking === true ||
      String(row.is_guest_booking || "") === "1" ||
      row.user_id == null;

    const event = {
      id: row.event_id,
      title: row.event_title,
      public_slug: row.event_public_slug || null
    };

    console.log(
      `  #${row.id} · ${row.event_title} · tickets=${attendeeCount} · seats=${selectedSeatsLabel || "n/a"}`
    );

    const guestMail = buildBookingConfirmationEmail({
      guestName: row.name || "Guest",
      eventTitle: event.title,
      event,
      bookingId: row.id,
      selectedDates,
      totalDays,
      attendeeCount,
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

    const guestSend = await sendMail({
      to: guestEmail,
      subject: guestMail.subject,
      text: guestMail.text,
      html: guestMail.html
    });
    if (!guestSend.sent) {
      throw new Error(`Guest email failed for booking #${row.id}: ${guestSend.error || "unknown"}`);
    }
    console.log(`  ✓ Guest confirmation -> ${guestEmail} (${guestSend.provider})`);

    const orgMail = buildOrganizerBookingNotificationEmail({
      organizerName: user?.name || "Organizer",
      eventTitle: event.title,
      event,
      bookingId: row.id,
      guestName: row.name || "Guest",
      guestEmail,
      guestPhone: row.phone || "",
      selectedDates,
      totalDays,
      attendeeCount,
      selectedSeatsLabel,
      ticketBlocks,
      subtotalAmount: row.subtotal_amount,
      discountAmount: row.discount_amount,
      totalAmount: row.total_amount,
      couponCode: row.coupon_code,
      paymentStatus,
      isGuestBooking: isGuest
    });

    const orgSend = await sendMail({
      to: ORGANIZER_EMAIL,
      subject: orgMail.subject,
      text: orgMail.text,
      html: orgMail.html
    });
    if (!orgSend.sent) {
      throw new Error(`Organizer email failed for booking #${row.id}: ${orgSend.error || "unknown"}`);
    }
    console.log(`  ✓ Organizer notice -> ${ORGANIZER_EMAIL} (${orgSend.provider})`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
