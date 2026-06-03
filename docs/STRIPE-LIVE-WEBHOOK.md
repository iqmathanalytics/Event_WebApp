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

   **Required for Apple Pay / Google Pay / Amazon Pay:** these wallets often redirect back to your site (especially Apple Pay on iPhone). If the webhook is missing or wrong, money can be taken without a booking, email, or organizer row. After deploy, test each wallet you enable and confirm the webhook shows **200** in Stripe → Developers → Webhooks.

## Recover a charged payment with no booking

If a customer was charged but has no ticket (no email / not in organizer dashboard), find the **Payment intent** id (`pi_…`) in Stripe Dashboard → Payments, then on the server:

```bash
npm run stripe:fulfill-intent -- pi_xxxxxxxxxxxxxxxx
```

This creates the booking and sends the confirmation email when the payment succeeded (works for card, Apple Pay, Google Pay, and Amazon Pay).

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

## Apple Pay, Google Pay & Amazon Pay (production)

The checkout modal uses Stripe **Express Checkout** (Google Pay, Apple Pay, Amazon Pay) plus the card **Payment Element** (Google/Apple Pay also appear below when the express row does not show them).

The API creates PaymentIntents with `payment_method_types: card, amazon_pay`. Google Pay and Apple Pay are enabled through the `card` type (no separate API type).

| Wallet | Stripe Dashboard | Browser / device |
|--------|------------------|------------------|
| **Google Pay** | **Payment methods** → enable **Google Pay** (Cards) | Chrome, Edge, Android Chrome; card in [Google Wallet](https://pay.google.com) |
| **Apple Pay** | **Payment methods** → **Apple Pay** → verify domain | Safari on iPhone/Mac; Chrome on Mac with card in Wallet |
| **Amazon Pay** | **Payment methods** → **Amazon Pay** | Most desktop browsers when enabled |

**Domain registration (required on production HTTPS):**
1. Stripe Dashboard → **Settings** → **Payment methods** → enable **Google Pay** (under Cards), **Apple Pay**, and **Amazon Pay**.
2. Stripe Dashboard → **Settings** → **Payment method domains** → add `bookmytickets.us` and `www.bookmytickets.us` (required for Google Pay and Amazon Pay).
3. For **Apple Pay**, download the domain verification file from Stripe and upload it to your site at:
   `frontend/public/.well-known/apple-developer-merchantid-domain-association`
   Then rebuild and deploy the frontend so it is served at `https://www.bookmytickets.us/.well-known/apple-developer-merchantid-domain-association`.

Wallets will **not** appear on `http://localhost` — test on the live HTTPS site.

**Apple Pay vs Amazon Pay**

| | Amazon Pay | Apple Pay |
|---|------------|-----------|
| Browsers | Chrome, Edge, Firefox (when enabled in Stripe) | **Safari** on iPhone/iPad/Mac; Chrome on **Mac only** (with a card in Wallet) |
| Windows PC | Can show | **Does not show** |
| Domain file | Register in Payment method domains | Same + verify in **Apple Pay** settings |

Run `node scripts/check-apple-pay-domain.js` after deploy to confirm the `.well-known` file is served.

**If Amazon Pay shows but Google Pay does not:** register domains under **Payment method domains**, enable **Google Pay** in Payment methods, use **Chrome** with a card in Google Wallet, and test on **HTTPS** (not localhost).

**If Amazon Pay shows but Apple Pay does not:** you are likely on Windows/Android, or the domain is not verified under Stripe → Settings → Payment methods → **Apple Pay** (not only Payment method domains). Add a card to Apple Wallet and retry in **Safari** on an iPhone or Mac.

## Env checklist (live)

| Variable | Where |
|----------|--------|
| `STRIPE_SECRET_KEY` | API `.env` — `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | API `.env` — `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | API `.env` — `whsec_...` from **live** webhook above |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `frontend/.env` at build time — same `pk_live_...` |
