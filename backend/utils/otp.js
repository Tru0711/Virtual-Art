const crypto = require('crypto');

const generateOtp = () => {
  const otp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  return otp;
};

const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
};

const normalizeEmail = (email = '') => email.trim().toLowerCase();

module.exports = {
  generateOtp,
  hashOtp,
  normalizeEmail,
};
