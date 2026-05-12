const crypto = require('crypto');

// Use a consistent key derived from environment or a fixed phrase
// For production, this should be from a secure key management service
const ENCRYPTION_KEY = crypto
  .createHash('sha256')
  .update(String(process.env.ENCRYPTION_KEY || 'visualart-default-key-change-in-production'))
  .digest();

const ALGO = 'aes-256-cbc';

const encryptField = (plaintext) => {
  try {
    if (!plaintext || typeof plaintext !== 'string') {
      return '';
    }
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGO, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error.message);
    throw new Error('Failed to encrypt data');
  }
};

const decryptField = (encryptedData) => {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') {
      return '';
    }
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      return '';
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGO, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    return '';
  }
};

const validateIFSC = (ifsc) => {
  // IFSC format: 4 letters, 0, 6 alphanumeric
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
};

const validateAccountNumber = (accountNumber) => {
  // Basic validation: 10-20 digits
  return /^\d{10,20}$/.test(accountNumber);
};

const validatePAN = (pan) => {
  // PAN format: AAAAA9999A (5 letters, 4 digits, 1 letter)
  // Optional field, so empty is allowed
  if (!pan) return true;
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan);
};

module.exports = {
  encryptField,
  decryptField,
  validateIFSC,
  validateAccountNumber,
  validatePAN,
};
