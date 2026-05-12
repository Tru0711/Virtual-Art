const crypto = require('crypto');
const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const Artwork = require('../models/Artwork');
const Order = require('../models/Order');
const User = require('../models/User');
const ArtistProfile = require('../models/ArtistProfile');
const Wallet = require('../models/Wallet');
const PaymentTransaction = require('../models/PaymentTransaction');

const buyerMarkupPercent = Number(process.env.BUYER_MARKUP_PERCENT || 10);
const commissionPercent = Number(process.env.ADMIN_COMMISSION_PERCENT || 10);

const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

const isRazorpayTestMode = () => String(process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_test_');

const roundAmount = (amount) => Math.round(Number(amount || 0));

const getBasePrice = (artwork) => Number(artwork?.base_price ?? artwork?.price ?? 0);

const resolveArtistProfile = async (artistReference) => {
  if (!artistReference) {
    return null;
  }

  if (artistReference.user_id) {
    return artistReference;
  }

  const artistId = artistReference._id || artistReference;
  let artistProfile = null;

  if (mongoose.isValidObjectId(artistId)) {
    artistProfile = await ArtistProfile.findById(artistId);
    if (artistProfile) {
      return artistProfile;
    }

    artistProfile = await ArtistProfile.findOne({ user_id: artistId });
    if (artistProfile) {
      return artistProfile;
    }
  }

  return null;
};

const calculateSplit = (baseAmount) => {
  const base = roundAmount(baseAmount);
  const markupAmount = roundAmount((base * buyerMarkupPercent) / 100);
  const commissionAmount = roundAmount((base * commissionPercent) / 100);
  const buyerAmount = base + markupAmount;
  const artistAmount = Math.max(0, base - commissionAmount);
  const adminAmount = Math.max(0, buyerAmount - artistAmount);

  return {
    baseAmount: base,
    markupAmount,
    commissionAmount,
    buyerAmount,
    artistAmount,
    adminAmount,
  };
};

const validateCheckoutItems = async (req, items = []) => {
  const sanitizedItems = [];

  for (const item of items) {
    if (!item?.product || !mongoose.isValidObjectId(item.product)) {
      throw new Error('Invalid product in checkout items');
    }

    const quantity = Number(item.quantity || 1);
    if (!Number.isFinite(quantity) || quantity < 1) {
      throw new Error('Invalid quantity in checkout items');
    }

    const artwork = await Artwork.findById(item.product);
    if (!artwork || artwork.status !== 'published') {
      throw new Error(`Artwork ${item.product} is not available`);
    }

    const alreadyPurchased = Array.isArray(artwork.purchased_by)
      && artwork.purchased_by.some((entry) => entry.user_id?.toString() === req.user._id.toString());
    if (alreadyPurchased) {
      throw new Error(`Artwork ${item.product} is already purchased`);
    }

    const artistProfile = await resolveArtistProfile(artwork.artist_id);
    const artistUserId = artistProfile?.user_id || artwork.artist_id;

    if (artistUserId && artistUserId.toString() === req.user._id.toString()) {
      throw new Error('Cannot purchase your own artwork');
    }

    const baseAmount = getBasePrice(artwork) * quantity;
    const split = calculateSplit(baseAmount);

    sanitizedItems.push({
      artwork,
      artistUserId,
      artistName: artistProfile?.artist_name || '',
      quantity,
      ...split,
    });
  }

  return sanitizedItems;
};

const createCheckoutOrder = async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(500).json({ message: 'Razorpay is not configured' });
    }

    if (!isRazorpayTestMode()) {
      return res.status(400).json({ message: 'Razorpay test mode is required for this environment' });
    }

    const { items, address } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart items are required' });
    }

    const sanitizedItems = await validateCheckoutItems(req, items);
    const checkoutReference = crypto.randomBytes(10).toString('hex');
    const totalBuyerAmount = sanitizedItems.reduce((sum, item) => sum + item.buyerAmount, 0);

    const gatewayOrder = await razorpay.orders.create({
      amount: totalBuyerAmount * 100,
      currency: 'INR',
      receipt: `checkout_${checkoutReference}`,
      notes: {
        checkout_reference: checkoutReference,
        buyer_id: req.user._id.toString(),
      },
    });

    const transactions = await PaymentTransaction.insertMany(
      sanitizedItems.map((item) => ({
        checkout_reference: checkoutReference,
        buyer_id: req.user._id,
        artist_id: item.artistUserId,
        artwork_id: item.artwork._id,
        quantity: item.quantity,
        base_amount: item.baseAmount,
        buyer_amount: item.buyerAmount,
        commission_amount: item.commissionAmount,
        markup_amount: item.markupAmount,
        artist_amount: item.artistAmount,
        admin_amount: item.adminAmount,
        amount_paid: item.buyerAmount,
        total_paid: item.buyerAmount,
        artist_share: item.artistAmount,
        admin_share: item.adminAmount,
        currency: 'INR',
        gateway_order_id: gatewayOrder.id,
        status: 'initiated',
        shipping_address: address || '',
        metadata: {
          title: item.artwork.title,
          category: item.artwork.category,
          artist_name: item.artistName,
        },
      }))
    );

    console.info('[RAZORPAY][CREATE_ORDER]', {
      checkout_reference: checkoutReference,
      order_id: gatewayOrder.id,
      buyer_id: req.user._id.toString(),
      total_paid: totalBuyerAmount,
      split_preview: sanitizedItems.map((item) => ({
        artwork_id: item.artwork._id.toString(),
        title: item.artwork.title,
        base_amount: item.baseAmount,
        artist_share: item.artistAmount,
        admin_share: item.adminAmount,
      })),
    });

    return res.json({
      success: true,
      message: 'Razorpay checkout created',
      keyId: process.env.RAZORPAY_KEY_ID,
      currency: 'INR',
      gatewayOrder: {
        id: gatewayOrder.id,
        amount: gatewayOrder.amount,
        currency: gatewayOrder.currency,
      },
      checkout_reference: checkoutReference,
      amount_paid: totalBuyerAmount,
      buyer_markup_percent: buyerMarkupPercent,
      commission_percent: commissionPercent,
      items: sanitizedItems.map((item, index) => ({
        transactionId: transactions[index]._id,
        artwork_id: item.artwork._id,
        title: item.artwork.title,
        artist_name: item.artistName,
        quantity: item.quantity,
        base_amount: item.baseAmount,
        buyer_amount: item.buyerAmount,
        commission_amount: item.commissionAmount,
        markup_amount: item.markupAmount,
        artist_amount: item.artistAmount,
        admin_amount: item.adminAmount,
      })),
    });
  } catch (error) {
    console.error('Create Razorpay checkout error:', error);
    return res.status(400).json({ message: error.message || 'Failed to create checkout order' });
  }
};

const verifyCheckoutPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment verification fields' });
    }

    if (!isRazorpayTestMode()) {
      return res.status(400).json({ message: 'Razorpay test mode is required for verification' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(String(razorpay_signature), 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      await PaymentTransaction.updateMany(
        { gateway_order_id: razorpay_order_id, buyer_id: req.user._id, status: 'initiated' },
        {
          $set: {
            status: 'failed',
            metadata: {
              verification_error: 'invalid_signature',
              verification_at: new Date(),
            },
          },
        }
      );
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const transactions = await PaymentTransaction.find({
      gateway_order_id: razorpay_order_id,
      buyer_id: req.user._id,
    }).populate('artwork_id').populate('artist_id');

    console.info('[RAZORPAY][PAYMENT_SUCCESS]', {
      buyer_id: req.user._id.toString(),
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      transaction_count: transactions.length,
    });

    if (!transactions.length) {
      return res.status(404).json({ message: 'Checkout transaction not found' });
    }

    const existingPaid = transactions.every((transaction) => transaction.status === 'paid');
    if (existingPaid) {
      return res.json({
        success: true,
        message: 'Payment already processed',
        payment_id: razorpay_payment_id,
      });
    }

    const orders = [];
    const summaries = [];

    for (const transaction of transactions) {
      if (transaction.status === 'paid') {
        continue;
      }

      const artworkId = transaction.artwork_id?._id || transaction.artwork_id;
      const artistUserId = transaction.artist_id?._id || transaction.artist_id;

      transaction.gateway_payment_id = razorpay_payment_id;
      transaction.transaction_id = razorpay_payment_id;
      transaction.gateway_signature = razorpay_signature;
      transaction.status = 'paid';
      transaction.split_applied = true;
      transaction.payment_date = new Date();
      await transaction.save();

      const artwork = await Artwork.findById(artworkId);
      if (!artwork) {
        continue;
      }

      artwork.status = 'sold';
      artwork.purchased_by = artwork.purchased_by || [];
      artwork.purchased_by.push({ user_id: req.user._id, purchased_at: new Date() });
      await artwork.save();

      const artistProfile = await ArtistProfile.findOne({ user_id: artistUserId });
      const artistWallet = await Wallet.findOneAndUpdate(
        { owner_type: 'artist', owner_id: artistUserId },
        {
          $inc: { balance: transaction.artist_amount, total_credits: transaction.artist_amount },
          $set: { updated_at: new Date() },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      console.info('[RAZORPAY][ARTIST_TRANSFER_SUCCESS]', {
        payment_id: razorpay_payment_id,
        artist_id: artistUserId?.toString?.() || String(artistUserId),
        artwork_id: artworkId?.toString?.() || String(artworkId),
        amount: transaction.artist_amount,
        wallet_balance: artistWallet?.balance || 0,
      });

      const adminUser = await User.findOne({ user_type: 'admin' });
      const adminWallet = await Wallet.findOneAndUpdate(
        { owner_type: 'admin', owner_id: adminUser?._id || null },
        {
          $inc: { balance: transaction.admin_amount, total_credits: transaction.admin_amount },
          $set: { updated_at: new Date() },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      console.info('[RAZORPAY][ADMIN_TRANSFER_SUCCESS]', {
        payment_id: razorpay_payment_id,
        admin_id: adminUser?._id?.toString() || 'system-admin',
        artwork_id: artworkId?.toString?.() || String(artworkId),
        amount: transaction.admin_amount,
        wallet_balance: adminWallet?.balance || 0,
      });

      if (artistProfile) {
        await ArtistProfile.findByIdAndUpdate(artistProfile._id, {
          $inc: {
            artworks_sold: 1,
            total_sales: transaction.artist_amount,
          },
        });
      }

      const order = await Order.create({
        user_id: req.user._id,
        artist_id: artistUserId,
        artwork_id: artworkId,
        quantity: transaction.quantity,
        total_amount: transaction.buyer_amount,
        base_amount: transaction.base_amount,
        buyer_amount: transaction.buyer_amount,
        commission_amount: transaction.commission_amount,
        artist_amount: transaction.artist_amount,
        admin_amount: transaction.admin_amount,
        payment_type: 'Online',
        payment_provider: 'razorpay',
        payment_status: 'paid',
        payment_reference: razorpay_payment_id,
        gateway_order_id: razorpay_order_id,
        gateway_payment_id: razorpay_payment_id,
        gateway_signature: razorpay_signature,
        split_applied: true,
        status: 'completed',
        delivery_status: 'delivered',
        shipping_address: transaction.shipping_address || '',
      });

      transaction.order_id = order._id;
      await transaction.save();

      orders.push(order);
      summaries.push({
        payment_transaction_id: transaction._id,
        transaction_id: transaction.transaction_id || transaction.gateway_payment_id,
        order_date: transaction.payment_date || new Date(),
        artwork_id: artworkId,
        title: artwork.title,
        artist_name: artistProfile?.artist_name || transaction.metadata?.artist_name || '',
        amount_paid: transaction.buyer_amount,
        base_amount: transaction.base_amount,
        markup_amount: transaction.markup_amount,
        commission_amount: transaction.commission_amount,
        artist_amount: transaction.artist_amount,
        admin_amount: transaction.admin_amount,
      });
    }

    return res.json({
      success: true,
      message: 'Payment verified successfully',
      payment_id: razorpay_payment_id,
      razorpay_order_id,
      orders,
      items: summaries,
      order_date: summaries[0]?.order_date || new Date(),
      amount_paid: summaries.reduce((sum, item) => sum + item.amount_paid, 0),
    });
  } catch (error) {
    console.error('Verify Razorpay payment error:', error);
    return res.status(500).json({ message: 'Failed to verify payment' });
  }
};

const markCheckoutFailure = async (req, res) => {
  try {
    const { razorpay_order_id, status, reason } = req.body;

    if (!razorpay_order_id) {
      return res.status(400).json({ message: 'Missing Razorpay order id' });
    }

    const failureStatus = status === 'cancelled' ? 'cancelled' : 'failed';

    const update = await PaymentTransaction.updateMany(
      {
        gateway_order_id: razorpay_order_id,
        buyer_id: req.user._id,
        status: { $in: ['initiated', 'failed', 'cancelled'] },
      },
      {
        $set: {
          status: failureStatus,
          metadata: {
            failure_reason: reason || 'checkout_failed',
            failure_status: failureStatus,
            failed_at: new Date(),
          },
        },
      }
    );

    console.warn('[RAZORPAY][PAYMENT_FAILURE]', {
      buyer_id: req.user._id.toString(),
      order_id: razorpay_order_id,
      status: failureStatus,
      reason: reason || 'checkout_failed',
      modified_count: update.modifiedCount,
    });

    return res.json({
      success: true,
      message: 'Payment failure recorded',
      status: failureStatus,
    });
  } catch (error) {
    console.error('Mark checkout failure error:', error);
    return res.status(500).json({ message: 'Failed to record payment failure' });
  }
};

const getArtistWallet = async (req, res) => {
  try {
    const artistProfile = await ArtistProfile.findOne({ user_id: req.user._id });
    if (!artistProfile) {
      return res.status(404).json({ message: 'Artist profile not found' });
    }

    const wallet = await Wallet.findOne({ owner_type: 'artist', owner_id: req.user._id });
    const transactions = await PaymentTransaction.find({ artist_id: req.user._id })
      .sort({ created_at: -1 })
      .populate('artwork_id', 'title image_url price')
      .populate('buyer_id', 'full_name email');

    const totalEarnings = transactions
      .filter((transaction) => transaction.status === 'paid')
      .reduce((sum, transaction) => sum + Number(transaction.artist_amount || transaction.artist_share || 0), 0);

    const pendingAmount = transactions
      .filter((transaction) => transaction.status === 'initiated')
      .reduce((sum, transaction) => sum + Number(transaction.artist_amount || transaction.artist_share || 0), 0);

    const totalSoldArtworks = transactions.filter((transaction) => transaction.status === 'paid').length;

    return res.json({
      success: true,
      wallet: wallet || { balance: 0, total_credits: 0, total_debits: 0, currency: 'INR' },
      transactions,
      summary: {
        total_earnings: totalEarnings,
        pending_amount: pendingAmount,
        total_sold_artworks: totalSoldArtworks,
      },
    });
  } catch (error) {
    console.error('Get artist wallet error:', error);
    return res.status(500).json({ message: 'Failed to load wallet data' });
  }
};

module.exports = {
  createCheckoutOrder,
  verifyCheckoutPayment,
  markCheckoutFailure,
  getArtistWallet,
};