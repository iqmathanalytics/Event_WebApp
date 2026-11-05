const ApiError = require("../utils/ApiError");
const { findUserById } = require("../models/userModel");

/**
 * Venue check-in: admin or organizer tools only (DB-backed flags).
 * Must run after authMiddleware.
 */
async function checkInAccessMiddleware(req, _res, next) {
  try {
    const { id, role } = req.user || {};
    if (!id) {
      return next(new ApiError(401, "Unauthorized"));
    }

    if (role === "admin") {
      req.checkInActor = { type: "admin", userId: id };
      return next();
    }

    const user = await findUserById(id);
    if (!user || !user.is_active) {
      return next(new ApiError(403, "Account is deactivated"));
    }

    const canCheckIn =
      user.role === "admin" ||
      user.role === "organizer" ||
      user.organizer_enabled === 1 ||
      user.organizer_enabled === true;

    if (!canCheckIn) {
      return next(
        new ApiError(403, "Staff or organizer sign-in is required for venue check-in.")
      );
    }

    req.checkInActor = {
      type: user.role === "admin" ? "admin" : "organizer",
      userId: user.id
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = checkInAccessMiddleware;
