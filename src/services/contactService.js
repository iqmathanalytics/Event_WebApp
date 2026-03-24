const { createContactMessage } = require("../models/contactModel");
const { createAdminNotification } = require("../models/adminModel");
const { sendSendGridEmail } = require("../utils/emailIntegrations");

async function submitContact(payload) {
  const contactId = await createContactMessage({
    name: payload.name,
    email: payload.email,
    subject: payload.subject,
    message: payload.message,
    cityId: payload.city_id ? Number(payload.city_id) : null
  });

  await createAdminNotification({
    type: "contact_received",
    entityType: "contact",
    entityId: contactId,
    title: "New contact message",
    message: `Contact message #${contactId} received`
  });

  const adminEmail = process.env.ADMIN_CONTACT_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminEmail) {
    const text = [
      `New contact form submission (#${contactId})`,
      `From: ${payload.name} <${payload.email}>`,
      `Subject: ${payload.subject}`,
      "",
      payload.message
    ].join("\n");
    const html = `<p><strong>New contact (#${contactId})</strong></p>
<p><strong>From:</strong> ${escapeHtml(payload.name)} &lt;${escapeHtml(payload.email)}&gt;<br/>
<strong>Subject:</strong> ${escapeHtml(payload.subject)}</p>
<pre style="font-family:sans-serif;white-space:pre-wrap;">${escapeHtml(payload.message)}</pre>`;
    const sent = await sendSendGridEmail({
      to: adminEmail,
      subject: `[Contact] ${payload.subject}`,
      text,
      html
    });
    if (sent.error && process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[contactService] Admin email:", sent.error);
    }
  }

  return { contactId };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports = { submitContact };
