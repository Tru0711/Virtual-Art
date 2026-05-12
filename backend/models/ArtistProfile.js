const mongoose = require('mongoose');

const artistProfileSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  artist_name: {
    type: String,
    required: true
  },
  profileImage: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    minlength: 200,
    maxlength: 300
  },
  email: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  portfolio_link: String,
  art_style: String,
  location: String,
  social_links: {
    type: Map,
    of: String
  },
  verification_badge: {
    type: Boolean,
    default: false
  },
  years_experience: {
    type: Number,
    default: 0
  },
  exhibitions: {
    type: Number,
    default: 0
  },
  awards_won: {
    type: Number,
    default: 0
  },
  artworks_sold: {
    type: Number,
    default: 0
  },
  total_sales: {
    type: Number,
    default: 0
  },
  avg_rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  total_reviews: {
    type: Number,
    default: 0
  },
  payment_info: {
    full_name: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    account_number: {
      type: String,
      default: ''
    },
    ifsc: {
      type: String,
      default: ''
    },
    bank_name: {
      type: String,
      default: ''
    },
    account_type: {
      type: String,
      enum: ['Savings', 'Current', ''],
      default: ''
    },
    pan_tax_id: {
      type: String,
      default: ''
    },
    is_completed: {
      type: Boolean,
      default: false
    },
    verified: {
      type: Boolean,
      default: false
    },
    updated_at: {
      type: Date,
      default: null
    }
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ArtistProfile', artistProfileSchema);
