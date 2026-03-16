const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const routes = require("./routes");
const { corsOrigin, nodeEnv } = require("./config/env");
const { notFoundMiddleware, errorMiddleware } = require("./middleware/errorMiddleware");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin === "*" ? true : corsOrigin,
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
