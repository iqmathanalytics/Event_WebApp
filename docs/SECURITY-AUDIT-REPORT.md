# Book My Tickets — Security Audit Report

**Date:** 2026-10-22  
**Scope:** Read-only review of API (`src/`), frontend (`frontend/src/`), deploy artifacts, and known production patterns.  
**Method:** Code/config review; no exploit PoCs; no destructive testing.  
**Status:** Phases 0–8 complete.

Severity: **Critical** / **High** / **Medium** / **Low** / **Info**

---

## Phase 0 — Inventory and threat model

### Roles and capabilities

| Principal | How identified | Typical powers |
|-----------|----------------|----------------|
| Anonymous | No JWT | Browse public listings, guest checkout, newsletter/contact, public check-in/QR |
| User | JWT `role=user` | Bookings, favorites, profile; may submit events if `can_post_events` |
| Organizer tools | `organizer_enabled=1` (still often `role=user`) | Event CRUD (rules apply), coupons, vendor, analytics, check-in (organizer routes) |
| Admin | JWT `role=admin` | Full `/admin/*` moderation, users, bookings export, ticket verify |

### Trust boundaries

```
Browser (SPA) --Bearer JWT--> API (Express) --> MySQL / Stripe / Cloudinary / Seats.io / email
                     |
                     +--> Stripe webhook (raw body + signature)
```

### Route map (high level)

| Mount | Auth | Notes |
|-------|------|--------|
| `/auth/*` | Public | Register, login user/staff, Google, refresh, password set/reset |
| `/users/*` | JWT | Profile, bookings, enable-organizer |
| `/events/*` | Mixed | Public list/detail; organizer CRUD; shares; tracking |
| `/bookings/*` | Mixed | Auth + **guest** payment/coupon paths |
| `/admin/*` | JWT + admin | All admin |
| `/uploads/image` | JWT | Image upload |
| `/public/*` | Public | Ticket QR + **check-in verify/check-in** |
| `/webhooks/stripe` | Stripe sig | Raw body |

### Data classes

- **PII:** names, emails, phones (users, bookings, newsletter, contact)
- **Secrets:** JWT secrets, Stripe secret/webhook, DB, Google client secret (server), bcrypt hashes
- **Tickets:** `check_in_code`, QR, seat holds
- **Money:** PaymentIntents, amounts, coupons

### Threat actors

External attacker, malicious guest buyer, rival organizer, stolen admin session, XSS thief of `localStorage` tokens.

---

## Phase 1 — Authentication and sessions

### Findings

| ID | Sev | Finding |
|----|-----|---------|
| A1 | Medium | No dedicated rate limits on login/register/forgot/refresh (only global ~300/15m; can be disabled via `RATE_LIMIT_DISABLED`) — `src/app.js`, `src/routes/authRoutes.js` |
| A2 | Medium | Account enumeration: Google login 404 “create account”; register/Google register 409 “already exists”. Password login/forgot are generic (good) — `src/services/authService.js` |
| A3 | Medium | Access JWT trusted without live DB check for `is_active`/role — deactivated users keep access until access token expires — `src/middleware/authMiddleware.js` |
| A4 | Low | Refresh tokens are long-lived JWTs with no server revocation/rotation/jti store — `src/utils/jwt.js`, `refreshAccessToken` |
| A5 | Low | Local registration issues tokens without email verification — `authService.register` |
| A6 | Low | Password-reset path can auto-provision guest users from booking emails — `passwordSetService` / `ensureGuestUserAccount` |
| A7 | Info | Staff vs user portal separation and generic wrong-portal errors look intentional and sound |

### Controls that look OK

- bcrypt cost 12  
- Google `verifyIdToken` with audience + `email_verified`  
- Password reset/setup tokens hashed (SHA-256), single-use, expiry; forgot-password generic response  
- Staff login requires admin / organizer_enabled / role organizer  

---

## Phase 2 — Authorization and IDOR

### Findings

| ID | Sev | Finding |
|----|-----|---------|
| Z1 | **Critical** | **Unauthenticated public check-in:** `GET /api/public/check-in/verify` and `POST /api/public/check-in` — no auth; returns guest name/email/phone and can mark checked in — `src/routes/publicRoutes.js`, `bookingCheckInService` |
| Z2 | High | Guest `confirm-payment` / `cancel-payment` authorized only by knowing Stripe `pi_…` + guest metadata — `bookingRoutes.js`, `stripePaymentService` |
| Z3 | Medium | Profile email change without verification; booking resend allowed when booking email matches account email — weakens ownership binding |
| Z4 | Medium | Analytics/vendor invite accept calls `enableOrganizerById` — widens organizer tooling beyond share scope |
| Z5 | Low | Default `can_post_events=1` for new users; `organizerAccessMiddleware` allows either `can_post_events` or `organizer_enabled` |
| Z6 | Info | Event edit/delete enforce `organizer_id`; admin routes use `authMiddleware` + `adminMiddleware` |

### Controls that look OK

- Organizer bookings scoped to owner (+ shared analytics assert)  
- Admin API not client-guard-only  
- Pending-event edit lock (recent fix) prevents publish-via-edit bypass  

---

## Phase 3 — Payments / Stripe / bookings

### Findings

| ID | Sev | Finding |
|----|-----|---------|
| P1 | High | Guest PaymentIntent confirm/cancel by PI id alone (same as Z2) — leaked `pi_` can fulfill (check-in code) or cancel |
| P2 | High | Guest paid fulfill may skip `finalizeCouponRedemption` when `user_id` is null — coupon max_redemptions / holds can be wrong — `stripePaymentService.fulfillPaymentIntent` |
| P3 | Medium | After charge, seats.io hold-book failure falls back to `bookSoldSeatsWithoutHold` — inventory race under concurrency |
| P4 | Info | Fulfill does not re-compare `pi.amount` to stored `amount_cents` (amount set server-side at create; residual if PI updated with secret key) |

### Controls that look OK

- PI amount from server pricing (`dollarsToCents`)  
- Webhook: `constructEvent` + `express.raw` before JSON parser  
- Fulfill idempotent by PaymentIntent / constraints  
- Authenticated confirm checks `metadata.user_id`  
- Coupon apply path uses server-side hold math  

---

## Phase 4 — Input validation / XSS / uploads

### Findings

| ID | Sev | Finding |
|----|-----|---------|
| I1 | High | YouTube follower scrape can `fetch()` organizer-supplied URL without host allowlist (FB/IG allowlisted) — SSRF-ish — `influencerService.getYoutubeSubscriberCountFromUrl` |
| I2 | Medium | Upload validates client `mimetype` `/^image\//` only (no magic-byte allowlist); 8MB; auth required — `uploadRoutes.js` |
| I3 | Medium | Some mutating routes lack Zod (`PATCH /users/me` body shape, admin city dropdown POSTs, seating hold sync/release) |
| I4 | Low | Rich-text sanitize is strong for events (server sanitize-html + client DOMPurify); other HTML surfaces should stay text-only |
| I5 | Info | SQL generally parameterized; listing table names / sort ASC-DESC allowlisted |

### Controls that look OK

- Zod on most auth/booking/admin listing routes  
- `sanitizeEventDescription` on event create/update  
- JSON body limit 1mb; Helmet enabled  

---

## Phase 5 — Public API abuse / privacy

### Findings

| ID | Sev | Finding |
|----|-----|---------|
| U1 | **Critical** | Public check-in PII + check-in mutation (same as Z1) |
| U2 | High | Unauthenticated track-click/view/presence/vendor-hits (+ contact/newsletter) only behind global limiter — metric spam / inbox spam |
| U3 | High | Production CORS allows any `*.netlify.app` with `credentials: true` — `src/app.js` |
| U4 | Medium | Public sponsor/contact fields exposed when inquiry flags enabled (product choice; still PII) |
| U5 | Low | `GET /public/ticket-qr/:code` is a validity oracle (no PII); codes are 32-byte hex |
| U6 | Info | CORS allowlist for bookmytickets.us; no-origin requests allowed (normal for curl/mobile) |

---

## Phase 6 — Secrets / config / infrastructure

### Findings

| ID | Sev | Finding |
|----|-----|---------|
| S1 | **Critical** | Local file `deploy/tidb-prod-to-do-resync.sql` (~4.4MB) contains production-like data (users/bookings). `.gitignore` covers `deploy/tidb-prod-to-do.sql` but **not** `*-resync.sql`. Currently untracked — high risk if committed or shared |
| S2 | Medium | `xlsx` dependency (admin exports) — historical parser risk if untrusted workbooks ever imported |
| S3 | Low | `RATE_LIMIT_DISABLED` footgun; `CORS_ORIGIN` default string `"*"` filtered in app but easy to misconfigure later |
| S4 | Low | Guest temporary passwords emailed in plaintext (common pattern; residual) |
| S5 | Info | `.env` / droplet env gitignored; examples are placeholders; error middleware hides stacks in production |

### Controls that look OK

- trust proxy in production  
- Stripe webhook secret required for verify  
- Health endpoint skipped from rate limit  

---

## Phase 7 — Frontend security

### Findings

| ID | Sev | Finding |
|----|-----|---------|
| F1 | High | Access + refresh tokens in `localStorage` — XSS = full account takeover — `AuthContext.jsx`, `api.js` |
| F2 | Medium | Client `AdminRoute` / hosting tabs are UX only (API enforces — good), but stolen JWT bypasses UI |
| F3 | Info | `safeReturnPath` rejects open redirects on Google post-login |
| F4 | Info | Stripe Elements uses publishable key + clientSecret only |
| F5 | Info | Public `/check-in` page aligns with unauthenticated API (product/security issue in Phase 2) |

### Controls that look OK

- API still requires Bearer JWT for protected routes  
- Event HTML rendered via DOMPurify helper  
- Login redirect paths constrained  

---

## Phase 8 — Consolidated prioritized backlog

### Executive summary

The platform has solid foundations (Helmet, Zod on most routes, parameterized SQL, Stripe webhook signatures, server-side payment amounts, bcrypt, Google token verify, admin API gated).  

The **highest risks** are: (1) **unauthenticated public check-in with PII**, (2) **a local production SQL dump not covered by gitignore**, (3) **guest payment endpoints keyed only by PaymentIntent id**, and (4) **XSS-exposed tokens in localStorage** combined with any future XSS.

### Fix order (recommended)

1. **Critical — Public check-in:** Require staff/organizer auth (or signed short-lived venue token); strip PII from verify for unauthenticated callers; keep admin authenticated twins.  
2. **Critical — SQL dump:** Delete or encrypt off-repo; add `deploy/*resync*.sql` / `deploy/*.sql` dumps to `.gitignore`; rotate passwords/secrets if dump was ever shared.  
3. **High — Guest payments:** Bind confirm/cancel to a server-issued checkout session secret (not only `pi_`); never return check-in code without that binding.  
4. **High — Guest coupon finalize:** Always finalize redemptions on successful guest fulfill.  
5. **High — YouTube fetch:** Allowlist `youtube.com` / `youtu.be` hosts only.  
6. **High — CORS:** Remove blanket `*.netlify.app` in production (or allowlist specific preview hosts).  
7. **High — Tokens:** Prefer httpOnly secure cookies for refresh (or both); treat XSS as session-critical; tighten CSP.  
8. **Medium — Auth rate limits:** Per-IP/per-email limits on login/register/forgot.  
9. **Medium — JWT:** Re-check `is_active`/role on sensitive routes or shorten access TTL + revoke refresh on password change/deactivate.  
10. **Medium — Uploads:** Magic-byte / strict MIME allowlist.  
11. **Medium — Tracking endpoints:** Stricter rate limits or signed beacon tokens.  
12. **Low/Info:** Email verification on register; hash invite tokens at rest; review seats.io no-hold fallback; email-change verification.

### Residual risk / out of scope

- No live authenticated penetration test against production was performed.  
- No formal dependency CVE dump (SCA) beyond noting `xlsx`.  
- PCI / Stripe Radar / WAF / server hardening beyond app code not fully assessed.  
- Product choices (public inquiry contacts when enabled) remain intentional residual PII exposure.

### Controls summary (keep)

Helmet, CORS allowlist core domains, global rate limit, Zod coverage on core money/auth paths, SQL parameterization, event HTML sanitize, Stripe webhook verification, server-priced PaymentIntents, bcrypt + hashed password-reset tokens, Google audience verification, admin middleware on `/admin`.

---

*End of report. No code was changed as part of this audit.*
