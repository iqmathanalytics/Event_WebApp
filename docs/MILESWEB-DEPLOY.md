# Deploy Book My Tickets (this repo) on MilesWeb — from scratch

This project is **two parts**:

| Part | What it is | Where it usually lives |
|------|------------|-------------------------|
| **Backend** | Node.js + Express API (`package.json` in repo **root**) | Subdomain e.g. `api.bookmytickets.us` |
| **Frontend** | React + Vite static build (`frontend/`) | Main site e.g. `bookmytickets.us` |

The API listens on a **port** (e.g. `5000`). MilesWeb’s **Node.js app** connects your subdomain + URL path (often `/api`) to that port. The **browser** must call URLs that match your **CORS** and **Vite `VITE_API_BASE_URL`** (if you use a separate API host).

---

## 0. Before you start

- **MySQL** database in MilesWeb **mPanel** (Remote MySQL / phpMyAdmin), with host, port, user, password, database name.
- **Two DNS names** (examples):
  - `bookmytickets.us` → website (static files).
  - `api.bookmytickets.us` → Node API (or use only main domain + `/api` proxy — see §6).
- Repo on your PC: `git clone` … or upload a zip of the project.

### Quick prep on your PC

```bash
cp .env.production.example .env          # edit with production secrets
cp frontend/.env.production.example frontend/.env   # set VITE_API_BASE_URL
npm install
npm run prepare:deploy    # verifies .env + prints checklist
npm run db:migrate        # against production DB (remote access on)
npm run build:frontend    # creates frontend/dist/
```

See also **[PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md)**.

---

## 1. Database (TiDB Cloud — not MilesWeb)

**MilesWeb only hosts the Node API + static frontend.** The database stays on **TiDB Cloud**.

1. In `.env`, set **`PRODUCTION_DB_*`** to your production TiDB cluster (see `.env.example`).
2. From your PC:

   ```bash
   npm install
   npm run db:migrate:production
   ```

   Optional slug backfill:

   ```bash
   npm run db:migrate:production:full
   ```

3. On the **MilesWeb Node app**, set **`DB_*`** to the **same production TiDB** values (not localhost MySQL).

Local dev keeps **`DB_*`** pointed at your isolated test cluster; production migrations use **`PRODUCTION_DB_*`** only.

---

## 2. Deploy the backend (API)

### 2.1 Upload files

1. In **cPanel → File Manager**, open the folder MilesWeb uses for your API subdomain (e.g. `api.bookmytickets.us` or whatever **Application root** shows in Node setup).  
2. Upload the **backend** contents: at minimum the **root** `package.json`, `package-lock.json` (if you have it), entire **`src/`**, **`scripts/`**, **`sql/`**, and **`node_modules` is optional** — prefer running install on server (§2.4).

   Do **not** rely on uploading `node_modules` from Windows if the server is Linux — run `npm install` on the server.

### 2.2 Environment file on the server

In that same application root, create **`.env`** (no quotes on values unless the value itself needs them). **Required** variables (see `.env.example` in repo):

- `NODE_ENV=production`
- `PORT` — **use the port MilesWeb assigns** to this Node app (often shown in “Setup Node.js App”; must match what the proxy expects).
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL` (`true` if remote TLS DB)
- `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`
- `CORS_ORIGIN` — comma-separated **exact** browser origins, e.g.  
  `https://bookmytickets.us,https://www.bookmytickets.us`  
  (add `http://` variants only if you still serve the site over HTTP.)
- Optional but common: `GOOGLE_CLIENT_ID`, `CSC_API_KEY`, Cloudinary, SendGrid, etc.

**Important:** `src/config/env.js` throws at startup if any required variable is missing — the app will not start.

### 2.3 cPanel → Setup Node.js App

1. **Software → Setup Node.js App** (wording may vary slightly).
2. **Create application**:
   - **Node version:** 18.x or newer (repo allows `>=18`; avoid mismatched major vs your local if possible).
   - **Application mode:** Production.
   - **Application root:** folder where `package.json` and `src/server.js` live.
   - **Application URL:** your API subdomain, e.g. `api.bookmytickets.us`.
   - **Application startup file:** `src/server.js`  
     (or the command your host expects — some panels use “Application startup file” as the entry script path relative to app root.)
3. If the UI offers **Environment variables**, paste the same values as in `.env` (some hosts read `.env` automatically — check MilesWeb docs; if not, use the UI).
4. **Path / proxy:** Your earlier log showed a proxy path **`api`**. That usually means public URLs look like:

   `https://api.bookmytickets.us/api/deals`

   and the reverse proxy **strips** `/api` before forwarding to Node, so Express sees `/deals` (this matches this repo’s routes mounted at `/`, not under `/api`).

   If your host **does not** strip `/api`, you would get 404s — then ask support or adjust proxy rules.

5. Click **Run NPM Install** (or open **Terminal**, `cd` to application root, run `npm install --omit=dev`).

6. **Restart** the application.

7. Test in a browser or curl:
   - `https://api.bookmytickets.us/api` → should return `API WORKING` (or your TLS/HTTP URL as configured).
   - `https://api.bookmytickets.us/api/health` → JSON `{ "success": true, ... }`.

If the app **crashes on start**, open the **application log** in cPanel — usually “DB connection failed” or “Missing required environment variable”.

---

## 3. Deploy the frontend (website)

The frontend is **not** Node in production — it is **static files** after build.

### 3.1 Build on your PC (recommended)

1. Copy `frontend/.env.production.example` → `frontend/.env`.

2. Set **production API base URL** (must match how users reach the API in the browser):

   ```env
   VITE_API_BASE_URL=https://api.bookmytickets.us/api
   ```

   - Use **`https://`** if the API is served over HTTPS; use **`http://`** only if the API is HTTP (avoid mixed content: **HTTPS page cannot call HTTP API** in browsers).
   - Trailing `/api` should match your host’s public API prefix (see §2.3).

3. Set `VITE_GOOGLE_CLIENT_ID` if you use Google login (same OAuth client as backend `GOOGLE_CLIENT_ID`).

4. Build:

   ```bash
   cd frontend
   npm install
   npm run build
   ```

5. Upload **everything inside** `frontend/dist/` to the **document root** of `bookmytickets.us` (often `public_html` for the main domain).  
   - **Include `.htaccess`** — it is copied from `frontend/public/.htaccess` when you run `npm run build:frontend`.

### 3.2 SPA routing (React Router)

The repo includes `frontend/public/.htaccess` (SPA fallback to `index.html`). It is included in `dist/` after build.

If the site shows **blank** or **404 on refresh**, confirm `.htaccess` was uploaded and **AllowOverride** is enabled on MilesWeb Apache.

---

## 4. Same-origin `/api` (optional alternative)

If you **do not** set `VITE_API_BASE_URL`, the built app uses **`{current website origin}/api`** in production.

Then you **must** configure the **main domain** (`bookmytickets.us`) so that **`https://bookmytickets.us/api/*`** is reverse-proxied to the same Node process (or to `api.bookmytickets.us`). Many shared plans only expose Node on a **subdomain** — in that case **use `VITE_API_BASE_URL` pointing at `api.bookmytickets.us`** instead.

---

## 5. SSL (“Not secure”)

- Install **SSL** (Let’s Encrypt in cPanel) for **both** `bookmytickets.us` and `api.bookmytickets.us`.
- Serve the **site** and **API** over **HTTPS** once certificates work.
- Then set `VITE_API_BASE_URL` with `https://` and rebuild the frontend.

---

## 6. Google OAuth

In **Google Cloud Console → Credentials → your Web client**:

- **Authorized JavaScript origins:**  
  `https://bookmytickets.us`, `https://www.bookmytickets.us` (and dev `http://localhost:5173` if needed).
- **Authorized redirect URIs:** any your app uses (often none for pure JS Google button — follow Google’s doc for your flow).

Backend **`GOOGLE_CLIENT_ID`** and frontend **`VITE_GOOGLE_CLIENT_ID`** must be the **same** client ID string.

---

## 7. Quick troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Browser console: **CORS** | Wrong `Origin`; set `CORS_ORIGIN` on API to exact origins (scheme + host + optional `:port`). Code also allowlists `bookmytickets.us` — see `src/app.js`. |
| **Mixed content** blocked | Page is HTTPS but `VITE_API_BASE_URL` is `http://` — use HTTPS for API or serve page over HTTP (not recommended). |
| **404** on `/api/...` | Proxy path wrong or `/api` not stripped — URL path must match host config. |
| **404** on React routes after refresh | Missing SPA `.htaccess` fallback to `index.html`. |
| API **works in browser bar** but app fails | Frontend built with wrong `VITE_API_BASE_URL` — **rebuild** after every change to `frontend/.env`. |
| **503** / gateway | Node not running, wrong port, or proxy not pointing to app — check Node app status and logs. |

---

## 8. Checklist

- [ ] DB created; `npm run db:migrate` run against production.
- [ ] API `.env` complete; `NODE_ENV=production`; `PORT` matches panel.
- [ ] Node app starts; `/api` and `/api/health` OK on public URL.
- [ ] `frontend` built with correct `VITE_API_BASE_URL`; `dist/` uploaded to main domain docroot.
- [ ] `.htaccess` SPA rewrite on main site.
- [ ] SSL on main + API domains; URLs in env use matching `http`/`https`.
- [ ] `CORS_ORIGIN` includes your real site origins.
- [ ] Google OAuth origins updated if using Google login.

If something still fails, capture **one** failing request from DevTools → Network (**Request URL**, **status**, and **response**), and the **last 30 lines** of the Node app log, and compare to this checklist.
