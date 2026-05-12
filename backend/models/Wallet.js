const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  owner_type: {
    type: String,
    enum: ['artist', 'admin'],
    required: true,
  },
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  balance: {
    type: Number,
    default: 0,
  },
  total_credits: {
    type: Number,
    default: 0,
  },
  total_debits: {
    type: Number,
    default: 0,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

walletSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('Wallet', walletSchema);