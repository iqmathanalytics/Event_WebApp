const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const routes = require("./routes");
const { corsOrigin, nodeEnv } = require("./config/env");
const { notFoundMiddleware, errorMiddleware } = require("./middleware/errorMiddleware");

const app = express();
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

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(globalLimiter);

app.get("/health", (_req, res) => {
  res.status(200).json({ success: true, message: "OK" });
});

app.use("/api/v1", routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
