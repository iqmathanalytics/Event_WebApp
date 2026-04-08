const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const routes = require("./routes");
const { corsOrigin, nodeEnv } = require("./config/env");
const { notFoundMiddleware, errorMiddleware } = require("./middleware/errorMiddleware");

const app = express();

// Behind Render/nginx/Cloudflare, clients must be identified via X-Forwarded-For.
// Without this, req.ip is the proxy and every user shares one rate-limit bucket → 429s.
if (nodeEnv === "production") {
  const hops = Number(process.env.TRUST_PROXY_HOPS);
  app.set("trust proxy", Number.isFinite(hops) && hops >= 1 ? hops : 1);
}

const allowedOrigins = String(corsOrigin || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const wildcardOriginSuffixes = allowedOrigins
  .filter((item) => item.startsWith("*.") && item.length > 2)
  .map((item) => item.slice(1)); // "*.netlify.app" -> ".netlify.app"

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (allowedOrigins.includes("*")) {
        callback(null, true);
        return;
      }
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (wildcardOriginSuffixes.some((suffix) => origin.endsWith(suffix))) {
        callback(null, true);
        return;
      }
      // Netlify preview + new site URLs change often; allow by suffix in production.
      if (nodeEnv === "production" && origin.endsWith(".netlify.app")) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(nodeEnv === "production" ? "combined" : "dev"));

const rateLimitWindowMs = (() => {
  const n = Number(process.env.RATE_LIMIT_WINDOW_MS);
  return Number.isFinite(n) && n > 0 ? n : 15 * 60 * 1000;
})();
const rateLimitMax = (() => {
  const n = Number(process.env.RATE_LIMIT_MAX);
  return Number.isFinite(n) && n > 0 ? n : 300;
})();
const isRateLimitDisabled = String(process.env.RATE_LIMIT_DISABLED || "").toLowerCase() === "true";

if (!isRateLimitDisabled) {
  const globalLimiter = rateLimit({
    windowMs: rateLimitWindowMs,
    max: rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === "/health"
  });
  app.use(globalLimiter);
}

app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, message: "OK" });
});

/** Browsers must use http:// (not https://) — this server does not terminate TLS in local dev. */
app.get("/", (_req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Yay! Tickets API</title></head>
<body style="font-family:system-ui,sans-serif;max-width:36rem;margin:2rem auto;padding:0 1rem;line-height:1.5;color:#0f172a">
  <h1 style="font-size:1.25rem">Yay! Tickets API</h1>
  <p>This URL is the <strong>REST API</strong> (not the website UI). Use <strong>HTTP</strong>, not HTTPS, in the browser bar:</p>
  <p><code>http://localhost:5000</code></p>
  <p>If you see “invalid response,” you likely opened <code>https://</code> — switch to <code>http://</code>.</p>
  <ul>
    <li><a href="/health">GET /health</a> — JSON health check</li>
    <li>API routes under <code>/api/v1/…</code></li>
  </ul>
  <p>Run the <strong>frontend</strong> separately (e.g. Vite on port 5173) for the web app.</p>
</body>
</html>`);
});

app.use("/api/v1", routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
