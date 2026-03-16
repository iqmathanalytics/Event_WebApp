const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../config/env");
const ApiError = require("../utils/ApiError");

function authMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ApiError(401, "Unauthorized: missing token"));
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, jwtConfig.accessSecret);
    req.user = decoded;
    return next();
  } catch (_err) {
    return next(new ApiError(401, "Unauthorized: invalid token"));
  }
}

module.exports = authMiddleware;
