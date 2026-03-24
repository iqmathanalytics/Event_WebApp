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

## Deploy to Render

- `render.yaml` included.
- Set secrets in Render dashboard for DB + JWT env vars.
