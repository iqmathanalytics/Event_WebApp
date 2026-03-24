const ApiError = require("../utils/ApiError");
const { findUserById } = require("../models/userModel");

function capabilityMiddleware(capabilityField, message = "You do not have access for this action") {
  return async function requireCapability(req, _res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return next(new ApiError(401, "Unauthorized"));
      }

      if (req.user?.role === "admin") {
        return next();
      }

      const user = await findUserById(userId);
      if (!user || !user.is_active) {
        return next(new ApiError(403, "Account is deactivated"));
      }

      const allowed = user[capabilityField] === 1 || user[capabilityField] === true;
      if (!allowed) {
        return next(new ApiError(403, message));
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = capabilityMiddleware;

