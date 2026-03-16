const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../config/env");

function generateAccessToken(payload) {
  return jwt.sign(payload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn
  });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, jwtConfig.refreshSecret);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
};
