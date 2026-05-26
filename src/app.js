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
  const hops = Number(process.env.TRUST_PROXY_HOPS);
  app.set("trust proxy", Number.isFinite(hops) && hops > 0 ? hops : 1);
}

const explicitCorsOrigins = [
  "http://bookmytickets.us",
  "http://www.bookmytickets.us",
  "https://bookmytickets.us",
  "https://www.bookmytickets.us"
];
const envOrigins = String(corsOrigin || "")
  .split(",")
  .map((item) => item.trim())
  .filter((item) => item && item !== "*");
const wildcardOriginSuffixes = envOrigins
  .filter((item) => item.startsWith("*.") && item.length > 2)
  .map((item) => item.slice(1));
const corsOriginAllowlist = [...new Set([...explicitCorsOrigins, ...envOrigins.filter((o) => !o.startsWith("*."))])];

/** bookmytickets.us and subdomains over http or https (http while SSL is not yet enforced). */
function isBookmyticketsOrigin(origin) {
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    return host === "bookmytickets.us" || host.endsWith(".bookmytickets.us");
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
    if (nodeEnv === "production" && isBookmyticketsOrigin(origin)) {
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

const paymentController = require("./controllers/paymentController");
app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  paymentController.stripeWebhook
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

app.get("/", (_req, res) => {
  const isProd = nodeEnv === "production";
  res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Book My Tickets API</title></head>
<body style="font-family:system-ui,sans-serif;max-width:36rem;margin:2rem auto;padding:0 1rem;line-height:1.5;color:#0f172a">
  <h1 style="font-size:1.25rem">Book My Tickets API</h1>
  <p>This host serves the <strong>REST API</strong> (not the public website UI).</p>
  <ul>
    <li><a href="/health">GET /health</a> — JSON health check</li>
    <li><a href="/api">GET /api</a> — proxy health (if configured)</li>
  </ul>
  ${
    isProd
      ? "<p>Website: <code>https://bookmytickets.us</code> (static build). API routes are under your configured <code>/api</code> prefix.</p>"
      : "<p>Local dev: API on this port; run the Vite frontend on port 5173. Use <strong>http://</strong> (not https) for localhost.</p>"
  }
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
