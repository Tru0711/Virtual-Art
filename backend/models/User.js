const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  user_type: {
    type: String,
    enum: ['artist', 'user', 'admin'],
    required: true
  },
  full_name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  phone: String,
  profile_picture: String,
  signatureImage: String,
  address: String,
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  dateOfBirth: Date,
  city: String,
  state: String,
  country: String,
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  tokenVersion: {
    type: Number,
    default: 0
  },
  payment_preferences: {
    preferred_method: {
      type: String,
      enum: ['UPI', 'Card', 'Net Banking', 'Wallet', ''],
      default: ''
    },
    masked_identifier: {
      type: String,
      default: ''
    },
    updated_at: {
      type: Date,
      default: null
    }
  }
});

module.exports = mongoose.model('User', userSchema);
