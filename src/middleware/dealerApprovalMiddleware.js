const ApiError = require("../utils/ApiError");
const { findApprovedDealerProfileByCreator } = require("../models/dealerProfileModel");

async function dealerApprovalMiddleware(req, _res, next) {
  try {
    if (!req.user?.id) {
      return next(new ApiError(401, "Unauthorized"));
    }
    if (req.user?.role === "admin") {
      return next();
    }
    const approved = await findApprovedDealerProfileByCreator(req.user.id);
    if (!approved) {
      return next(new ApiError(403, "Your dealer profile is pending admin approval."));
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = dealerApprovalMiddleware;
