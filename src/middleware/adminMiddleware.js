const ApiError = require("../utils/ApiError");

function adminMiddleware(req, _res, next) {
  if (!req.user || req.user.role !== "admin") {
    return next(new ApiError(403, "Forbidden: admin access required"));
  }
  return next();
}

module.exports = adminMiddleware;
