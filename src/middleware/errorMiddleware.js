const ApiError = require("../utils/ApiError");

function notFoundMiddleware(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

function errorMiddleware(err, _req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details || undefined
    });
  }

  // eslint-disable-next-line no-console
  console.error("[errorMiddleware]", err?.message || err, err?.stack || "");

  const isDev = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "dev";
  return res.status(500).json({
    success: false,
    message: isDev && err?.message ? `Internal server error: ${err.message}` : "Internal server error"
  });
}

module.exports = {
  notFoundMiddleware,
  errorMiddleware
};
