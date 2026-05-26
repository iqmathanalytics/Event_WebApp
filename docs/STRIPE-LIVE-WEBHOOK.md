# Stripe live webhook — `STRIPE_WEBHOOK_SECRET`

Use this for **production** (`sk_live_` / `pk_live_`). Test-mode webhooks use a different signing secret.

## 1. Open live mode in Stripe

1. Go to [Stripe Dashboard](https://dashboard.stripe.com).
2. Turn **“Test mode”** **OFF** (top right) so you are in **Live** mode.

## 2. Create the webhook endpoint

1. **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL** (Book My Tickets API):

   ```
   https://www.bookmytickets.us/api/webhooks/stripe
   ```

   If your API is only on `api.bookmytickets.us` with no `/api` prefix:

   ```
   https://api.bookmytickets.us/webhooks/stripe
   ```

   The path must match how your host proxies to Node (`src/app.js` mounts `POST /webhooks/stripe`).

3. **Listen to**: choose **Selected events** and add:

   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`

4. Click **Add endpoint**.

## 3. Copy the signing secret

1. Open the endpoint you just created.
2. Under **Signing secret**, click **Reveal**.
3. Copy the value starting with `whsec_`.
4. Set it on the server (MilesWeb API `.env`):

   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
   ```

5. Restart the Node API after saving.

**Important:** Do not reuse a **test** `whsec_` from Stripe CLI or a test-mode endpoint. Live payments need the **live** endpoint’s secret.

## 4. Verify

1. In Stripe → Webhooks → your endpoint → **Send test webhook** (live mode only sends real events; for a real check, complete a small live payment or use Dashboard test if available).
2. Or complete a real booking on the site and confirm the booking appears as **paid** in the organizer dashboard.
3. On the server, failed signature errors mean the wrong `whsec_` or URL.

## Local development (optional)

For **test** keys on localhost, use Stripe CLI (not the live Dashboard secret):

```powershell
npm run stripe:listen
```

Paste the CLI’s `whsec_...` into root `.env` as `STRIPE_WEBHOOK_SECRET` and restart the API.

## Apple Pay & Google Pay (production)

- **Google Pay**: usually works in Chrome when card payments are enabled.
- **Apple Pay**: in Stripe Dashboard → **Settings** → **Payment methods** → **Apple Pay** → add your domain (`bookmytickets.us`, `www.bookmytickets.us`) and complete domain verification.

## Env checklist (live)

| Variable | Where |
|----------|--------|
| `STRIPE_SECRET_KEY` | API `.env` — `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | API `.env` — `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | API `.env` — `whsec_...` from **live** webhook above |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `frontend/.env` at build time — same `pk_live_...` |
