# Brevo transactional email — Book My Tickets

All **transactional** emails use a shared **Book My Tickets** HTML layout (rose / emerald / violet headers, logo, tier chips for bookings) and are sent through **Brevo** (`POST /v3/smtp/email`).

**Newsletter / marketing list** sync remains optional **Mailchimp** (`MAILCHIMP_*`) — separate from Brevo.

---

## What you need from your Brevo account

### 1. API key (required)

1. Log in to [Brevo](https://app.brevo.com).
2. Go to **Settings → SMTP & API → API Keys** (or **Transactional → Settings → API keys**).
3. Create an API key with permission to **send transactional emails**.
4. Copy the key (starts with `xkeysib-...`).
5. Set on the API server:

```env
BREVO_API_KEY=xkeysib-your-key-here
```

Never commit this key to git. Add it in Render / MilesWeb / local `.env` only.

### 2. Verified sender (required)

| Field | Value |
|--------|--------|
| **Name** | Book My Tickets |
| **Email** | `howdy@bookmytickets.us` |

In Brevo: **Senders & IP → Senders** → add and verify **`howdy@bookmytickets.us`** (SPF, DKIM for `bookmytickets.us`).

```env
BREVO_FROM_EMAIL=howdy@bookmytickets.us
BREVO_FROM_NAME=Book My Tickets
```

### 3. Admin inbox for contact form (recommended)

```env
ADMIN_CONTACT_EMAIL=you@bookmytickets.us
```

(or `ADMIN_NOTIFICATION_EMAIL`). If unset, contact messages are still saved in-app; no admin email is sent.

### 4. Links in emails (recommended)

```env
FRONTEND_URL=https://bookmytickets.us
```

Used for logo image URL, CTAs, and event links in booking confirmations.

### Legacy SendGrid

Commenting out or removing `SENDGRID_*` in `.env` is **fine** — the app no longer calls SendGrid. Brevo vars are the only ones that matter for sending.

---

## When each email is sent

| # | Email | Recipient | Trigger |
|---|--------|-----------|---------|
| 1 | **Welcome** | New user | Email/password **registration** |
| 2 | **Welcome (Google)** | New user | **Google registration** only (`registerWithGoogleIdToken`) — not on Google login |
| 3 | **Booking confirmed** | Guest email on booking | Successful **free** checkout or **Stripe** payment fulfilled |
| 4 | **Listing approved** | Organizer / submitter | Admin sets listing to **`approved`** (event, deal, influencer) |
| 5 | **Contact form alert** | `ADMIN_CONTACT_EMAIL` | Public **Contact** form submitted |

### Not sent by email

- Listing **rejected** / **pending** — in-app only.
- **Google login** for existing accounts — no second welcome.
- **Password reset** — not implemented.
- **Printable ticket / PDF receipt** — not implemented (confirmation email only).
- **Newsletter** — Mailchimp when configured.

---

## Templates (code)

| File | Role |
|------|------|
| `src/utils/brandEmail.js` | Brand name, support email, `FRONTEND_URL` helpers |
| `src/utils/transactionalEmailTemplates.js` | Shared layout + welcome, approval, booking, contact |
| `src/utils/emailIntegrations.js` | `sendTransactionalEmail()` → Brevo API |

---

## Deploy checklist

1. Set `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, `FRONTEND_URL`, `ADMIN_CONTACT_EMAIL`.
2. Restart API.
3. Test: register (email), register with Google (new account), book a test event, approve a listing, contact form.
4. Check Brevo → **Transactional → Email logs**.
