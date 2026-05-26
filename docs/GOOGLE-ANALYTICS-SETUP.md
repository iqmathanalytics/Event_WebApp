# Google Analytics 4 — Organizer event insights

Organizer **Overview** includes per-event analytics from GA4 (not first-party page-hit counting). GA deduplicates users and sessions.

## 1. GA4 property

1. [Google Analytics](https://analytics.google.com/) → Admin → Create property (GA4).
2. Add a **Web** data stream for your site URL.
3. Copy the **Measurement ID** (`G-XXXXXXXX`).

## 2. Custom event parameter (required)

Admin → **Custom definitions** → **Create custom dimension**:

| Field | Value |
|--------|--------|
| Dimension name | Book My Tickets Event ID |
| Scope | Event |
| Event parameter | `bmt_event_id` |

Optional (ticket tier funnels in GA):

| Dimension name | Scope | Event parameter |
|----------------|--------|-----------------|
| Ticket level ID | Event | `bmt_ticket_level_id` |
| Ticket level name | Event | `bmt_ticket_level_name` |
| Ticket tier key | Event | `bmt_ticket_tier_key` |

Without `bmt_event_id`, per-event filters in the Data API return no data.

## 3. Frontend (`frontend/.env`)

```env
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Rebuild/restart Vite after changing.

## 4. Backend (API `.env`)

1. Google Cloud Console → enable **Google Analytics Data API**.
2. Create a **service account** → download JSON key.
3. GA Admin → Property access management → add the service email as **Viewer**.

   **UI shows “This email doesn’t match a google account”?**  
   That is normal for `...@....iam.gserviceaccount.com` addresses — the Add users box only validates Gmail/Workspace accounts. Use the script below instead of the UI.

4. Property → Property settings → copy numeric **Property ID** (not Measurement ID).

### Grant service account access when the GA4 UI blocks the email

1. In Google Cloud Console (same project as the service account), enable **Google Analytics Admin API**.

2. **Recommended — OAuth Desktop client (`--oauth`)**  
   Use this if `gcloud auth application-default login` shows **“This app is blocked”** (Google blocks gcloud’s built-in app for sensitive Analytics scopes).

   **A. OAuth consent screen** (one time)  
   - [Google Cloud Console](https://console.cloud.google.com/) → your project → **APIs & Services** → **OAuth consent screen**.  
   - User type: **External** → Create.  
   - App name: e.g. `Book My Tickets GA setup`.  
   - **Test users** → **Add users** → your Gmail (the GA4 Administrator account).  
   - **Scopes** → **Add or remove scopes** → filter “Analytics Admin” → enable  
     `https://www.googleapis.com/auth/analytics.manage.users` → **Update** → **Save**.

   **B. OAuth client**  
   - **Credentials** → **Create credentials** → **OAuth client ID**.  
   - Application type: **Desktop app** → Create.  
   - Copy **Client ID** and **Client secret**.  
   - Edit the client → **Authorized redirect URIs** → add:  
     `http://127.0.0.1:53682/oauth2callback` → **Save**.

   **C. Add to root `.env`** (one-time setup only; not used by the running app):

   ```env
   GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
   ```

   **D. Run the script with `--oauth`:**

   ```powershell
   node scripts/grant-ga4-service-account-access.js --oauth
   ```

   Sign in with your **Test user** Gmail when the browser opens. You should see your app name, not “Google Cloud SDK”.

3. **Alternative — gcloud** (often blocked on personal Gmail):

   ```powershell
   gcloud auth application-default login --scopes="https://www.googleapis.com/auth/analytics.manage.users,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/userinfo.email"
   node scripts/grant-ga4-service-account-access.js
   ```

4. Confirm in GA4 → **Admin** → **Property access management** — the service account should appear with **Viewer**.

**Also try (sometimes works in UI):** **Admin** → **Account** column → **Account access management** → add the service account email as Viewer.

```env
GA4_PROPERTY_ID=123456789
GA_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

`GA_SERVICE_ACCOUNT_JSON` must be a single-line JSON string (escape quotes if needed).

## 5. Events sent from the app

| GA event | When |
|----------|------|
| `page_view` | Event detail page load (`bmt_event_id`) |
| `bmt_ticket_click` | “View details” / ticket intent |
| `bmt_external_click` | External ticket URL click |
| `bmt_ticket_tier_add` | Guest adds/increases a tier in checkout cart |
| `bmt_booking_complete` | Checkout completed (summary) |
| `bmt_booking_tier_line` | One line per tier in completed booking |

## 6. Verify

1. Open an approved event on the public site.
2. GA → Reports → Realtime — confirm activity.
3. Organizer dashboard → **Overview** → select event → KPIs populate (may take 24–48h for some dimensions; realtime works sooner).

### Insights show 0 but DebugView looks fine?

If you use the **Google Analytics Debugger** Chrome extension (or `debug_mode: true` in gtag), events show in **DebugView** with `debug_mode: 1` but **do not** flow into standard reports or the **Data API** (organizer Insights). That is expected.

**Fix for testing Insights:**

1. Disable the GA Debugger extension (or use an incognito window without it).
2. Hard-refresh http://localhost:5173 and open an event page several times.
3. Wait a few hours (up to 24h) for `runReport` data; re-run `node scripts/check-ga4-insights.js EVENT_ID`.

Production visitors (no debug extension) are counted normally.

### Realtime / “Today” stuck at 0?

1. Confirm **`VITE_GA_MEASUREMENT_ID`** was set when you ran `npm run build` and you uploaded that `dist/` build.
2. Confirm the **`bmt_event_id`** custom dimension exists (section 2). Without it, the API falls back to matching event URLs (`/events/...-EVENT_ID`).
3. The Insights panel polls about once per minute. Opening many events in a short time can hit GA Data API **hourly quotas**; live counts pause until the quota resets (check API server logs for `quota exceeded`).
4. Run `node scripts/debug-ga-realtime.js EVENT_ID` on the API machine (with `GA_*` env vars) to see standard vs realtime numbers.

## Notes

- **Bookings & revenue** come from your database (platform ticket events). **Ticket tier breakdown** (tickets sold and revenue per General / Premium / VIP) is computed from `ticket_items_json` on bookings — see Insights → **Ticket tiers**.
- Legacy `view_count` / `click_count` on events are unchanged for trending; organizer charts use GA only.
- Geography map uses GA country/region data (world choropleth).
