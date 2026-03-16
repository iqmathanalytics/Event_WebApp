const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../config/env");

function optionalAuthMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  try {
    const token = authHeader.split(" ")[1];
    req.user = jwt.verify(token, jwtConfig.accessSecret);
  } catch (_err) {
    req.user = null;
  }
  return next();
}

module.exports = optionalAuthMiddleware;
