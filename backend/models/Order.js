const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artwork',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
});

const orderSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  artist_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  artwork_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artwork',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  base_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  buyer_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  commission_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  artist_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  admin_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'delivered'],
    default: 'pending'
  },
  payment_type: {
    type: String,
    enum: ['COD', 'Online'],
    default: 'COD'
  },
  payment_status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  payment_provider: {
    type: String,
    enum: ['COD', 'Online', 'razorpay', 'stripe'],
    default: 'COD'
  },
  payment_reference: {
    type: String,
    default: ''
  },
  gateway_order_id: {
    type: String,
    default: ''
  },
  gateway_payment_id: {
    type: String,
    default: ''
  },
  gateway_signature: {
    type: String,
    default: ''
  },
  split_applied: {
    type: Boolean,
    default: false
  },
  delivery_status: {
    type: String,
    enum: ['pending', 'placed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'],
    default: 'pending'
  },
  shipping_address: {
    type: String,
    required: true
  },
  order_date: {
    type: Date,
    default: Date.now
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);
