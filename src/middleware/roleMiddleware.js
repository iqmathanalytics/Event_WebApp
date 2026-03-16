const ApiError = require("../utils/ApiError");

function roleMiddleware(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden: insufficient permissions"));
    }
    return next();
  };
}

module.exports = roleMiddleware;
