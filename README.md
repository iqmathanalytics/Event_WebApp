# Yay! Tickets - Backend

Production-grade Node.js + Express backend for the Yay! Tickets platform.

## Tech

- Node.js
- Express.js
- TiDB Cloud (MySQL compatible via `mysql2`)
- JWT authentication

## Project Structure

```text
src/
  config/
  controllers/
  middleware/
  models/
  routes/
  services/
  utils/
  validators/
  app.js
  server.js
```

## API Base

`/api/v1`

## Core Endpoints

### Auth

- `POST /auth/register`
- `POST /auth/login`

### Users

- `GET /users/me` (auth required)

### Events

- `POST /events` (auth required) submit event
- `PATCH /events/:id/approve` (admin)
- `PATCH /events/:id/reject` (admin)
- `GET /events` search/filter/sort events

### Deals

- `GET /deals` (premium deals shown only if JWT user present)

### Influencers

- `GET /influencers`

### Services

- `GET /services`

### Newsletter

- `POST /newsletter/subscribe`

### Contact

- `POST /contact`

### Admin

- `GET /admin/moderation/events`
- `GET /admin/analytics/counts`
- `GET /admin/listings?type=events|deals|influencers|services&status=pending|approved|rejected`
- `PATCH /admin/listings/:type/:id/status`

## Run Locally

1. Copy `.env.example` to `.env` and set values.
2. Install dependencies:
   - `npm install`
3. Start dev server:
   - `npm run dev`

## Deploy to Render (backend API)

The API is a **Node web service** on [Render](https://render.com). Repo: [Event_WebApp](https://github.com/iqmathanalytics/Event_WebApp).

### First-time setup

1. **Push to GitHub** (already configured for this repo).
2. In [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service** → connect **iqmathanalytics / Event_WebApp**.
3. Configure:
   - **Root directory:** `.` (repo root)
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Health check path:** `/health`
4. **Environment variables** (match your TiDB/JWT setup; use **Secret** type for passwords/keys):

   | Key | Notes |
   |-----|--------|
   | `NODE_ENV` | `production` |
   | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | TiDB Cloud (or MySQL) |
   | `DB_SSL` | `true` for TiDB Cloud |
   | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_*_EXPIRES_IN` | Strong random strings |
   | `CORS_ORIGIN` | Your Netlify site URL(s), comma-separated if needed |
   | `GOOGLE_CLIENT_ID` | If using Google sign-in |
   | `CSC_API_KEY` | Optional; city catalog |

   See `.env.example` for optional Mailchimp, SendGrid, etc.

5. **Database migrations:** After the first successful deploy, run SQL migrations against the **same** DB Render uses (TiDB console, or from your PC with production `DB_*` in env):

   ```bash
   npm run db:migrate
   ```

   For a new empty database, use once: `npm run db:migrate:fresh` (runs bootstrap + migrations; destructive on existing data).

### Blueprint (optional)

`render.yaml` defines a service named **`yay-tickets-api`**. You can use **New → Blueprint** and point at this repo; then set **sync: false** secrets in the dashboard.

### Redeploy after a git push

- Render **auto-deploys** on push to the connected branch (usually `main`), or  
- From your machine (API key: Render → **Account** → **API keys**):

  ```bash
  # PowerShell: set RENDER_API_KEY, or add it to .env (do not commit)
  npm run deploy:render
  ```

## Frontend (Netlify)

The Vite app lives under `frontend/`. **Netlify** is configured via `netlify.toml` (build base `frontend`, publish `dist`).

1. **New site from Git** → same GitHub repo → base directory **`frontend`**, build `npm run build`, publish `dist`.
2. In Netlify **Environment variables**, optional: `VITE_API_BASE_URL` = your Render API URL + `/api/v1` (e.g. `https://<your-service>.onrender.com/api/v1`). If unset, production builds use the default URL in `frontend/src/services/api.js`.

3. Set **`CORS_ORIGIN`** on Render to your Netlify URL (e.g. `https://your-site.netlify.app`).
