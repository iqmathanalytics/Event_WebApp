/**
 * Transactional email via Brevo (Sendinblue) SMTP API.
 * Newsletter audience sync remains optional Mailchimp (separate from transactional).
 */

const crypto = require("crypto");

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function logSkip(reason) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info(`[emailIntegrations] ${reason}`);
  }
}

function warnMailchimpConfig(reason) {
  // eslint-disable-next-line no-console
  console.warn(`[emailIntegrations] ${reason}`);
}

function getBrevoConfig() {
  const apiKey = String(process.env.BREVO_API_KEY || "").trim();
  const fromEmail = String(
    process.env.BREVO_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || "tickets@bookmytickets.us"
  ).trim();
  const fromName = String(process.env.BREVO_FROM_NAME || process.env.SENDGRID_FROM_NAME || "Book My Tickets").trim();
  return { apiKey, fromEmail, fromName };
}

function isBrevoConfigured() {
  const { apiKey, fromEmail } = getBrevoConfig();
  return Boolean(apiKey && fromEmail);
}

/**
 * Trim secrets and accept common dashboard mistakes (e.g. full API host as "server").
 */
function getMailchimpConfig() {
  const apiKey = String(process.env.MAILCHIMP_API_KEY || "").trim();
  const listId = String(process.env.MAILCHIMP_LIST_ID || "").trim();
  let server = String(process.env.MAILCHIMP_SERVER_PREFIX || "").trim();
  const hostMatch = server.match(/^(?:https?:\/\/)?([a-z0-9-]+)\.api\.mailchimp\.com\/?$/i);
  if (hostMatch) {
    server = hostMatch[1];
  }
  return { apiKey, listId, server };
}

function isMailchimpConfigured() {
  const { apiKey, listId, server } = getMailchimpConfig();
  return Boolean(apiKey && listId && server);
}

async function parseBrevoErrorResponse(res) {
  const raw = await res.text();
  try {
    const parsed = JSON.parse(raw);
    const msg = parsed?.message || parsed?.error;
    if (msg) {
      return String(msg);
    }
  } catch (_err) {
    /* plain text body */
  }
  return raw || res.statusText || `HTTP ${res.status}`;
}

/**
 * Send a single transactional email via Brevo.
 * @param {{ to: string, subject: string, text?: string, html?: string, replyTo?: string, attachments?: Array<{ name: string, content: string }> }} params
 * @returns {Promise<{ sent: boolean, skipped?: boolean, provider?: string, error?: string }>}
 */
async function sendTransactionalEmail({ to, subject, text, html, replyTo, attachments }) {
  const { apiKey, fromEmail, fromName } = getBrevoConfig();
  const recipient = String(to || "").trim();

  if (!apiKey) {
    logSkip("Brevo skipped: BREVO_API_KEY not set");
    return { sent: false, skipped: true, provider: "brevo" };
  }
  if (!fromEmail) {
    logSkip("Brevo skipped: BREVO_FROM_EMAIL not set");
    return { sent: false, skipped: true, provider: "brevo" };
  }
  if (!recipient) {
    return { sent: false, error: "Missing recipient email", provider: "brevo" };
  }

  const payload = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: recipient }],
    subject: String(subject || "").trim() || "(no subject)",
    htmlContent: html || undefined,
    textContent: text != null ? String(text) : undefined
  };

  if (!payload.htmlContent && payload.textContent == null) {
    payload.textContent = "";
  }

  const reply = String(replyTo || "").trim();
  if (reply) {
    payload.replyTo = { email: reply };
  }

  if (Array.isArray(attachments) && attachments.length) {
    payload.attachment = attachments
      .filter((item) => item?.name && item?.content)
      .map((item) => ({
        name: String(item.name),
        content: String(item.content)
      }));
  }

  try {
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await parseBrevoErrorResponse(res);
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(`[emailIntegrations] Brevo send failed (${res.status}):`, errText);
      }
      return { sent: false, error: errText, provider: "brevo" };
    }

    return { sent: true, provider: "brevo" };
  } catch (err) {
    return { sent: false, error: err?.message || "Brevo request failed", provider: "brevo" };
  }
}

/** @deprecated Use sendTransactionalEmail — kept for existing imports during migration. */
const sendSendGridEmail = sendTransactionalEmail;

/**
 * Add/update a list member in Mailchimp (double opt-in handled by list settings in Mailchimp).
 */
async function syncMailchimpSubscriber({ email, firstName = "", lastName = "", cityName = "", phoneNumber = "" }) {
  const { apiKey, listId, server } = getMailchimpConfig();
  if (!apiKey || !listId || !server) {
    warnMailchimpConfig(
      "Mailchimp skipped: set MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID, and MAILCHIMP_SERVER_PREFIX (datacenter only, e.g. us5) on the server"
    );
    return { synced: false, skipped: true, skipReason: "mailchimp_not_configured" };
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
      ...(phoneNumber
        ? {
            PHONE: phoneNumber
          }
        : {}),
      ...(cityName
        ? {
            ADDRESS: {
              addr1: cityName,
              city: cityName,
              state: "NA",
              zip: "00000",
              country: "US"
            }
          }
        : {})
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

module.exports = {
  sendTransactionalEmail,
  sendSendGridEmail,
  isBrevoConfigured,
  syncMailchimpSubscriber,
  isMailchimpConfigured
};
