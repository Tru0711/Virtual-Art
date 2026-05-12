const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Artwork = require('../models/Artwork');
const ArtistProfile = require('../models/ArtistProfile');
const { auth } = require('../middleware/auth');

const router = express.Router();
const buyerMarkupPercent = Number(process.env.BUYER_MARKUP_PERCENT || 10);
const commissionPercent = Number(process.env.ADMIN_COMMISSION_PERCENT || 10);

const calculateSplit = (baseAmount) => {
  const base = Math.round(Number(baseAmount || 0));
  const markupAmount = Math.round((base * buyerMarkupPercent) / 100);
  const commissionAmount = Math.round((base * commissionPercent) / 100);
  const buyerAmount = base + markupAmount;
  const artistAmount = Math.max(0, base - commissionAmount);
  const adminAmount = Math.max(0, buyerAmount - artistAmount);

  return { base, markupAmount, commissionAmount, buyerAmount, artistAmount, adminAmount };
};

const resolveArtistProfile = async (artistReference) => {
  if (!artistReference) {
    return null;
  }

  if (artistReference.user_id) {
    return artistReference;
  }

  const artistId = artistReference._id || artistReference;
  const directProfile = await ArtistProfile.findById(artistId);
  if (directProfile) {
    return directProfile;
  }

  return ArtistProfile.findOne({ user_id: artistId });
};

// Get orders for artist - their artworks that have been ordered
router.get('/artist', auth, async (req, res) => {
  try {
    // Verify user is an artist
    if (req.user.user_type !== 'artist') {
      return res.status(403).json({ success: false, message: 'Access denied. Artist only.' });
    }

    // Get artist profile
    const artistProfile = await ArtistProfile.findOne({ user_id: req.user._id });
    const artistIds = [req.user._id];
    if (artistProfile) {
      artistIds.push(artistProfile._id);
    }

    // Get all artworks for this artist
    const artworks = await Artwork.find({ 
      artist_id: { $in: artistIds } 
    }).select('_id');
    
    const artworkIds = artworks.map(art => art._id);

    // Fetch orders for artist's artworks
    const orders = await Order.find({
      artwork_id: { $in: artworkIds }
    })
      .populate('user_id', 'full_name email phone')
      .populate('artwork_id', 'title price category image_url medium')
      .sort({ order_date: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    console.error('[ORDERS API] Error fetching artist orders:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get orders for current user
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    if (req.user.user_type === 'admin') {
      // Admin can see all orders
    } else if (req.user.user_type === 'artist') {
      // Artists can see orders for their artworks
      const artistProfile = await ArtistProfile.findOne({ user_id: req.user._id });
      const artistIds = [req.user._id];
      if (artistProfile) {
        artistIds.push(artistProfile._id);
      }
      const artistArtworks = await Artwork.find({ artist_id: { $in: artistIds } }).select('_id');
      query.artwork_id = { $in: artistArtworks.map(a => a._id) };
    } else {
      // Regular users can see their own orders
      query.user_id = req.user._id;
    }

    const orders = await Order.find(query)
      .populate('user_id', 'full_name email')
      .populate('artwork_id', 'title price category image_url medium')
      .sort({ order_date: -1 });
    
    // Transform orders to match frontend expected format (with items array)
    const transformedOrders = orders.map(order => ({
      _id: order._id,
      user_id: order.user_id,
      status: order.status,
      payment_status: order.payment_status,
      delivery_status: order.delivery_status,
      payment_type: order.payment_type,
      paymentType: order.payment_type,
      amount: order.total_amount,
      order_date: order.order_date,
      shipping_address: order.shipping_address,
      items: [{
        product: order.artwork_id,
        quantity: order.quantity
      }]
    }));
    
    res.json({ success: true, orders: transformedOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get order by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user_id', 'full_name email')
      .populate('artwork_id', 'title price')
      .populate('artist_id', 'artist_name');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user can view this order
    const orderArtistId = order.artist_id?._id || order.artist_id;
    const canAccessAsArtist = orderArtistId && orderArtistId.toString() === req.user._id.toString();
    if (req.user.user_type !== 'admin' &&
        order.user_id._id.toString() !== req.user._id.toString() &&
        !canAccessAsArtist) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create order
router.post('/', auth, async (req, res) => {
  try {
    const { userId, items, address, paymentMethod } = req.body;

    // Manual validation
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid items' });
    }
    for (const item of items) {
      if (!item.product || typeof item.product !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid product in items' });
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
        return res.status(400).json({ success: false, message: 'Invalid quantity in items' });
      }
    }
    if (!address || typeof address !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid address' });
    }
    if (paymentMethod && !['stripe', 'razorpay'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid paymentMethod' });
    }

    // Verify user can only create orders for themselves
    if (req.user._id.toString() !== userId && req.user.user_type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Note: ObjectId conversion is not needed as we're storing string IDs directly

    let totalAmount = 0;
    const orderItems = [];

    // Validate each item
    for (const item of items) {
      const artwork = await Artwork.findById(item.product);
      if (!artwork || artwork.status !== 'published') {
        return res.status(400).json({ success: false, message: `Artwork ${item.product} not available` });
      }

      // Check if user is not the artist
      const artistProfile = await ArtistProfile.findById(artwork.artist_id);
      if (artistProfile && artistProfile.user_id.toString() === req.user._id.toString()) {
        return res.status(400).json({ success: false, message: 'Cannot order your own artwork' });
      }

      const split = calculateSplit((artwork.base_price ?? artwork.price) * item.quantity);
      totalAmount += split.buyerAmount;
      orderItems.push({
        product: item.product,
        quantity: item.quantity,
        split,
      });
    }

    // Create orders for each artwork (one order per artwork)
    const createdOrders = [];
    for (const item of orderItems) {
      const artwork = await Artwork.findById(item.product);
      const artistProfile = await resolveArtistProfile(artwork.artist_id);
      const artistUserId = artistProfile?.user_id || artwork.artist_id || null;
      
      const order = new Order({
        user_id: userId,
        artist_id: artistUserId,
        artwork_id: item.product,
        quantity: item.quantity,
        total_amount: item.split.buyerAmount,
        base_amount: item.split.base,
        buyer_amount: item.split.buyerAmount,
        commission_amount: item.split.commissionAmount,
        artist_amount: item.split.artistAmount,
        admin_amount: item.split.adminAmount,
        address: address,
        payment_type: paymentMethod ? 'Online' : 'COD',
        payment_provider: paymentMethod || 'COD',
        payment_status: paymentMethod ? 'paid' : 'pending',
        delivery_status: paymentMethod ? 'delivered' : 'pending',
        status: paymentMethod ? 'completed' : 'pending',
        shipping_address: address,
        split_applied: Boolean(paymentMethod)
      });

      await order.save();
      await order.populate('user_id', 'full_name email');
      await order.populate('artwork_id', 'title price category image_url medium');
      
      createdOrders.push(order);
    }

    // For online payment, simulate payment success
    if (paymentMethod) {
      res.json({ 
        success: true, 
        message: 'Order placed successfully with online payment', 
        orders: createdOrders,
        paymentSimulated: true
      });
    } else {
      res.json({ success: true, message: 'Order placed successfully', orders: createdOrders });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update order status
router.put('/:id', auth, [
  body('status').isIn(['pending', 'completed', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed: ' + errors.array().map(err => err.msg).join(', ') });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user can update this order
    if (req.user.user_type !== 'admin') {
      // For artists, check if they have artworks in this order
      const artistProfile = await ArtistProfile.findOne({ user_id: req.user._id });
      if (!artistProfile) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const hasArtworksInOrder = order.items.some(item =>
        item.product.artist_id.toString() === artistProfile._id.toString()
      );

      if (!hasArtworksInOrder) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    const oldStatus = order.status;
    const newStatus = req.body.status;

    const updatedOrder = await Order.findByIdAndUpdate(req.params.id, { status: newStatus }, { new: true })
      .populate('user_id', 'full_name email')
      .populate({
        path: 'items.product',
        select: 'title price category image_url medium'
      })
      .populate('address', 'firstName lastName street city state country phone');

    // Update total_sales for each artist in the order
    if (newStatus === 'completed' && oldStatus !== 'completed') {
      // Add to total_sales for each artist
      for (const item of order.items) {
        const artistProfile = await ArtistProfile.findById(item.product.artist_id);
        if (artistProfile) {
          await ArtistProfile.findByIdAndUpdate(artistProfile._id, {
            $inc: { total_sales: item.product.price * item.quantity }
          });
        }
      }
    } else if (newStatus === 'cancelled' && oldStatus === 'completed') {
      // Subtract from total_sales for each artist
      for (const item of order.items) {
        const artistProfile = await ArtistProfile.findById(item.product.artist_id);
        if (artistProfile) {
          await ArtistProfile.findByIdAndUpdate(artistProfile._id, {
            $inc: { total_sales: -(item.product.price * item.quantity) }
          });
        }
      }
    }

    // Emit socket update for this order
    try {
      const io = req.app?.locals?.io;
      const payload = {
        orderId: updatedOrder._id,
        status: updatedOrder.status,
        delivery_status: updatedOrder.delivery_status,
        tracking_id: updatedOrder.tracking_id || updatedOrder.trackingId || null,
        courier_name: updatedOrder.courier_name || null,
        updated_at: updatedOrder.updated_at || new Date(),
      };

      if (io) {
        // Room-based emit
        io.to(`order:${String(updatedOrder._id)}`).emit('order.updated', payload);
        // Global emit fallback
        io.emit('order.updated', payload);
      }
    } catch (e) {
      console.error('[ORDERS API] Socket emit failed:', e);
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order delivery status (Admin only)
router.put('/:id/delivery', auth, async (req, res) => {
  try {
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admin can update delivery status' });
    }

    const { delivery_status } = req.body;

    const normalizedDeliveryStatus = String(delivery_status || '').trim().toLowerCase().replace(/\s+/g, '_');
    const allowedDeliveryStatuses = ['pending', 'placed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'];

    if (!allowedDeliveryStatuses.includes(normalizedDeliveryStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Update delivery status
    order.delivery_status = normalizedDeliveryStatus;
    
    // If delivered, mark order as completed
    if (normalizedDeliveryStatus === 'delivered') {
      order.status = 'delivered';
    }
    
    await order.save();
    
    await order.populate('user_id', 'full_name email phone');
    await order.populate('artwork_id', 'title price category image_url medium');

    // Emit socket update for delivery status change
    try {
      const io = req.app?.locals?.io;
      const payload = {
        orderId: order._id,
        status: order.status,
        delivery_status: order.delivery_status,
        tracking_id: order.tracking_id || order.trackingId || null,
        courier_name: order.courier_name || null,
        updated_at: order.updated_at || new Date(),
      };

      if (io) {
        io.to(`order:${String(order._id)}`).emit('order.updated', payload);
        io.emit('order.updated', payload);
      }
    } catch (e) {
      console.error('[ORDERS API] Socket emit failed (delivery):', e);
    }

    res.json({ success: true, message: 'Delivery status updated', order });
  } catch (error) {
    console.error('[ORDERS API] Error updating delivery status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// Delete order
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only admin can delete orders
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
