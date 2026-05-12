const ArtistProfile = require('../models/ArtistProfile');
const {
  encryptField,
  decryptField,
  validateIFSC,
  validateAccountNumber,
  validatePAN,
} = require('../utils/paymentEncryption');

const getPaymentInfo = async (req, res) => {
  try {
    const userId = req.user._id;

    const artistProfile = await ArtistProfile.findOne({ user_id: userId });
    if (!artistProfile) {
      return res.status(404).json({ message: 'Artist profile not found' });
    }

    // Decrypt sensitive fields if they exist
    const paymentInfo = artistProfile.payment_info || {};
    const decrypted = {
      full_name: paymentInfo.full_name || '',
      email: paymentInfo.email || '',
      phone: paymentInfo.phone || '',
      account_number: paymentInfo.account_number ? decryptField(paymentInfo.account_number) : '',
      ifsc: paymentInfo.ifsc ? decryptField(paymentInfo.ifsc) : '',
      bank_name: paymentInfo.bank_name || '',
      account_type: paymentInfo.account_type || '',
      pan_tax_id: paymentInfo.pan_tax_id ? decryptField(paymentInfo.pan_tax_id) : '',
      is_completed: paymentInfo.is_completed || false,
      verified: paymentInfo.verified || false,
      updated_at: paymentInfo.updated_at || null,
    };

    return res.json({
      success: true,
      data: decrypted,
    });
  } catch (error) {
    console.error('Get payment info error:', error);
    return res.status(500).json({ message: 'Failed to retrieve payment information' });
  }
};

const updatePaymentInfo = async (req, res) => {
  try {
    const userId = req.user._id;
    const { full_name, email, phone, account_number, ifsc, bank_name, account_type, pan_tax_id } = req.body;

    // Validation
    if (!full_name || !email || !account_number || !ifsc || !bank_name || !account_type) {
      return res.status(400).json({
        message: 'Missing required payment fields',
      });
    }

    if (!validateAccountNumber(account_number)) {
      return res.status(400).json({
        message: 'Invalid account number format. Must be 10-20 digits.',
      });
    }

    if (!validateIFSC(ifsc)) {
      return res.status(400).json({
        message: 'Invalid IFSC code format. Example: SBIN0001234',
      });
    }

    if (!['Savings', 'Current'].includes(account_type)) {
      return res.status(400).json({
        message: 'Account type must be either Savings or Current',
      });
    }

    if (pan_tax_id && !validatePAN(pan_tax_id)) {
      return res.status(400).json({
        message: 'Invalid PAN format. Example: AAAAA1234A',
      });
    }

    const artistProfile = await ArtistProfile.findOne({ user_id: userId });
    if (!artistProfile) {
      return res.status(404).json({ message: 'Artist profile not found' });
    }

    // Encrypt sensitive fields
    const encrypted = {
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
      account_number: encryptField(account_number.trim()),
      ifsc: encryptField(ifsc.trim().toUpperCase()),
      bank_name: bank_name.trim(),
      account_type,
      pan_tax_id: pan_tax_id ? encryptField(pan_tax_id.trim().toUpperCase()) : '',
      is_completed: true,
      verified: false, // Admin would verify in production
      updated_at: new Date(),
    };

    artistProfile.payment_info = encrypted;
    await artistProfile.save();

    // Return decrypted response for frontend
    const response = {
      full_name: encrypted.full_name,
      email: encrypted.email,
      phone: encrypted.phone,
      account_number: account_number,
      ifsc: ifsc.toUpperCase(),
      bank_name: encrypted.bank_name,
      account_type: encrypted.account_type,
      pan_tax_id: pan_tax_id || '',
      is_completed: encrypted.is_completed,
      verified: encrypted.verified,
      updated_at: encrypted.updated_at,
    };

    return res.json({
      success: true,
      message: 'Payment information saved successfully',
      data: response,
    });
  } catch (error) {
    console.error('Update payment info error:', error);
    return res.status(500).json({ message: 'Failed to save payment information' });
  }
};

const checkPaymentCompleteness = async (req, res) => {
  try {
    const userId = req.user._id;

    const artistProfile = await ArtistProfile.findOne({ user_id: userId });
    if (!artistProfile) {
      return res.json({ is_completed: false });
    }

    const paymentInfo = artistProfile.payment_info || {};
    const isCompleted = paymentInfo.is_completed === true;

    return res.json({
      is_completed: isCompleted,
      verified: paymentInfo.verified || false,
    });
  } catch (error) {
    console.error('Check payment completeness error:', error);
    return res.status(500).json({ message: 'Failed to check payment status' });
  }
};

module.exports = {
  getPaymentInfo,
  updatePaymentInfo,
  checkPaymentCompleteness,
};
