const mongoose = require('mongoose');

const artworkSchema = new mongoose.Schema({
  artist_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gallery_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gallery',
    default: null,
    index: true
  },
  gallery_name: {
    type: String,
    default: ''
  },
  gallery_slug: {
    type: String,
    default: '',
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    required: true
  },
  medium: String,
  price: {
    type: Number,
    required: true,
    min: 0
  },
  base_price: {
    type: Number,
    default: null,
    min: 0
  },
  // Painting dimensions (width x height)
  width: {
    type: Number,
    default: null
  },
  height: {
    type: Number,
    default: null
  },
  dimension_unit: {
    type: String,
    enum: ['cm', 'm', 'in', 'ft'],
    default: 'cm'
  },
  image_url: {
    type: String,
    required: true
  },
  original_image_url: {
    type: String,
    default: ''
  },
  watermarked_image_url: {
    type: String,
    default: ''
  },
  originalImage: {
    type: String
  },
  watermarkedImage: {
    type: String
  },
  position: {
    x: { type: Number, default: null },
    y: { type: Number, default: null },
    z: { type: Number, default: null },
    rotationY: { type: Number, default: null },
    scale: { type: Number, default: null },
    wall: { type: String, default: '' },
    row: { type: Number, default: null },
    column: { type: Number, default: null }
  },
  frameStyle: {
    type: String,
    enum: ['classic', 'modern', 'floating', 'minimal'],
    default: 'classic'
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  imageHash: {
    type: String,
    required: true
  },
  sha256Hash: {
    type: String,
    required: true
  },
  perceptualHash: {
    type: String
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  tags: [String],
  size: {
    type: String,
    enum: ['small', 'medium', 'large']
  },
  status: {
    type: String,
    enum: ['pending', 'published', 'sold', 'rejected'],
    default: 'pending'
  },
  approval_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejected_reason: String,
  rejected_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  purchased_by: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    purchased_at: {
      type: Date,
      default: Date.now
    }
  }],
  likes_count: {
    type: Number,
    default: 0
  },
  views_count: {
    type: Number,
    default: 0
  },
  // Rating fields
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
  created_at: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient duplicate detection
artworkSchema.index({ imageHash: 1 }, { unique: true });
artworkSchema.index({ sha256Hash: 1 }, { unique: true, sparse: true });
artworkSchema.index({ perceptualHash: 1 });
artworkSchema.index({ artist_id: 1, created_at: -1 });
artworkSchema.index({ gallery_id: 1, displayOrder: 1, created_at: -1 });

artworkSchema.virtual('artistId').get(function() {
  return this.artist_id;
});

artworkSchema.virtual('galleryId').get(function() {
  return this.gallery_id;
});

artworkSchema.set('toJSON', { virtuals: true });
artworkSchema.set('toObject', { virtuals: true });

// Virtual for formatted size
artworkSchema.virtual('formattedSize').get(function() {
  if (this.width && this.height) {
    return `${this.width} × ${this.height} ${this.dimension_unit || 'cm'}`;
  }
  return this.size || 'Not specified';
});

// Update timestamp on save
artworkSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Artwork', artworkSchema);
