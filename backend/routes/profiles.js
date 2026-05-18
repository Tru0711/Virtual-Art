const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const User = require('../models/User');
const ArtistProfile = require('../models/ArtistProfile');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadBuffer, isCloudinaryConfigured } = require('../config/cloudinary');

const router = express.Router();

const maskPattern = /(^$)|(^[A-Za-z0-9*\s-]{4,40}$)/;

// Get all profiles (public)
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get profile by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update profile
router.put('/:id', auth, upload.single('profile_picture'), [
  body('full_name').optional().notEmpty(),
  body('phone').optional(),
  body('address').optional(),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('dateOfBirth').optional().isISO8601(),
  body('city').optional(),
  body('state').optional(),
  body('country').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user can update this profile
    if (req.user._id.toString() !== req.params.id && req.user.user_type !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updates = req.body;
    updates.updated_at = new Date();

    // If a new profile picture was uploaded, store the Cloudinary URL
    if (req.file) {
      if (!isCloudinaryConfigured) {
        return res.status(500).json({ message: 'Cloudinary is not configured on the server.' });
      }

      const uploadResult = await uploadBuffer(req.file.buffer, {
        folder: 'virtual-art/profiles',
        public_id: `profile-${req.params.id}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        resource_type: 'image',
        overwrite: true,
      });

      updates.profile_picture = uploadResult.secure_url;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload signature (PNG only)
router.post('/:id/signature', auth, upload.signatureUpload.single('signature'), async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id && req.user.user_type !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Signature file is required (PNG with transparent background).' });
    }

    if (req.file.mimetype !== 'image/png') {
      return res.status(400).json({ message: 'Signature must be a PNG with transparent background.' });
    }

    if (!isCloudinaryConfigured) {
      return res.status(500).json({ message: 'Cloudinary is not configured on the server.' });
    }

    const uploadResult = await uploadBuffer(req.file.buffer, {
      folder: 'virtual-art/signatures',
      public_id: `signature-${req.params.id}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      resource_type: 'image',
      overwrite: true,
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { signatureImage: uploadResult.secure_url, updated_at: new Date() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Signature uploaded successfully', signatureImage: user.signatureImage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete profile
router.delete('/:id', auth, async (req, res) => {
  try {
    // Only admin can delete profiles
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Buyer payment preferences (safe fields only)
router.get('/me/payment-preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('payment_preferences user_type');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.user_type !== 'user') {
      return res.status(403).json({ message: 'Only buyers can access payment preferences' });
    }

    res.json({
      success: true,
      payment_preferences: user.payment_preferences || {
        preferred_method: '',
        masked_identifier: '',
        updated_at: null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/me/payment-preferences', auth, [
  body('preferred_method').isIn(['UPI', 'Card', 'Net Banking', 'Wallet']).withMessage('Preferred method is invalid'),
  body('masked_identifier')
    .optional({ nullable: true })
    .matches(maskPattern)
    .withMessage('Masked identifier must be 4-40 safe characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.user_type !== 'user') {
      return res.status(403).json({ message: 'Only buyers can update payment preferences' });
    }

    const { preferred_method, masked_identifier = '' } = req.body;

    user.payment_preferences = {
      preferred_method,
      masked_identifier,
      updated_at: new Date(),
    };
    await user.save();

    res.json({ success: true, message: 'Payment preferences updated', payment_preferences: user.payment_preferences });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
