# Production go-live checklist (MilesWeb mPanel)

Use this with [MILESWEB-DEPLOY.md](./MILESWEB-DEPLOY.md).

## On your PC (before upload)

- [ ] Copy `.env.production.example` → `.env` in **repo root** (production DB + secrets)
- [ ] Run `npm install`
- [ ] Run `npm run verify:production` (or `node scripts/verify-production-env.js`)
- [ ] Set `PRODUCTION_DB_*` in `.env` (TiDB Cloud production cluster)
- [ ] Run `npm run db:migrate:production` (TiDB schema — includes `event_seatsio.sql` + repair migration)
- [ ] Run `npm run db:backfill-slugs` (if slugs missing)
- [ ] Copy `frontend/.env.production.example` → `frontend/.env`
- [ ] Set `VITE_API_BASE_URL=https://api.YOURDOMAIN.com/api` (match mPanel proxy)
- [ ] Set `VITE_GOOGLE_CLIENT_ID`, `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_GA_MEASUREMENT_ID`
- [ ] Run `npm run build:frontend`
- [ ] Confirm `frontend/dist/.htaccess` exists

## TiDB Cloud (production database)

- [ ] `PRODUCTION_DB_*` set in `.env`
- [ ] `npm run db:migrate:production` completed successfully
- [ ] MilesWeb API `.env` uses same `DB_*` as production TiDB (not MilesWeb MySQL)

## MilesWeb mPanel — Node.js API

- [ ] Create Node.js app (18+), mode **Production**
- [ ] Application root = folder with `package.json` + `src/server.js`
- [ ] Startup file: `src/server.js`
- [ ] Upload: `package.json`, `package-lock.json`, `src/`, `scripts/`, `sql/`
- [ ] Create `.env` on server (same as production root `.env`)
- [ ] Terminal: `npm install --omit=dev`
- [ ] Restart app
- [ ] Open `https://api.YOURDOMAIN.com/api` → `API WORKING`
- [ ] Open `https://api.YOURDOMAIN.com/api/health` → JSON OK

## MilesWeb mPanel — website (static)

- [ ] Upload **contents** of `frontend/dist/` to main domain `public_html` (or docroot)
- [ ] SSL (Let’s Encrypt) on **www** and **api** subdomains
- [ ] React routes work on refresh (`.htaccess` from build)

## Third-party (production URLs)

- [ ] **Google OAuth** — authorized origins: `https://bookmytickets.us`, `https://www.bookmytickets.us`
- [ ] **Stripe** — webhook `https://api.YOURDOMAIN.com/webhooks/stripe` (live `whsec_`)
- [ ] **Brevo** — sender domain verified
- [ ] **Cloudinary** — production folder
- [ ] **GA4** — property timezone = `APP_TIMEZONE`; service account Viewer on property
- [ ] **Seats.io** (reserved seating) — `SEATSIO_SECRET_KEY`, `SEATSIO_WORKSPACE_KEY`, `SEATSIO_REGION` on API server
  - Secret key ≠ workspace key ([workspace settings](https://app.seats.io/workspace-settings))
  - Region must match your Seats.io account (usually `na`)

## Smoke test after deploy

- [ ] Home page loads (HTTPS)
- [ ] Login / register
- [ ] Events list + event detail
- [ ] Image upload (organizer)
- [ ] Platform checkout (if enabled) — test mode off only when ready
- [ ] Reserved seating — organizer designs chart; buyer selects seats on event page
- [ ] Organizer Insights shows GA data (after traffic)
- [ ] Contact form email

## Do NOT upload to production

- `node_modules/` from Windows (install on Linux server)
- `.env` with secrets into git
- `frontend/node_modules/`
- Local-only: `src.zip`, dev seeds (`npm run db:seed`)
