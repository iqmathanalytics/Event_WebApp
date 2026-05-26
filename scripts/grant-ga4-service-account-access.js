/**
 * Grant a Google Cloud service account Viewer access on a GA4 property.
 *
 * Use when GA4 Admin UI says "This email doesn't match a google account"
 * for *.iam.gserviceaccount.com addresses.
 *
 * Auth options:
 *   --oauth   Recommended on Windows when gcloud shows "This app is blocked".
 *             Uses your project's OAuth Desktop client (see docs/GOOGLE-ANALYTICS-SETUP.md).
 *   (default) Uses Application Default Credentials from gcloud (often blocked for this scope).
 *
 * Usage:
 *   node scripts/grant-ga4-service-account-access.js --oauth
 *   node scripts/grant-ga4-service-account-access.js --oauth --property 123456789 --email sa@p.iam.gserviceaccount.com
 */

require("dotenv").config();
const http = require("http");
const { URL } = require("url");
const { GoogleAuth, OAuth2Client } = require("google-auth-library");

const SCOPES = ["https://www.googleapis.com/auth/analytics.manage.users"];
const OAUTH_PORT = 53682;

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { email: null, property: null, oauth: false };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--oauth") {
      out.oauth = true;
    } else if (args[i] === "--email" && args[i + 1]) {
      out.email = args[i + 1].trim();
      i += 1;
    } else if (args[i] === "--property" && args[i + 1]) {
      out.property = String(args[i + 1]).trim().replace(/^properties\//, "");
      i += 1;
    }
  }
  return out;
}

function serviceAccountEmailFromEnv() {
  const raw = process.env.GA_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    return null;
  }
  try {
    const json = JSON.parse(raw);
    return json.client_email?.trim() || null;
  } catch {
    return null;
  }
}

function openBrowser(targetUrl) {
  const { exec } = require("child_process");
  const cmd =
    process.platform === "win32"
      ? `start "" "${targetUrl}"`
      : process.platform === "darwin"
        ? `open "${targetUrl}"`
        : `xdg-open "${targetUrl}"`;
  exec(cmd, () => {});
}

async function getAccessTokenViaOAuth() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    console.error(
      "Missing GOOGLE_OAUTH_CLIENT_ID or GOOGLE_OAUTH_CLIENT_SECRET in .env.\n\n" +
        "One-time setup in Google Cloud Console (same project as your service account):\n" +
        "  1. APIs & Services → OAuth consent screen → External → add your Gmail as Test user.\n" +
        "  2. Add scope: .../auth/analytics.manage.users (Google Analytics Admin API).\n" +
        "  3. Credentials → Create OAuth client → Desktop app.\n" +
        "  4. Add redirect URI: http://127.0.0.1:53682/oauth2callback\n" +
        "  5. Put Client ID and Client secret in .env, then run: node scripts/grant-ga4-service-account-access.js --oauth\n"
    );
    process.exit(1);
  }

  const redirectUri = `http://127.0.0.1:${OAUTH_PORT}/oauth2callback`;
  const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "online",
    scope: SCOPES,
    prompt: "consent"
  });

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        if (!req.url?.startsWith("/oauth2callback")) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        const parsed = new URL(req.url, redirectUri);
        const err = parsed.searchParams.get("error");
        if (err) {
          res.writeHead(400);
          res.end(`Google returned error: ${err}. Close this tab and check the terminal.`);
          server.close();
          reject(new Error(err));
          return;
        }
        const code = parsed.searchParams.get("code");
        if (!code) {
          res.writeHead(400);
          res.end("Missing authorization code.");
          return;
        }
        const { tokens } = await oauth2Client.getToken(code);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          "<h2>Success</h2><p>You can close this tab and return to the terminal.</p>"
        );
        server.close();
        if (!tokens.access_token) {
          reject(new Error("No access token received"));
          return;
        }
        resolve(tokens.access_token);
      } catch (e) {
        server.close();
        reject(e);
      }
    });

    server.on("error", reject);
    server.listen(OAUTH_PORT, "127.0.0.1", () => {
      console.log("Opening browser for Google sign-in (your OAuth app, not gcloud)…\n");
      console.log("If the browser does not open, visit:\n", authUrl, "\n");
      openBrowser(authUrl);
    });
  });
}

async function getAccessTokenViaAdc() {
  const auth = new GoogleAuth({ scopes: SCOPES });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) {
    console.error(
      "No ADC token. If gcloud shows 'This app is blocked', use:\n" +
        "  node scripts/grant-ga4-service-account-access.js --oauth"
    );
    process.exit(1);
  }
  return token;
}

async function main() {
  const flags = parseArgs();
  const propertyId = flags.property || process.env.GA4_PROPERTY_ID?.trim()?.replace(/^properties\//, "");
  const saEmail = flags.email || serviceAccountEmailFromEnv();

  if (!propertyId) {
    console.error("Missing GA4 property ID. Set GA4_PROPERTY_ID in .env or pass --property 123456789");
    process.exit(1);
  }
  if (!saEmail || !saEmail.endsWith(".iam.gserviceaccount.com")) {
    console.error("Missing service account email in GA_SERVICE_ACCOUNT_JSON or --email");
    process.exit(1);
  }

  const accessToken = flags.oauth ? await getAccessTokenViaOAuth() : await getAccessTokenViaAdc();

  const apiUrl = `https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/accessBindings`;
  const body = {
    roles: ["predefinedRoles/viewer"],
    user: saEmail
  };

  console.log(`Granting Viewer on property ${propertyId} to:\n  ${saEmail}\n`);

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data.error?.message || String(data);
    console.error("Failed:", res.status, msg);
    if (String(msg).toLowerCase().includes("insufficient authentication scopes")) {
      console.error("\nUse: node scripts/grant-ga4-service-account-access.js --oauth");
    } else if (res.status === 403) {
      console.error(
        "\nTips:\n" +
          "  • Enable Google Analytics Admin API in Google Cloud Console.\n" +
          "  • Your Google user must be GA4 Administrator on this property.\n" +
          "  • On OAuth consent screen, add your Gmail under Test users."
      );
    }
    if (res.status === 409 || String(msg).toLowerCase().includes("already")) {
      console.log("Service account may already have access — check GA4 Property access management.");
    }
    process.exit(1);
  }

  console.log("Success. Access binding created:");
  console.log(JSON.stringify(data, null, 2));
  console.log("\nVerify: GA4 → Admin → Property access management.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
