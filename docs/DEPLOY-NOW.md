# Deploy now (MilesWeb + TiDB Cloud)

Database is already migrated on **production TiDB**. MilesWeb only runs the API and static frontend.

## 1. On your PC (one command)

```bash
npm run deploy:milesweb:build
```

This writes `deploy/milesweb-api.env` and builds `frontend/dist/`.

## 2. MilesWeb — Node.js API (`api.bookmytickets.us`)

1. **Node.js app** → Application root: upload `src/`, `sql/`, `package.json`, `package-lock.json` (not `node_modules`).
2. **Environment**: paste contents of `deploy/milesweb-api.env` as `.env` in the app root (or upload the file and rename).
3. **Startup**: `node src/server.js` (or `npm start` if `package.json` has `"start": "node src/server.js"`).
4. **Install**: Run **NPM Install** in mPanel once after upload.
5. **SSL**: Force HTTPS on the API subdomain.
6. **Reverse proxy** (if frontend uses same-origin `/api` instead of `api.` subdomain): map `https://www.bookmytickets.us/api` → Node app; then set `VITE_API_BASE_URL=https://www.bookmytickets.us/api` and rebuild.

**Health check:** `https://www.bookmytickets.us/api/health` → `{"success":true,"message":"OK"}`

## 3. MilesWeb — Frontend (`bookmytickets.us` / `www`)

1. Upload **everything inside** `frontend/dist/` to the main domain **document root** (not the `dist` folder itself).
2. Confirm `.htaccess` is present (SPA routing).
3. SSL on apex + www; redirect one canonical host.

## 4. Google / Stripe / Brevo (production)

| Service | Action |
|--------|--------|
| Google OAuth | Authorized origins: `https://bookmytickets.us`, `https://www.bookmytickets.us` |
| Stripe | Live keys in MilesWeb `.env`; live webhook `https://www.bookmytickets.us/api/webhooks/stripe` — see `docs/STRIPE-LIVE-WEBHOOK.md` |
| Brevo | Sender `tickets@bookmytickets.us` verified |
| GA4 | `VITE_GA_MEASUREMENT_ID` in build; service account has Viewer on property |

## 5. Smoke test

- Home loads, events list works
- Login (email + Google)
- Event detail + booking flow (test mode OK)
- Organizer → Insights shows GA data (after traffic)

## 6. Optional: clone data local → production

```bash
# SOURCE_DB_* = local alicloud, TARGET_DB_* = production (see .env)
npm run db:clone
```

Only if you want production content to match local (schema already applied).
