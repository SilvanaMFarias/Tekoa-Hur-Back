const crypto = require("crypto");

/**
 * Genera token seguro
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

module.exports = {
  generateResetToken,
};