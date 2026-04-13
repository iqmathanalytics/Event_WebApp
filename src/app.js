const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const routes = require("./routes");
const { corsOrigin, nodeEnv } = require("./config/env");
const { notFoundMiddleware, errorMiddleware } = require("./middleware/errorMiddleware");

const app = express();

// Required behind MilesWeb / nginx / CDN so req.ip + rate-limit sees real clients.
if (nodeEnv === "production") {
  app.set("trust proxy", 1);
}

const explicitCorsOrigins = ["https://yayeventz.com", "https://www.yayeventz.com"];
const envOrigins = String(corsOrigin || "")
  .split(",")
  .map((item) => item.trim())
  .filter((item) => item && item !== "*");
const wildcardOriginSuffixes = envOrigins
  .filter((item) => item.startsWith("*.") && item.length > 2)
  .map((item) => item.slice(1));
const corsOriginAllowlist = [...new Set([...explicitCorsOrigins, ...envOrigins.filter((o) => !o.startsWith("*."))])];

function isHttpsYayeventzOrigin(origin) {
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return host === "yayeventz.com" || host.endsWith(".yayeventz.com");
  } catch (_e) {
    return false;
  }
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (corsOriginAllowlist.includes(origin)) {
      callback(null, origin);
      return;
    }
    if (nodeEnv === "production" && isHttpsYayeventzOrigin(origin)) {
      callback(null, origin);
      return;
    }
    if (wildcardOriginSuffixes.some((suffix) => origin.endsWith(suffix))) {
      callback(null, origin);
      return;
    }
    if (nodeEnv === "production" && origin.endsWith(".netlify.app")) {
      callback(null, origin);
      return;
    }
    if (nodeEnv !== "production" && /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
      callback(null, origin);
      return;
    }
    if (nodeEnv !== "production" && /^http:\/\/localhost:\d+$/.test(origin)) {
      callback(null, origin);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
  optionsSuccessStatus: 204
};

// CORS before helmet so responses stay readable from www → api (different hostnames).
app.use(cors(corsOptions));
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
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
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Yay! Eventz API</title></head>
<body style="font-family:system-ui,sans-serif;max-width:36rem;margin:2rem auto;padding:0 1rem;line-height:1.5;color:#0f172a">
  <h1 style="font-size:1.25rem">Yay! Eventz API</h1>
  <p>This URL is the <strong>REST API</strong> (not the website UI). Use <strong>HTTP</strong>, not HTTPS, in the browser bar:</p>
  <p><code>http://localhost:5000</code></p>
  <p>If you see “invalid response,” you likely opened <code>https://</code> — switch to <code>http://</code>.</p>
  <ul>
    <li><a href="/health">GET /health</a> — JSON health check</li>
    <li>API routes (behind proxy) under <code>/api/…</code></li>
  </ul>
  <p>Run the <strong>frontend</strong> separately (e.g. Vite on port 5173) for the web app.</p>
</body>
</html>`);
});

app.get("/api", (_req, res) => {
  res.status(200).send("API WORKING");
});

app.use("/", routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
