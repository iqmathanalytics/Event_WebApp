function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildLayout({ eyebrow, title, subtitle, ctaLabel, ctaUrl, rows, footerNote, highlights = [], preheader = "" }) {
  const safeRows = Array.isArray(rows) ? rows.filter((r) => r && r.label && r.value) : [];
  const safeHighlights = Array.isArray(highlights) ? highlights.filter(Boolean).slice(0, 3) : [];
  const rowsHtml = safeRows.length
    ? safeRows
        .map(
          (r) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; width: 38%; color: #475569; font-size: 13px; font-weight: 600;">
            ${escapeHtml(r.label)}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;">
            ${escapeHtml(r.value)}
          </td>
        </tr>`
        )
        .join("")
    : "";
  const highlightsHtml = safeHighlights.length
    ? `<tr><td style="padding: 18px 28px 6px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              ${safeHighlights
                .map(
                  (item) => `<td style="padding: 0 6px 8px 0; vertical-align: top;">
                    <div style="border: 1px solid #e2e8f0; border-radius: 14px; background: linear-gradient(180deg,#ffffff,#f8fafc); padding: 12px;">
                      <div style="font-size: 12px; color: #334155; line-height: 1.5;">${escapeHtml(item)}</div>
                    </div>
                  </td>`
                )
                .join("")}
            </tr>
          </table>
        </td></tr>`
    : "";

  const ctaHtml = ctaUrl && ctaLabel
    ? `<a href="${escapeHtml(ctaUrl)}" style="display: inline-block; margin-top: 22px; padding: 13px 24px; border-radius: 12px; background: linear-gradient(135deg, #0f172a, #1e293b); color: #ffffff; font-size: 14px; font-weight: 700; letter-spacing: 0.01em; text-decoration: none;">${escapeHtml(ctaLabel)} →</a>`
    : "";
  const safePreheader = String(preheader || "").trim();

  return `
<!doctype html>
<html>
  <body style="margin: 0; padding: 0; background: #f8fafc; font-family: Inter, Segoe UI, Arial, sans-serif; color: #0f172a;">
    ${safePreheader ? `<div style="display:none;opacity:0;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f8fafc;">${escapeHtml(safePreheader)}</div>` : ""}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; overflow: hidden; border-radius: 20px; border: 1px solid #e2e8f0; background: #ffffff;">
            <tr>
              <td style="padding: 28px 28px 18px; background: radial-gradient(circle at 20% 0%, rgba(244,63,94,0.18), transparent 46%), radial-gradient(circle at 100% 100%, rgba(99,102,241,0.16), transparent 48%), linear-gradient(135deg, #0f172a, #111827); color: #ffffff;">
                <div style="display: inline-block; padding: 6px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.24); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 700;">${escapeHtml(eyebrow)}</div>
                <h1 style="margin: 14px 0 8px; font-size: 28px; line-height: 1.2;">${escapeHtml(title)}</h1>
                <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.6;">${escapeHtml(subtitle)}</p>
              </td>
            </tr>
            ${highlightsHtml}
            <tr>
              <td style="padding: 24px 28px;">
                ${rowsHtml ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rowsHtml}</table>` : ""}
                ${ctaHtml}
                <p style="margin: 22px 0 0; color: #64748b; font-size: 12px; line-height: 1.55;">
                  ${escapeHtml(footerNote || "Thanks for being part of Yay! Eventz.")}
                </p>
                <p style="margin: 8px 0 0; color: #94a3b8; font-size: 11px;">
                  Yay! Eventz • This is a transactional email related to your account activity.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildWelcomeEmail({ firstName }) {
  const safeFirstName = String(firstName || "there").trim() || "there";
  const subject = `Welcome to Yay! Eventz, ${safeFirstName}!`;
  const text = [
    `Hey ${safeFirstName},`,
    "",
    "Welcome to Yay! Eventz.",
    "Your account is live — you can now discover events, explore creator spotlights, and post your own updates.",
    "",
    "See you inside,",
    "Yay! Eventz Team"
  ].join("\n");
  const html = buildLayout({
    eyebrow: "Welcome",
    title: `Hey ${safeFirstName}, you're in.`,
    subtitle: "Your Yay! Eventz account is ready. Discover the hottest events, creator spotlights, and premium deals in one place.",
    preheader: "Your account is ready. Start exploring events, influencers, and deals.",
    ctaLabel: "Open Yay! Eventz",
    ctaUrl: process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || "",
    highlights: [
      "Discover curated local events and premium experiences",
      "Track creator spotlights and audience trends in one place",
      "Submit your own event and deal listings from your dashboard"
    ],
    rows: [
      { label: "Account Status", value: "Active" },
      { label: "Discovery Access", value: "Events, Influencers, Deals" },
      { label: "Creator Tools", value: "Submit Events and Deals" },
      { label: "Support", value: "Reply to this email for help" }
    ],
    footerNote: "If you did not create this account, please contact support."
  });
  return { subject, text, html };
}

function buildApprovalEmail({ listingType, recipientName, title, details, reviewNote }) {
  const normalizedType = String(listingType || "").toLowerCase();
  const typeLabel =
    normalizedType === "events"
      ? "Event"
      : normalizedType === "influencers"
        ? "Influencer Profile"
        : normalizedType === "deals"
          ? "Deal"
          : "Listing";
  const safeRecipient = String(recipientName || "there").trim() || "there";
  const subject = `${typeLabel} Approved on Yay! Eventz`;
  const textLines = [
    `Hi ${safeRecipient},`,
    "",
    `Great news — your ${typeLabel.toLowerCase()} has been approved on Yay! Eventz.`,
    `Title: ${title || "Untitled"}`,
    ...(Array.isArray(details) ? details.map((d) => `${d.label}: ${d.value}`) : []),
    ...(reviewNote ? ["", `Admin note: ${reviewNote}`] : []),
    "",
    "You can now view it live from your dashboard."
  ];
  const html = buildLayout({
    eyebrow: `${typeLabel} Approved`,
    title: `Your ${typeLabel.toLowerCase()} is now live`,
    subtitle: `Hi ${safeRecipient}, your submission passed moderation and is now visible on Yay! Eventz.`,
    preheader: `${typeLabel} approved. Your listing is now live on Yay! Eventz.`,
    ctaLabel: "Open My Dashboard",
    ctaUrl: `${process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || ""}/dashboard/user`,
    highlights: [
      `Your ${typeLabel.toLowerCase()} is now publicly visible`,
      "You can edit and re-submit future updates any time",
      "Keep your details refreshed for better discovery"
    ],
    rows: [
      { label: "Status", value: "Approved" },
      { label: `${typeLabel} Title`, value: title || "Untitled" },
      ...(Array.isArray(details) ? details : []),
      ...(reviewNote ? [{ label: "Admin Note", value: reviewNote }] : [])
    ],
    footerNote: "Keep your listing updated to maximize visibility and engagement."
  });
  return { subject, text: textLines.join("\n"), html };
}

module.exports = {
  buildWelcomeEmail,
  buildApprovalEmail
};
