const { createContactMessage } = require("../models/contactModel");
const { createAdminNotification } = require("../models/adminModel");
const { sendTransactionalEmail } = require("../utils/emailIntegrations");
const { buildContactAdminEmail } = require("../utils/transactionalEmailTemplates");

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
    const mail = buildContactAdminEmail({
      contactId,
      name: payload.name,
      email: payload.email,
      subject: payload.subject,
      message: payload.message
    });
    const sent = await sendTransactionalEmail({
      to: adminEmail,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      replyTo: payload.email
    });
    if (sent.error && process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[contactService] Admin email:", sent.error);
    }
  }

  return { contactId };
}

module.exports = { submitContact };
