const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  checkout_reference: {
    type: String,
    required: true,
    index: true,
  },
  buyer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  artist_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  artwork_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artwork',
    required: true,
  },
  order_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  base_amount: {
    type: Number,
    required: true,
  },
  buyer_amount: {
    type: Number,
    required: true,
  },
  commission_amount: {
    type: Number,
    required: true,
  },
  markup_amount: {
    type: Number,
    required: true,
  },
  artist_amount: {
    type: Number,
    required: true,
  },
  admin_amount: {
    type: Number,
    required: true,
  },
  amount_paid: {
    type: Number,
    required: true,
  },
  total_paid: {
    type: Number,
    default: 0,
  },
  artist_share: {
    type: Number,
    default: 0,
  },
  admin_share: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  gateway_order_id: {
    type: String,
    default: '',
    index: true,
  },
  gateway_payment_id: {
    type: String,
    default: '',
  },
  transaction_id: {
    type: String,
    default: '',
    index: true,
  },
  gateway_signature: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['initiated', 'paid', 'failed', 'cancelled', 'refunded'],
    default: 'initiated',
  },
  payment_date: {
    type: Date,
    default: null,
  },
  split_applied: {
    type: Boolean,
    default: false,
  },
  shipping_address: {
    type: String,
    default: '',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

paymentTransactionSchema.pre('save', function(next) {
  this.total_paid = Number(this.amount_paid || this.buyer_amount || 0);
  this.artist_share = Number(this.artist_amount || 0);
  this.admin_share = Number(this.admin_amount || 0);
  this.transaction_id = this.gateway_payment_id || this.transaction_id || '';

  if (this.status === 'paid' && !this.payment_date) {
    this.payment_date = new Date();
  }

  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);