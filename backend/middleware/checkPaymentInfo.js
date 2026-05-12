const ArtistProfile = require('../models/ArtistProfile');

const checkPaymentInfoRequired = async (req, res, next) => {
  try {
    // Only applies to logged-in artists
    if (!req.user || req.user.user_type !== 'artist') {
      return next();
    }

    const artistProfile = await ArtistProfile.findOne({ user_id: req.user._id });
    if (!artistProfile) {
      return res.status(400).json({
        success: false,
        message: 'Artist profile not found. Please complete your profile setup.',
      });
    }

    const paymentInfo = artistProfile.payment_info || {};
    const isCompleted = paymentInfo.is_completed === true;

    if (!isCompleted) {
      return res.status(402).json({
        success: false,
        message: 'Payment information required. Please complete your payment settings before uploading artwork.',
        payment_required: true,
      });
    }

    next();
  } catch (error) {
    console.error('Payment info check error:', error);
    return res.status(500).json({ message: 'Error checking payment status' });
  }
};

module.exports = { checkPaymentInfoRequired };
