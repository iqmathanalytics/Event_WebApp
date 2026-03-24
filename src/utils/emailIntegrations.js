/**
 * Optional integrations: SendGrid (transactional) and Mailchimp (audience).
 * If env vars are missing, operations no-op and the app still works (DB-only).
 */

const crypto = require("crypto");

function logSkip(reason) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info(`[emailIntegrations] ${reason}`);
  }
}

/**
 * Send a single email via SendGrid HTTP API.
 * @returns {{ sent: boolean, skipped?: boolean, error?: string }}
 */
async function sendSendGridEmail({ to, subject, text, html }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    logSkip("SendGrid skipped: SENDGRID_API_KEY or SENDGRID_FROM_EMAIL not set");
    return { sent: false, skipped: true };
  }
  const fromName = process.env.SENDGRID_FROM_NAME || "Yay! Tickets";
  const body = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: fromEmail, name: fromName },
    subject,
    content: [{ type: "text/plain", value: text || "" }]
  };
  if (html) {
    body.content.push({ type: "text/html", value: html });
  }
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text();
      return { sent: false, error: errText || res.statusText };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err?.message || "SendGrid request failed" };
  }
}

/**
 * Add/update a list member in Mailchimp (double opt-in handled by list settings in Mailchimp).
 */
async function syncMailchimpSubscriber({ email, firstName = "", lastName = "", cityName = "", phoneNumber = "" }) {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_LIST_ID;
  const server = process.env.MAILCHIMP_SERVER_PREFIX;
  if (!apiKey || !listId || !server) {
    logSkip("Mailchimp skipped: MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID, or MAILCHIMP_SERVER_PREFIX not set");
    return { synced: false, skipped: true };
  }
  const subscriberHash = crypto.createHash("md5").update(email.toLowerCase()).digest("hex");
  const url = `https://${server}.api.mailchimp.com/3.0/lists/${listId}/members/${subscriberHash}`;
  const auth = Buffer.from(`anystring:${apiKey}`).toString("base64");
  const payload = {
    email_address: email,
    status_if_new: "subscribed",
    status: "subscribed",
    merge_fields: {
      FNAME: firstName || "",
      LNAME: lastName || "",
      PHONE: phoneNumber || "",
      // Audience "Address" column maps to Mailchimp ADDRESS merge field (structured object).
      ADDRESS: cityName
        ? {
            addr1: cityName,
            city: cityName,
            state: "NA",
            zip: "00000",
            country: "US"
          }
        : undefined
    }
  };
  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text();
      return { synced: false, error: errText || res.statusText };
    }
    return { synced: true };
  } catch (err) {
    return { synced: false, error: err?.message || "Mailchimp request failed" };
  }
}

module.exports = { sendSendGridEmail, syncMailchimpSubscriber };
