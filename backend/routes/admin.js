const express = require('express');
const User = require('../models/User');
const Artwork = require('../models/Artwork');
const Order = require('../models/Order');
const Review = require('../models/Review');
const PaymentTransaction = require('../models/PaymentTransaction');
const { auth } = require('../middleware/auth');
const { checkAndGenerateCertificate } = require('../controllers/certificateController');

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.user_type !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const buildMonthlySeries = async ({ model, dateField, match = {}, sumField }) => {
  const pipeline = [
    { $match: match },
    { $addFields: { resolvedDate: { $ifNull: [`$${dateField}`, '$created_at'] } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m',
            date: '$resolvedDate'
          }
        },
        total: {
          $sum: sumField ? { $ifNull: [`$${sumField}`, 0] } : 1
        }
      }
    },
    { $sort: { _id: 1 } }
  ];

  const results = await model.aggregate(pipeline);
  return results.map((row) => ({ month: row._id, total: row.total }));
};

// Get all users (admin only)
router.get('/users', auth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/users/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      full_name,
      email,
      user_type,
      phone,
      address,
      city,
      state,
      country,
      gender,
      dateOfBirth,
      profile_picture,
    } = req.body;

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const normalizedType = user_type;
    if (normalizedType && !['user', 'artist', 'admin'].includes(normalizedType)) {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(409).json({ message: 'Email already exists' });
      }
    }

    if (targetUser.user_type === 'admin' && normalizedType && normalizedType !== 'admin') {
      const adminCount = await User.countDocuments({ user_type: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'At least one admin must remain active' });
      }
    }

    const updates = {};
    if (full_name !== undefined) updates.full_name = String(full_name).trim();
    if (email !== undefined) updates.email = String(email).trim().toLowerCase();
    if (normalizedType) updates.user_type = normalizedType;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (country !== undefined) updates.country = country;
    if (gender !== undefined) updates.gender = gender || undefined;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    if (profile_picture !== undefined) updates.profile_picture = profile_picture;
    updates.updated_at = new Date();

    Object.assign(targetUser, updates);
    await targetUser.save();

    const safeUser = targetUser.toObject();
    delete safeUser.password;

    res.json({
      success: true,
      message: 'User updated successfully',
      user: safeUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/users/:userId', auth, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    if (String(req.user._id) === String(userId)) {
      return res.status(400).json({ message: 'You cannot delete your own admin account' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (targetUser.user_type === 'admin') {
      const adminCount = await User.countDocuments({ user_type: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ message: 'At least one admin must remain active' });
      }
    }

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/stats', auth, requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalArtists, totalArtworks, totalOrders, revenueAgg] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ user_type: 'artist' }),
      Artwork.countDocuments(),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$total_amount', 0] } } } }
      ])
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;

    res.json({
      totalUsers,
      totalArtists,
      totalArtworks,
      totalOrders,
      totalRevenue
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/user-growth', auth, requireAdmin, async (req, res) => {
  try {
    const series = await buildMonthlySeries({
      model: User,
      dateField: 'created_at'
    });

    res.json(series.map((row) => ({ month: row.month, users: row.total })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/sales-trend', auth, requireAdmin, async (req, res) => {
  try {
    const series = await buildMonthlySeries({
      model: Order,
      dateField: 'order_date',
      match: { status: 'completed' },
      sumField: 'total_amount'
    });

    res.json(series.map((row) => ({ month: row.month, revenue: row.total })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/artwork-status', auth, requireAdmin, async (req, res) => {
  try {
    const statusAgg = await Artwork.aggregate([
      { $group: { _id: '$approval_status', count: { $sum: 1 } } }
    ]);

    const statusMap = statusAgg.reduce((acc, row) => {
      acc[row._id || 'pending'] = row.count;
      return acc;
    }, {});

    res.json({
      approved: statusMap.approved || 0,
      pending: statusMap.pending || 0,
      rejected: statusMap.rejected || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all artworks (admin only)
router.get('/artworks', auth, requireAdmin, async (req, res) => {
  try {
    const artworks = await Artwork.find().populate('artist_id', 'full_name');
    res.json(artworks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all orders (admin only)
router.get('/orders', auth, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user_id', 'full_name email')
      .populate('artwork_id', 'title price');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get payment transaction analytics (admin only)
router.get('/payment-transactions', auth, requireAdmin, async (req, res) => {
  try {
    const [transactions, totalsAgg, failedPayments] = await Promise.all([
      PaymentTransaction.find()
        .sort({ created_at: -1 })
        .limit(50)
        .populate('buyer_id', 'full_name email')
        .populate('artist_id', 'full_name email')
        .populate('artwork_id', 'title image_url'),
      PaymentTransaction.aggregate([
        {
          $group: {
            _id: null,
            total_revenue: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paid'] }, { $ifNull: ['$amount_paid', 0] }, 0],
              },
            },
            total_commission_earned: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paid'] }, { $ifNull: ['$commission_amount', 0] }, 0],
              },
            },
            platform_markup_earned: {
              $sum: {
                $cond: [{ $eq: ['$status', 'paid'] }, { $ifNull: ['$markup_amount', 0] }, 0],
              },
            },
            total_failed_payments: {
              $sum: {
                $cond: [{ $in: ['$status', ['failed', 'cancelled']] }, 1, 0],
              },
            },
          },
        },
      ]),
      PaymentTransaction.find({ status: { $in: ['failed', 'cancelled'] } })
        .sort({ updated_at: -1 })
        .limit(25)
        .populate('buyer_id', 'full_name email')
        .populate('artist_id', 'full_name email')
        .populate('artwork_id', 'title image_url'),
    ]);

    const totals = totalsAgg[0] || {
      total_revenue: 0,
      total_commission_earned: 0,
      platform_markup_earned: 0,
      total_failed_payments: 0,
    };

    res.json({
      summary: totals,
      recent_transactions: transactions,
      failed_payments: failedPayments,
    });
  } catch (error) {
    console.error('Error fetching payment transactions:', error);
    res.status(500).json({ message: error.message || 'Failed to load payment transactions' });
  }
});

// Get all reviews (admin only)
router.get('/reviews', auth, requireAdmin, async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user_id', 'full_name')
      .populate('artwork_id', 'title');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/admin/artworks/:artworkId/approve
 * @desc    Approve an artwork (triggers certificate check)
 * @access  Admin
 */
router.post('/artworks/:artworkId/approve', auth, requireAdmin, async (req, res) => {
  try {
    const { artworkId } = req.params;

    const artwork = await Artwork.findById(artworkId);
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    // Update artwork status to published and approval_status to approved
    artwork.status = 'published';
    artwork.approval_status = 'approved';
    await artwork.save();

    // Check if artist has reached a milestone for certificate generation
    let certificateGenerated = null;
    try {
      certificateGenerated = await checkAndGenerateCertificate(artwork.artist_id);
      if (certificateGenerated) {
        console.log(`Certificate generated for artist: ${artwork.artist_id}`);
      }
    } catch (certError) {
      console.error('Error checking certificate milestone:', certError);
      // Continue even if certificate generation fails
    }

    res.json({
      success: true,
      message: 'Artwork approved successfully',
      artwork,
      certificateGenerated: certificateGenerated ? true : false,
      certificateInfo: certificateGenerated || null
    });
  } catch (error) {
    console.error('Error approving artwork:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/admin/artworks/:artworkId/reject
 * @desc    Reject an artwork
 * @access  Admin
 */
router.post('/artworks/:artworkId/reject', auth, requireAdmin, async (req, res) => {
  try {
    const { artworkId } = req.params;
    const { reason } = req.body;

    const artwork = await Artwork.findById(artworkId);
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    // Update artwork
    artwork.status = 'rejected';
    artwork.approval_status = 'rejected';
    artwork.rejected_reason = reason || 'No reason provided';
    artwork.rejected_by = req.user.id;
    await artwork.save();

    res.json({
      success: true,
      message: 'Artwork rejected successfully',
      artwork
    });
  } catch (error) {
    console.error('Error rejecting artwork:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/admin/artworks/pending
 * @desc    Get all pending artworks (awaiting approval)
 * @access  Admin
 */
router.get('/artworks/pending', auth, requireAdmin, async (req, res) => {
  try {
    const pendingArtworks = await Artwork.find({
      approval_status: 'pending'
    })
      .populate('artist_id', 'full_name email')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      count: pendingArtworks.length,
      artworks: pendingArtworks
    });
  } catch (error) {
    console.error('Error fetching pending artworks:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
