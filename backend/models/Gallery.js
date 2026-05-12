const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  artist_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  theme_key: {
    type: String,
    default: 'modern'
  },
  model_key: {
    type: String,
    default: 'vr_gallery'
  },
  cover_image: {
    type: String,
    default: ''
  },
  layout: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  display_order: {
    type: Number,
    default: 0
  },
  is_default: {
    type: Boolean,
    default: false
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

gallerySchema.index({ artist_id: 1, slug: 1 }, { unique: true });

gallerySchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Gallery', gallerySchema);