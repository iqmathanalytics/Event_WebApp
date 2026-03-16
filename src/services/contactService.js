const { createContactMessage } = require("../models/contactModel");
const { createAdminNotification } = require("../models/adminModel");

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

  return { contactId };
}

module.exports = { submitContact };
