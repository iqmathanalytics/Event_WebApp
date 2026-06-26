const {
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_SUPPORT_EMAIL,
  brandLogoEmailUrl,
  dashboardUrl,
  eventDetailUrl
} = require("./brandEmail");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatUsd(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    return "$0.00";
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatDateUs(iso) {
  if (!iso) {
    return "—";
  }
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return String(iso);
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function paymentStatusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "paid") {
    return "Confirmed · Paid";
  }
  if (s === "free") {
    return "Confirmed · Complimentary";
  }
  if (s === "pending") {
    return "Pending";
  }
  return "Confirmed";
}

/**
 * Shared Book My Tickets email shell (Brevo HTML).
 */
function buildLayout({
  preheader = "",
  eyebrow,
  title,
  subtitle,
  rows = [],
  highlights = [],
  ticketBlocks = [],
  ctaLabel,
  ctaUrl,
  footerNote,
  headerTone = "rose",
  qrImageUrl = null,
  qrCaption = "Entry QR — staff will scan this at the door"
}) {
  const logoUrl = brandLogoEmailUrl();
  const headerGrad =
    headerTone === "emerald"
      ? "linear-gradient(135deg, #064e3b 0%, #0f766e 55%, #134e4a 100%)"
      : headerTone === "violet"
        ? "linear-gradient(135deg, #312e81 0%, #5b21b6 55%, #1e1b4b 100%)"
        : "linear-gradient(135deg, #881337 0%, #be123c 42%, #0f172a 100%)";

  const safeRows = (Array.isArray(rows) ? rows : []).filter((r) => r && r.label && r.value != null && r.value !== "");
  const rowsHtml = safeRows
    .map(
      (r) => `
      <tr>
        <td style="padding:11px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px 0 0 12px;width:36%;vertical-align:top;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b;">
          ${escapeHtml(r.label)}
        </td>
        <td style="padding:11px 14px;background:#ffffff;border:1px solid #e2e8f0;border-left:0;border-radius:0 12px 12px 0;vertical-align:top;font-size:14px;font-weight:600;color:#0f172a;line-height:1.45;">
          ${escapeHtml(r.value)}
        </td>
      </tr>
      <tr><td colspan="2" style="height:8px;font-size:0;line-height:0;">&nbsp;</td></tr>`
    )
    .join("");

  const highlightsHtml = (Array.isArray(highlights) ? highlights : [])
    .filter(Boolean)
    .slice(0, 3)
    .map(
      (item) => `
      <td style="width:33.33%;padding:0 5px 10px 0;vertical-align:top;">
        <div style="border:1px solid #fecdd3;border-radius:14px;background:linear-gradient(180deg,#fff1f2,#ffffff);padding:12px 12px 10px;min-height:72px;">
          <div style="font-size:12px;line-height:1.5;color:#334155;font-weight:500;">${escapeHtml(item)}</div>
        </div>
      </td>`
    )
    .join("");

  const ticketBlocksHtml = (Array.isArray(ticketBlocks) ? ticketBlocks : [])
    .map((block) => {
      const tone = block.tone || "standard";
      const border = tone === "luxe" ? "#fbbf24" : tone === "premium" ? "#a78bfa" : "#7dd3fc";
      const bg =
        tone === "luxe"
          ? "linear-gradient(135deg,#fffbeb,#fef3c7)"
          : tone === "premium"
            ? "linear-gradient(135deg,#f5f3ff,#ede9fe)"
            : "linear-gradient(135deg,#f0f9ff,#e0f2fe)";
      return `
      <div style="margin-bottom:8px;border:1px solid ${border};border-radius:14px;background:${bg};padding:12px 14px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="vertical-align:top;">
              <span style="display:inline-block;margin-bottom:4px;padding:2px 8px;border-radius:999px;background:#0f172a;color:#fff;font-size:9px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(block.badge || "Ticket")}</span>
              <div style="font-size:14px;font-weight:800;color:#0f172a;">${escapeHtml(block.name)}</div>
              <div style="margin-top:2px;font-size:12px;color:#475569;">${escapeHtml(block.meta || "")}</div>
            </td>
            <td style="vertical-align:top;text-align:right;white-space:nowrap;">
              <div style="font-size:15px;font-weight:800;color:#0f172a;">${escapeHtml(block.price || "")}</div>
            </td>
          </tr>
        </table>
      </div>`;
    })
    .join("");

  const qrHtml = qrImageUrl
    ? `<div style="margin:20px 0 8px;text-align:center;">
        <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#64748b;">${escapeHtml(qrCaption)}</p>
        <img src="${escapeHtml(qrImageUrl)}" alt="Ticket QR code" width="200" height="200" style="display:inline-block;width:200px;height:200px;border:8px solid #ffffff;border-radius:16px;box-shadow:0 8px 24px rgba(15,23,42,0.12);" />
      </div>`
    : "";

  const ctaHtml =
    ctaUrl && ctaLabel
      ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:22px;">
          <tr>
            <td style="border-radius:999px;background:linear-gradient(135deg,#e11d48,#be123c);">
              <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;letter-spacing:0.02em;">${escapeHtml(ctaLabel)} →</a>
            </td>
          </tr>
        </table>`
      : "";

  const preheaderHtml = String(preheader || "").trim()
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f1f5f9;">${escapeHtml(preheader)}</div>`
    : "";

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Segoe UI,Inter,Helvetica,Arial,sans-serif;color:#0f172a;">
  ${preheaderHtml}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;">
    <tr><td align="center" style="padding:28px 14px 36px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;">
        <tr>
          <td style="padding:0 0 14px;text-align:center;">
            <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(BRAND_NAME)}" width="120" style="display:inline-block;max-width:120px;height:auto;border:0;" />
          </td>
        </tr>
        <tr>
          <td style="border-radius:24px;overflow:hidden;border:1px solid #e2e8f0;background:#ffffff;box-shadow:0 18px 48px rgba(15,23,42,0.08);">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding:26px 28px 22px;background:${headerGrad};color:#ffffff;">
                  <div style="font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;opacity:0.88;">${escapeHtml(eyebrow)}</div>
                  <h1 style="margin:10px 0 8px;font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-0.02em;">${escapeHtml(title)}</h1>
                  <p style="margin:0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.92);">${escapeHtml(subtitle)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 26px 28px;">
                  ${highlightsHtml ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:18px;"><tr>${highlightsHtml}</tr></table>` : ""}
                  ${ticketBlocksHtml ? `<div style="margin-bottom:16px;">${ticketBlocksHtml}</div>` : ""}
                  ${rowsHtml ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:4px;">${rowsHtml}</table>` : ""}
                  ${qrHtml}
                  ${ctaHtml}
                  <p style="margin:24px 0 0;font-size:12px;line-height:1.55;color:#64748b;">${escapeHtml(footerNote || `You're receiving this because you use ${BRAND_NAME}.`)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 8px 0;text-align:center;font-size:11px;line-height:1.5;color:#94a3b8;">
            <strong style="color:#64748b;">${escapeHtml(BRAND_NAME)}</strong> · ${escapeHtml(BRAND_TAGLINE)}<br/>
            <a href="mailto:${escapeHtml(BRAND_SUPPORT_EMAIL)}" style="color:#e11d48;text-decoration:none;">${escapeHtml(BRAND_SUPPORT_EMAIL)}</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildWelcomeEmail({
  firstName,
  signedUpWithGoogle = false,
  guestCheckout = false,
  loginEmail = null,
  temporaryPassword = null
}) {
  const safeFirstName = String(firstName || "there").trim() || "there";
  const subject = `Welcome to ${BRAND_NAME}, ${safeFirstName}!`;

  const signupLine = guestCheckout && temporaryPassword
    ? "We created a My Hub account from your guest booking. Use the login details below to view your tickets anytime."
    : signedUpWithGoogle
      ? "Your account is ready — you signed up with Google and can start exploring right away."
      : "Your account is ready — sign in anytime to discover events and book tickets on-site.";

  const textLines = [
    `Hi ${safeFirstName},`,
    "",
    `Welcome to ${BRAND_NAME} — ${BRAND_TAGLINE}.`,
    signupLine,
    ""
  ];
  if (guestCheckout && loginEmail && temporaryPassword) {
    textLines.push(
      `Sign in: ${dashboardUrl("/login")}`,
      `Email: ${loginEmail}`,
      `Temporary password: ${temporaryPassword}`,
      "",
      "Please change your password after signing in.",
      ""
    );
  }
  textLines.push(
    `Explore events: ${dashboardUrl("/events")}`,
    `Your dashboard: ${dashboardUrl("/dashboard/user")}`,
    "",
    "See you inside,",
    `${BRAND_NAME} Team`
  );

  const rows = [
    { label: "Account", value: "Active" },
    ...(guestCheckout && loginEmail ? [{ label: "Login email", value: loginEmail }] : []),
    ...(guestCheckout && temporaryPassword
      ? [{ label: "Temporary password", value: temporaryPassword }]
      : []),
    { label: "Sign-in", value: signedUpWithGoogle ? "Google" : "Email & password" },
    { label: "Support", value: BRAND_SUPPORT_EMAIL }
  ];

  const html = buildLayout({
    preheader: `Welcome to ${BRAND_NAME}. Your account is active.`,
    eyebrow: "Welcome aboard",
    title: `Hi ${safeFirstName}, you're in.`,
    subtitle: signupLine,
    headerTone: "rose",
    highlights: [
      "Browse curated events, deals, and creator spotlights",
      "Book platform tickets in a few taps when events sell on-site",
      guestCheckout
        ? "Sign in to My Hub to see bookings from your guest checkout"
        : "Save favorites and manage bookings from My Hub"
    ],
    rows,
    ctaLabel: guestCheckout ? "Sign in to My Hub" : `Explore ${BRAND_NAME}`,
    ctaUrl: guestCheckout ? dashboardUrl("/login") : dashboardUrl("/events"),
    footerNote: guestCheckout
      ? `Change your temporary password after signing in. Questions? ${BRAND_SUPPORT_EMAIL}`
      : `Questions? Reply to this email or write to ${BRAND_SUPPORT_EMAIL}. If you didn't create this account, contact us right away.`
  });

  return { subject, text: textLines.join("\n"), html };
}

function buildApprovalEmail({ listingType, recipientName, title, details, reviewNote }) {
  const normalizedType = String(listingType || "").toLowerCase();
  const typeLabel =
    normalizedType === "events"
      ? "Event"
      : normalizedType === "influencers"
        ? "Influencer profile"
        : normalizedType === "deals"
          ? "Deal"
          : "Listing";
  const safeRecipient = String(recipientName || "there").trim() || "there";
  const subject = `Your ${typeLabel.toLowerCase()} is live on ${BRAND_NAME}`;

  const text = [
    `Hi ${safeRecipient},`,
    "",
    `Great news — your ${typeLabel.toLowerCase()} has been approved on ${BRAND_NAME}.`,
    `Title: ${title || "Untitled"}`,
    ...(Array.isArray(details) ? details.map((d) => `${d.label}: ${d.value}`) : []),
    ...(reviewNote ? ["", `Note from our team: ${reviewNote}`] : []),
    "",
    `View your dashboard: ${dashboardUrl("/dashboard/user")}`
  ].join("\n");

  const html = buildLayout({
    preheader: `${typeLabel} approved — now live on ${BRAND_NAME}.`,
    eyebrow: "Approved & live",
    title: `Your ${typeLabel.toLowerCase()} is published`,
    subtitle: `Hi ${safeRecipient}, moderation is complete. Guests can now discover your ${typeLabel.toLowerCase()} on ${BRAND_NAME}.`,
    headerTone: "emerald",
    highlights: [
      "Your listing is visible on the public site",
      "Share the event page link to drive more views",
      "Update details anytime from your organizer dashboard"
    ],
    rows: [
      { label: "Status", value: "Approved · Live" },
      { label: `${typeLabel} title`, value: title || "Untitled" },
      ...(Array.isArray(details) ? details : []),
      ...(reviewNote ? [{ label: "Team note", value: reviewNote }] : [])
    ],
    ctaLabel: "Open My Hub",
    ctaUrl: dashboardUrl("/dashboard/user"),
    footerNote: "Keep your listing fresh — accurate dates, images, and ticket info help guests book with confidence."
  });

  return { subject, text, html };
}

function buildBookingConfirmationEmail({
  guestName,
  eventTitle,
  event,
  bookingId,
  selectedDates,
  totalDays,
  attendeeCount,
  ticketBlocks,
  subtotalAmount,
  discountAmount,
  totalAmount,
  couponCode,
  paymentStatus,
  qrImageUrl = null,
  isGuestBooking = false
}) {
  const safeName = String(guestName || "there").trim() || "there";
  const datesLabel = (selectedDates || []).map(formatDateUs).join(", ") || "See your booking";
  const subject = `You're booked — ${eventTitle || "your event"} · ${BRAND_NAME}`;
  const eventUrl = event ? eventDetailUrl(event) : dashboardUrl("/events");
  const createAccountUrl = dashboardUrl("/register");
  const guestAccountLine =
    "One step to create your account with bookmytickets.us to receive first hand notifications of events and deals around your city.";

  const totalLine = formatUsd(totalAmount);
  const discount = Number(discountAmount) || 0;
  const payLabel = paymentStatusLabel(paymentStatus);

  const text = [
    `Hi ${safeName},`,
    "",
    `Your ticket booking is confirmed on ${BRAND_NAME}.`,
    `Event: ${eventTitle || "Event"}`,
    `Show date(s): ${datesLabel}`,
    `Tickets: ${attendeeCount || 0}`,
    `Total: ${totalLine}`,
    discount > 0 ? `Discount: ${formatUsd(discount)}${couponCode ? ` (${couponCode})` : ""}` : "",
    `Status: ${payLabel}`,
    `Booking reference: #${bookingId}`,
    qrImageUrl ? "Your entry QR code is shown in this email." : "",
    isGuestBooking ? guestAccountLine : "",
    isGuestBooking ? `Click here to create your account: ${createAccountUrl}` : "",
    "",
    `View event: ${eventUrl}`,
    `My bookings: ${dashboardUrl("/dashboard/user")}`,
    "",
    `${BRAND_NAME} Team`
  ].join("\n");

  const rows = [
    { label: "Booking ref", value: `#${bookingId}` },
    { label: "Status", value: payLabel },
    { label: "Event", value: eventTitle || "Event" },
    { label: "Show date(s)", value: datesLabel },
    { label: "Tickets", value: String(attendeeCount || 0) },
    ...(totalDays > 1 ? [{ label: "Show days", value: String(totalDays) }] : []),
    { label: "Total paid", value: totalLine }
  ];
  if (discount > 0) {
    rows.push({ label: "You saved", value: `${formatUsd(discount)}${couponCode ? ` · ${couponCode}` : ""}` });
  }

  const html = buildLayout({
    preheader: `Booking confirmed for ${eventTitle || "your event"}.`,
    eyebrow: "Booking confirmed",
    title: "You're all set for the show",
    subtitle: qrImageUrl
      ? `Hi ${safeName}, your tickets are confirmed. Show the QR code below at the venue for entry.`
      : `Hi ${safeName}, your tickets are confirmed. Keep this email for your records.`,
    headerTone: "violet",
    ticketBlocks: ticketBlocks || [],
    rows,
    qrImageUrl,
    qrCaption: "Scan at entry · keep this email handy",
    highlights: isGuestBooking
      ? [
          "One step to create your account with bookmytickets.us to receive first hand notifications of events and deals around your city."
        ]
      : [],
    ctaLabel: isGuestBooking ? "Create your free account" : "View my bookings",
    ctaUrl: isGuestBooking ? createAccountUrl : dashboardUrl("/dashboard/user"),
    footerNote: `Need help? Contact ${BRAND_SUPPORT_EMAIL}. Present your QR code at the event for check-in.`
  });

  return { subject, text, html };
}

function buildOrganizerBookingNotificationEmail({
  organizerName,
  eventTitle,
  event,
  bookingId,
  guestName,
  guestEmail,
  guestPhone,
  selectedDates,
  totalDays,
  attendeeCount,
  ticketBlocks,
  subtotalAmount,
  discountAmount,
  totalAmount,
  couponCode,
  paymentStatus,
  isGuestBooking = false
}) {
  const safeOrganizer = String(organizerName || "there").trim() || "there";
  const datesLabel = (selectedDates || []).map(formatDateUs).join(", ") || "—";
  const subject = `New booking — ${eventTitle || "your event"} · ${BRAND_NAME}`;
  const totalLine = formatUsd(totalAmount);
  const discount = Number(discountAmount) || 0;
  const payLabel = paymentStatusLabel(paymentStatus);
  const guestLabel = String(guestName || "Guest").trim() || "Guest";

  const text = [
    `Hi ${safeOrganizer},`,
    "",
    `You have a new ticket booking on ${BRAND_NAME}.`,
    `Event: ${eventTitle || "Event"}`,
    `Guest: ${guestLabel}`,
    `Email: ${guestEmail || "—"}`,
    guestPhone ? `Phone: ${guestPhone}` : "",
    `Show date(s): ${datesLabel}`,
    `Tickets: ${attendeeCount || 0}`,
    `Total: ${totalLine}`,
    discount > 0 ? `Discount: ${formatUsd(discount)}${couponCode ? ` (${couponCode})` : ""}` : "",
    `Status: ${payLabel}`,
    `Booking reference: #${bookingId}`,
    isGuestBooking ? "Booked via guest checkout." : "",
    "",
    `Organizer dashboard: ${dashboardUrl("/dashboard/organizer")}`,
    "",
    `${BRAND_NAME} Team`
  ]
    .filter(Boolean)
    .join("\n");

  const rows = [
    { label: "Booking ref", value: `#${bookingId}` },
    { label: "Status", value: payLabel },
    { label: "Guest", value: guestLabel },
    { label: "Guest email", value: guestEmail || "—" },
    ...(guestPhone ? [{ label: "Guest phone", value: guestPhone }] : []),
    { label: "Event", value: eventTitle || "Event" },
    { label: "Show date(s)", value: datesLabel },
    { label: "Tickets", value: String(attendeeCount || 0) },
    ...(totalDays > 1 ? [{ label: "Show days", value: String(totalDays) }] : []),
    { label: "Total", value: totalLine }
  ];
  if (discount > 0) {
    rows.push({ label: "Discount", value: `${formatUsd(discount)}${couponCode ? ` · ${couponCode}` : ""}` });
  }
  if (isGuestBooking) {
    rows.push({ label: "Checkout", value: "Guest checkout" });
  }

  const html = buildLayout({
    preheader: `New booking for ${eventTitle || "your event"}.`,
    eyebrow: "New booking",
    title: "Someone just booked your event",
    subtitle: `Hi ${safeOrganizer}, a guest completed checkout for ${eventTitle || "your event"}. Details are below.`,
    headerTone: "emerald",
    ticketBlocks: ticketBlocks || [],
    rows,
    ctaLabel: "Open organizer dashboard",
    ctaUrl: dashboardUrl("/dashboard/organizer"),
    footerNote: `Manage bookings and analytics from your organizer dashboard. Questions? ${BRAND_SUPPORT_EMAIL}`
  });

  return { subject, text, html };
}

function buildContactAdminEmail({ contactId, name, email, subject: topic, message }) {
  const subject = `[${BRAND_NAME} Contact] ${topic}`;
  const text = [
    `New message on ${BRAND_NAME} contact form (#${contactId})`,
    "",
    `From: ${name} <${email}>`,
    `Subject: ${topic}`,
    "",
    message
  ].join("\n");

  const html = buildLayout({
    preheader: `New contact form message: ${topic}`,
    eyebrow: "New contact message",
    title: "Someone reached out",
    subtitle: `A visitor submitted the contact form on ${BRAND_NAME}. Reply directly to their email.`,
    headerTone: "rose",
    rows: [
      { label: "Reference", value: `#${contactId}` },
      { label: "From", value: `${name} <${email}>` },
      { label: "Subject", value: topic },
      { label: "Message", value: message }
    ],
    footerNote: "Reply to the sender's email address to respond."
  });

  return { subject, text, html };
}

function ticketBlocksFromCart(cart, totalDays) {
  const days = Math.max(1, Number(totalDays) || 1);
  return (cart || []).map((row, index) => {
    const qty = Number(row.quantity) || 0;
    const unit = Number(row.unit_price) || 0;
    const line = unit * qty * days;
    let tone = "standard";
    const name = String(row.level_name || "Ticket").toLowerCase();
    if (/\b(vip|platinum|gold|luxe)\b/.test(name)) {
      tone = "luxe";
    } else if (/\b(premium|plus|preferred)\b/.test(name)) {
      tone = "premium";
    } else if (index === 1) {
      tone = "premium";
    } else if (index >= 2) {
      tone = "luxe";
    }
    return {
      tone,
      badge: tone === "luxe" ? "Luxe" : tone === "premium" ? "Premium" : "Standard",
      name: row.level_name || "Ticket",
      meta: `${qty} ticket${qty === 1 ? "" : "s"}${days > 1 ? ` · ${days} show days` : ""}${unit > 0 ? ` · ${formatUsd(unit)} each` : ""}`,
      price: line > 0 ? formatUsd(line) : ""
    };
  });
}

function buildPlatformTicketRequestAdminEmail({
  requestId,
  name,
  email,
  mobileNumber,
  organizationName,
  message
}) {
  const subject = `[${BRAND_NAME}] On-site ticket sales request #${requestId}`;
  const text = [
    `New on-site ticket sales request (#${requestId})`,
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    mobileNumber ? `Phone: ${mobileNumber}` : null,
    organizationName ? `Organization: ${organizationName}` : null,
    "",
    message
  ]
    .filter(Boolean)
    .join("\n");

  const html = buildLayout({
    preheader: `${name} requested on-site ticket hosting`,
    eyebrow: "On-site tickets",
    title: "New hosting request",
    subtitle: `Review this request in the admin dashboard under Ticket access, then approve to enable on-site sales for the organizer.`,
    headerTone: "violet",
    rows: [
      { label: "Reference", value: `#${requestId}` },
      { label: "Name", value: name },
      { label: "Email", value: email },
      { label: "Phone", value: mobileNumber || "—" },
      { label: "Organization", value: organizationName || "—" },
      { label: "Message", value: message }
    ],
    ctaLabel: "Open admin dashboard",
    ctaUrl: dashboardUrl("/dashboard/admin"),
    footerNote: "Approve the request to enable on-site ticket sales for this user."
  });

  return { subject, text, html };
}

function buildPlatformTicketRequestUserEmail({ name, approved, note }) {
  if (approved === true) {
    const subject = `${BRAND_NAME} — on-site ticket sales enabled`;
    const text = [
      `Hi ${name},`,
      "",
      "Your request to host ticket sales on Book My Tickets has been approved.",
      "Open your dashboard and choose “On this site” when posting an event — the option appears right away.",
      "",
      `Questions? ${BRAND_SUPPORT_EMAIL}`
    ].join("\n");
    const html = buildLayout({
      preheader: "You can now sell tickets on-site",
      eyebrow: "Approved",
      title: "You're cleared for on-site tickets",
      subtitle: "Post or edit an event and select on-site checkout — your dashboard updates automatically after approval.",
      headerTone: "emerald",
      rows: [{ label: "Next step", value: "Open your dashboard and post an event with on-site tickets." }],
      ctaLabel: "Go to dashboard",
      ctaUrl: dashboardUrl("/dashboard/user"),
      footerNote: `Need help? ${BRAND_SUPPORT_EMAIL}`
    });
    return { subject, text, html };
  }

  if (approved === false) {
    const subject = `${BRAND_NAME} — on-site ticket request update`;
    const text = [
      `Hi ${name},`,
      "",
      "We reviewed your request to host on-site ticket sales and are unable to approve it at this time.",
      note ? `Note from our team: ${note}` : null,
      "",
      `You can reply to ${BRAND_SUPPORT_EMAIL} if you have questions.`
    ]
      .filter(Boolean)
      .join("\n");
    const html = buildLayout({
      preheader: "Update on your hosting request",
      eyebrow: "Request update",
      title: "Request not approved",
      subtitle: "You may submit a new request later with more detail about your events.",
      headerTone: "rose",
      rows: note ? [{ label: "Note", value: note }] : [],
      footerNote: `Contact ${BRAND_SUPPORT_EMAIL} with questions.`
    });
    return { subject, text, html };
  }

  const subject = `${BRAND_NAME} — we received your on-site ticket request`;
  const text = [
    `Hi ${name},`,
    "",
    "Thanks for your interest in hosting ticket sales on Book My Tickets.",
    "Our team will review your request and email you when a decision is made.",
    "",
    `Questions? ${BRAND_SUPPORT_EMAIL}`
  ].join("\n");
  const html = buildLayout({
    preheader: "Request received",
    eyebrow: "Request received",
    title: "Thanks — we're reviewing your request",
    subtitle: "You'll get another email when an admin approves or responds.",
    headerTone: "violet",
    footerNote: `Questions? ${BRAND_SUPPORT_EMAIL}`
  });
  return { subject, text, html };
}

module.exports = {
  buildWelcomeEmail,
  buildApprovalEmail,
  buildBookingConfirmationEmail,
  buildOrganizerBookingNotificationEmail,
  buildContactAdminEmail,
  buildPlatformTicketRequestAdminEmail,
  buildPlatformTicketRequestUserEmail,
  ticketBlocksFromCart,
  formatUsd,
  formatDateUs
};
