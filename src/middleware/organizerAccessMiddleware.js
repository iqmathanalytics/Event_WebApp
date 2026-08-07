const ApiError = require("../utils/ApiError");
const { findUserById } = require("../models/userModel");

async function organizerAccessMiddleware(req, _res, next) {
  try {
    const { id, role } = req.user || {};

    if (!id) {
      return next(new ApiError(401, "Unauthorized"));
    }

    if (role === "admin") {
      return next();
    }

    const user = await findUserById(id);
    if (!user || !user.is_active) {
      return next(new ApiError(403, "Account is deactivated"));
    }

    // Event posting capability, or organizer tools unlocked (e.g. shared analytics invite).
    const allowed =
      user.can_post_events === 1 ||
      user.can_post_events === true ||
      user.organizer_enabled === 1 ||
      user.organizer_enabled === true;
    if (!allowed) {
      return next(new ApiError(403, "Event posting is disabled for this account"));
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = organizerAccessMiddleware;

