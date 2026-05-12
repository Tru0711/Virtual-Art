const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const fs = require('fs').promises;
const http = require('http');
const https = require('https');
const path = require('path');
const sharp = require('sharp');
const Artwork = require('../models/Artwork');
const Gallery = require('../models/Gallery');
const Order = require('../models/Order');
const ArtistProfile = require('../models/ArtistProfile');
const User = require('../models/User');
const Review = require('../models/Review');
const { auth } = require('../middleware/auth');
const { checkPaymentInfoRequired } = require('../middleware/checkPaymentInfo');
const upload = require('../middleware/upload');
const { generateSHA256Hash, generateNormalizedSHA256Hash, generatePerceptualHash, calculateHashSimilarity } = require('../utils/imageHash');
const { detectWatermarkedText } = require('../utils/textDetection');
const { generateWatermarkedPreview } = require('../utils/watermark');

const router = express.Router();

const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES || 5242880);
const MAX_IMAGE_REDIRECTS = 3;

const toAbsoluteUrl = (req, value) => {
  if (!value) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  const clean = value.startsWith('/') ? value : `/${value}`;
  return `${req.protocol}://${req.get('host')}${clean}`;
};

const normalizeArtworkImages = (req, artwork) => {
  const data = artwork.toObject ? artwork.toObject() : { ...artwork };
  const imgUrl = data.image_url || data.watermarked_image_url || data.watermarkedImage;
  const watermarkedUrl = data.watermarked_image_url || data.watermarkedImage || data.image_url;
  const originalUrl = data.original_image_url || data.originalImage || imgUrl;
  data.image_url = toAbsoluteUrl(req, imgUrl);
  data.watermarked_image_url = toAbsoluteUrl(req, watermarkedUrl);
  data.original_image_url = toAbsoluteUrl(req, originalUrl);
  if (!data.image_url) data.image_url = data.watermarked_image_url;
  const rawArtistId = data.artist_id?._id || data.artist_id;
  const rawGalleryId = data.gallery_id?._id || data.gallery_id || null;
  data.artistId = rawArtistId || data.artistId || null;
  data.galleryId = rawGalleryId || data.galleryId || null;
  data.gallery_slug = data.gallery_slug || data.gallerySlug || data.gallery_id?.slug || '';
  data.gallery_name = data.gallery_name || data.galleryName || data.gallery_id?.name || '';
  data.frameStyle = data.frameStyle || 'classic';
  return data;
};

const normalizeGalleryToken = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const humanizeGalleryName = (value) => {
  const text = String(value || '').trim().replace(/[_-]+/g, ' ');
  return text.replace(/\s+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()) || 'Gallery';
};

const hashToken = (value) => Array.from(String(value || '')).reduce(
  (sum, character) => sum + character.charCodeAt(0),
  0
);

const pickThemeKey = (slug) => {
  const normalized = normalizeGalleryToken(slug);
  if (normalized.includes('nature') || normalized.includes('garden') || normalized.includes('forest')) return 'nature';
  if (normalized.includes('abstract') || normalized.includes('color')) return 'abstract';
  if (normalized.includes('crypto') || normalized.includes('neon')) return 'crypto';
  if (normalized.includes('round') || normalized.includes('circle')) return 'round';
  if (normalized.includes('showcase') || normalized.includes('presentation')) return 'showcase';
  if (normalized.includes('classic') || normalized.includes('heritage')) return 'classic';
  const themes = ['modern', 'nature', 'abstract', 'classic', 'crypto', 'round', 'showcase'];
  return themes[hashToken(normalized) % themes.length];
};

const pickFrameStyle = (themeKey) => {
  if (themeKey === 'nature') return 'floating';
  if (themeKey === 'crypto') return 'modern';
  if (themeKey === 'abstract') return 'minimal';
  if (themeKey === 'round') return 'modern';
  if (themeKey === 'showcase') return 'classic';
  return 'classic';
};

const resolveGalleryAssignment = async (artistId, payload = {}) => {
  const explicitGalleryId = payload.gallery_id && mongoose.Types.ObjectId.isValid(payload.gallery_id)
    ? payload.gallery_id
    : null;

  if (explicitGalleryId) {
    const galleryDoc = await Gallery.findById(explicitGalleryId).lean();
    if (galleryDoc) {
      const themeKey = galleryDoc.theme_key || pickThemeKey(galleryDoc.slug || galleryDoc.name);
      return {
        galleryId: galleryDoc._id,
        galleryName: galleryDoc.name,
        gallerySlug: galleryDoc.slug,
        themeKey,
        frameStyle: payload.frameStyle || pickFrameStyle(themeKey),
      };
    }
  }

  const rawGalleryName = payload.gallery_name
    || payload.galleryName
    || payload.gallery_slug
    || payload.gallerySlug
    || payload.gallery
    || payload.collection
    || payload.category
    || 'featured-gallery';
  const gallerySlug = normalizeGalleryToken(rawGalleryName);
  const galleryName = payload.gallery_name || payload.galleryName || humanizeGalleryName(rawGalleryName);
  const themeKey = pickThemeKey(gallerySlug);

  let galleryDoc = await Gallery.findOne({ artist_id: artistId, slug: gallerySlug });
  if (!galleryDoc) {
    galleryDoc = await Gallery.create({
      artist_id: artistId,
      name: galleryName,
      slug: gallerySlug,
      description: payload.gallery_description || payload.galleryDescription || '',
      theme_key: themeKey,
      model_key: payload.model_key || payload.modelKey || 'vr_gallery',
      is_default: Boolean(payload.is_default || payload.isDefault),
      layout: payload.layout || {},
    });
  }

  return {
    galleryId: galleryDoc._id,
    galleryName: galleryDoc.name,
    gallerySlug: galleryDoc.slug,
    themeKey: galleryDoc.theme_key || themeKey,
    frameStyle: payload.frameStyle || pickFrameStyle(galleryDoc.theme_key || themeKey),
  };
};

// Public route to get all published artworks (no auth required)
router.get('/public', async (req, res) => {
  try {
    const { category, artist_id } = req.query;
    const query = { status: 'published' };
    if (category) query.category = category;
    if (artist_id) query.artist_id = artist_id;
    
    console.log('Public artworks query:', query);
    const artworks = await Artwork.find(query)
      .select('-original_image_url -originalImage -originalImagePath')
      .populate('artist_id', 'full_name')
      .sort({ created_at: -1 });
    
    console.log('Found public artworks:', artworks.length);
    
    // Enrich artworks with artist names from profiles (artist_id can ref User or ArtistProfile)
    const enrichedArtworks = await Promise.all(
      artworks.map(async (artwork) => {
        const artworkObj = normalizeArtworkImages(req, artwork);
        const rawArtistId = artwork.artist_id?._id || artwork.artist_id;

        if (rawArtistId) {
          let resolvedArtistName = null;
          
          // First, check if artist_id is an ArtistProfile reference (not User)
          // The populate with 'full_name' might not work if artist_id points to ArtistProfile
          const artistProfile = await ArtistProfile.findById(rawArtistId);
          
          if (artistProfile) {
            // artist_id is an ArtistProfile ObjectId
            resolvedArtistName = artistProfile.artist_name;
          } else {
            // Try to find as User
            const user = await User.findById(rawArtistId);
            resolvedArtistName = user?.full_name;
          }
          
          // Also check if populated artist_id has full_name (for User references)
          if (!resolvedArtistName && artwork.artist_id && typeof artwork.artist_id === 'object' && artwork.artist_id.full_name) {
            resolvedArtistName = artwork.artist_id.full_name;
          }
          
          if (resolvedArtistName) {
            artworkObj.artist_name = resolvedArtistName;
            artworkObj.artist_id = artworkObj.artist_id && typeof artworkObj.artist_id === 'object'
              ? { ...artworkObj.artist_id, artist_name: resolvedArtistName }
              : { _id: rawArtistId, artist_name: resolvedArtistName };
          }
        }

        // Add rating information
        const reviews = await Review.find({ artwork_id: artwork._id });
        if (reviews && reviews.length > 0) {
          const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
          const avgRating = totalRating / reviews.length;
          artworkObj.avg_rating = Math.round(avgRating * 10) / 10;
          artworkObj.total_reviews = reviews.length;
        } else {
          artworkObj.avg_rating = 0;
          artworkObj.total_reviews = 0;
        }

        return artworkObj;
      })
    );
    
    res.json(enrichedArtworks);
  } catch (error) {
    console.error('Error fetching public artworks:', error);
    res.status(500).json({ message: error.message });
  }
});

// Public route to get a single published artwork by ID (no auth required)
router.get('/public/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    const artwork = await Artwork.findById(id)
      .select('-original_image_url -originalImage -originalImagePath')
      .populate('artist_id', 'full_name');

    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    // Only allow access if artwork is published or has no explicit status
    if (artwork.status && artwork.status !== 'published') {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    const artworkObj = normalizeArtworkImages(req, artwork);
    const rawArtistId = artwork.artist_id?._id || artwork.artist_id;

    // Resolve artist name similar to /public list
    if (rawArtistId) {
      let resolvedArtistName = null;

      const artistProfile = await ArtistProfile.findById(rawArtistId);
      if (artistProfile) {
        resolvedArtistName = artistProfile.artist_name;
      } else {
        const user = await User.findById(rawArtistId);
        resolvedArtistName = user?.full_name;
      }

      if (!resolvedArtistName && artwork.artist_id && typeof artwork.artist_id === 'object' && artwork.artist_id.full_name) {
        resolvedArtistName = artwork.artist_id.full_name;
      }

      if (resolvedArtistName) {
        artworkObj.artist_name = resolvedArtistName;
        artworkObj.artist_id = artworkObj.artist_id && typeof artworkObj.artist_id === 'object'
          ? { ...artworkObj.artist_id, artist_name: resolvedArtistName }
          : { _id: rawArtistId, artist_name: resolvedArtistName };
      }
    }

    // Attach rating information
    const reviews = await Review.find({ artwork_id: artwork._id });
    if (reviews && reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const avgRating = totalRating / reviews.length;
      artworkObj.avg_rating = Math.round(avgRating * 10) / 10;
      artworkObj.total_reviews = reviews.length;
    } else {
      artworkObj.avg_rating = 0;
      artworkObj.total_reviews = 0;
    }

    res.json(artworkObj);
  } catch (error) {
    console.error('Error fetching public artwork by id:', error);
    res.status(500).json({ message: error.message });
  }
});

const downloadImageBuffer = (imageUrl, redirectCount = 0) => new Promise((resolve, reject) => {
  try {
    const url = new URL(imageUrl);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.get(url, (res) => {
      const statusCode = res.statusCode || 0;

      if (statusCode >= 300 && statusCode < 400 && res.headers.location && redirectCount < MAX_IMAGE_REDIRECTS) {
        res.resume();
        resolve(downloadImageBuffer(res.headers.location, redirectCount + 1));
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        res.resume();
        reject(new Error('Failed to download image'));
        return;
      }

      const chunks = [];
      let size = 0;

      res.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_IMAGE_BYTES) {
          req.destroy(new Error('Image too large'));
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy(new Error('Image download timeout'));
    });
  } catch (error) {
    reject(error);
  }
});

// Get all artworks (published or own)
router.get('/', auth, async (req, res) => {
  try {
    const { status, category, artist_id } = req.query;
    let query = {};

    if (status) query.status = status;
    if (category) query.category = category;

    // If not admin, only show published artworks or own artworks
    if (req.user.user_type !== 'admin') {
      if (artist_id) {
        // If specific artist_id requested, check if it's the user's own
        const artistProfile = await ArtistProfile.findOne({ user_id: req.user._id });
        const isOwnArtist = req.user._id.toString() === artist_id || (artistProfile && artistProfile._id.toString() === artist_id);

        if (isOwnArtist) {
          // Show own artworks, all statuses - include both user_id and artist_profile_id if exists
          const artistIds = [req.user._id];
          if (artistProfile) artistIds.push(artistProfile._id);
          query.artist_id = { $in: artistIds };
        } else {
          // Show only published artworks of that artist
          query.artist_id = artist_id;
          query.status = 'published';
        }
      } else {
        // No specific artist, show published or own
        const artistProfile = await ArtistProfile.findOne({ user_id: req.user._id });
        if (artistProfile) {
          query.$or = [
            { status: 'published' },
            { artist_id: artistProfile._id },
            { artist_id: req.user._id }
          ];
        } else {
          query.$or = [
            { status: 'published' },
            { artist_id: req.user._id }
          ];
        }
      }
    } else {
      // Admin can see all
      if (artist_id) {
        query.$or = [
          { artist_id: artist_id },
          { artist_id: req.user._id }
        ];
      }
    }

    console.log('Artwork query:', query);
    const artworks = await Artwork.find(query)
      .select('-original_image_url -originalImage -originalImagePath')
      .populate('artist_id', 'full_name')
      .populate('gallery_id', 'name slug description theme_key model_key cover_image layout display_order is_default');
    console.log('Found artworks:', artworks.length);
    res.json(artworks.map(artwork => normalizeArtworkImages(req, artwork)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get my artworks (for artist dashboard)
router.get('/my-artworks', auth, async (req, res) => {
  try {
    const artistProfiles = await ArtistProfile.find({ user_id: req.user._id });
    const artistIds = [
      new mongoose.Types.ObjectId(req.user._id.toString()),
      ...artistProfiles.map((p) => new mongoose.Types.ObjectId(p._id.toString())),
    ];

    const query = { artist_id: { $in: artistIds } };

    console.log('My artworks query:', JSON.stringify(query));
    console.log('User ID:', req.user._id);
    console.log('Artist IDs (user + profiles):', artistIds.length);

    const artworks = await Artwork.find(query)
      .select('-original_image_url -originalImage -originalImagePath')
      .populate('artist_id', 'full_name')
      .populate('gallery_id', 'name slug description theme_key model_key cover_image layout display_order is_default')
      .sort({ created_at: -1 })
      .lean();
    console.log('Found my artworks:', artworks.length);

    const enriched = artworks.map((artwork) => {
      const obj = normalizeArtworkImages(req, artwork);
      const rawArtistId = artwork.artist_id?._id || artwork.artist_id;
      if (rawArtistId) {
        let name = artwork.artist_id?.full_name;
        if (!name) {
          const profile = artistProfiles.find((p) => p._id.toString() === rawArtistId.toString());
          if (profile) name = profile.artist_name;
        }
        if (!name) {
          if (rawArtistId.toString() === req.user._id.toString()) {
            name = req.user.full_name;
          }
        }
        obj.artist_name = name || 'Artist';
      }
      return obj;
    });
    res.json(enriched);
  } catch (error) {
    console.error('Error fetching my artworks:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get artwork by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id)
      .select('-original_image_url -originalImage -originalImagePath')
      .populate('artist_id', 'full_name')
      .populate('gallery_id', 'name slug description theme_key model_key cover_image layout display_order is_default');
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    // Check if user can view this artwork
    let canView = false;
    if (artwork.status === 'published') {
      canView = true;
    } else if (req.user.user_type === 'admin') {
      canView = true;
    } else {
      // Check if user is the artist
      const artistProfile = await ArtistProfile.findOne({ user_id: req.user._id });
      const userArtistIds = [req.user._id];
      if (artistProfile) userArtistIds.push(artistProfile._id);
      if (userArtistIds.some(id => id.toString() === artwork.artist_id._id.toString())) {
        canView = true;
      }
    }

    if (!canView) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(normalizeArtworkImages(req, artwork));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create artwork
router.post('/', auth, [
  body('title').notEmpty(),
  body('category').notEmpty(),
  body('price').isNumeric().isFloat({ min: 0 }),
  body('image_url').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user is an artist
    if (req.user.user_type !== 'artist') {
      return res.status(403).json({ message: 'Only artists can create artworks' });
    }

    const artistProfile = await ArtistProfile.findOne({ user_id: req.user._id });
    let artistId = artistProfile?._id;
    const galleryContext = await resolveGalleryAssignment(req.user._id, req.body);

    // If no artist profile exists, use user ID directly
    if (!artistProfile) {
      artistId = req.user._id;
      console.log('Using user ID as artist ID:', artistId);
    } else {
      artistId = artistProfile._id;
    }

    const imageUrl = req.body.image_url;
    const fileBuffer = await downloadImageBuffer(imageUrl);
    const imageMeta = await sharp(fileBuffer).metadata();
    const allowedFormats = new Set(['jpeg', 'png', 'webp']);
    if (!allowedFormats.has(imageMeta.format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image type. Only jpg, jpeg, png, webp allowed.'
      });
    }

    const sha256Hash = generateSHA256Hash(fileBuffer);
    const imageHash = await generateNormalizedSHA256Hash(fileBuffer);
    console.log('Generated SHA-256 hash:', sha256Hash);

    const perceptualHash = await generatePerceptualHash(fileBuffer);
    console.log('Generated perceptual hash:', perceptualHash || 'N/A');

    const exactDuplicate = await Artwork.findOne({ $or: [{ sha256Hash }, { imageHash }] })
      .select('_id artist_id');
    if (exactDuplicate) {
      return res.status(409).json({
        success: false,
        errorType: 'DUPLICATE_IMAGE',
        message: 'Duplicate artwork detected.'
      });
    }

    if (perceptualHash) {
      const minSimilarity = Number(process.env.IMAGE_SIMILARITY_MIN || 0.9);
      const allArtworks = await Artwork.find({ perceptualHash: { $exists: true, $ne: null } })
        .select('perceptualHash artist_id')
        .limit(2000);

      for (const artwork of allArtworks) {
        const similarity = calculateHashSimilarity(perceptualHash, artwork.perceptualHash);
        if (similarity >= minSimilarity) {
          const isDifferentArtist = artwork.artist_id?.toString() !== artistId?.toString();
          return res.status(409).json({
            success: false,
            errorType: 'DUPLICATE_IMAGE',
            message: isDifferentArtist
              ? 'Similar artwork already exists.'
              : 'Similar artwork already exists.'
          });
        }
      }
    }

    const watermarkScan = await detectWatermarkedText(fileBuffer);
    if (watermarkScan.hasKeyword || watermarkScan.hasLargeTextOverlay || watermarkScan.cornerTextDetected) {
      return res.status(422).json({
        success: false,
        errorType: 'WATERMARK_DETECTED',
        message: 'Watermarked or copyrighted images are not allowed.'
      });
    }

    // Create artwork with published status by default
    const artwork = new Artwork({
      ...req.body,
      artist_id: artistId,
      gallery_id: galleryContext.galleryId,
      gallery_name: galleryContext.galleryName,
      gallery_slug: galleryContext.gallerySlug,
      frameStyle: req.body.frameStyle || galleryContext.frameStyle,
      imageHash,
      sha256Hash,
      perceptualHash,
      status: req.body.status || 'published' // Default to published for immediate visibility
    });

    await artwork.save();

    // Only populate and update count if artist profile exists
    if (artistProfile) {
      await artwork.populate('artist_id', 'full_name');
      await artwork.populate('gallery_id', 'name slug description theme_key model_key cover_image layout display_order is_default');
      // Update artist's artworks_sold count
      await ArtistProfile.findByIdAndUpdate(artistProfile._id, {
        $inc: { artworks_sold: 1 }
      });
    } else {
      // Populate with user full_name if no artist profile
      await artwork.populate('artist_id', 'full_name');
      await artwork.populate('gallery_id', 'name slug description theme_key model_key cover_image layout display_order is_default');
    }

    res.status(201).json(artwork);
  } catch (error) {
    if (error.code === 11000 && (error.keyPattern?.imageHash || error.keyValue?.imageHash || error.keyPattern?.sha256Hash || error.keyValue?.sha256Hash)) {
      return res.status(409).json({
        success: false,
        errorType: 'DUPLICATE_IMAGE',
        message: 'Duplicate artwork detected.'
      });
    }

    res.status(500).json({ message: error.message });
  }
});

// Update artwork
router.put('/:id', auth, [
  body('title').optional().notEmpty(),
  body('category').optional().notEmpty(),
  body('price').optional().isNumeric().isFloat({ min: 0 }),
  body('image_url').optional().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const artwork = await Artwork.findById(req.params.id);
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    // Check if user can update this artwork
    let canUpdate = false;
    if (req.user.user_type === 'admin') {
      canUpdate = true;
    } else {
      // Check if user is the artist
      const artistProfile = await ArtistProfile.findOne({ user_id: req.user._id });
      const userArtistIds = [req.user._id];
      if (artistProfile) userArtistIds.push(artistProfile._id);
      if (userArtistIds.some(id => id.toString() === artwork.artist_id.toString())) {
        canUpdate = true;
      }
    }

    if (!canUpdate) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updates = req.body;
    updates.updated_at = new Date();
    if (typeof updates.price !== 'undefined') {
      updates.base_price = updates.price;
    }

    if (updates.gallery_id || updates.gallery_slug || updates.gallerySlug || updates.gallery_name || updates.galleryName || updates.gallery || updates.collection || updates.category) {
      const galleryContext = await resolveGalleryAssignment(req.user._id, updates);
      updates.gallery_id = galleryContext.galleryId;
      updates.gallery_name = galleryContext.galleryName;
      updates.gallery_slug = galleryContext.gallerySlug;
      updates.frameStyle = updates.frameStyle || galleryContext.frameStyle;
    }

    const updatedArtwork = await Artwork.findByIdAndUpdate(req.params.id, updates, { new: true })
      .select('-original_image_url -originalImage -originalImagePath')
      .populate('artist_id', 'full_name')
      .populate('gallery_id', 'name slug description theme_key model_key cover_image layout display_order is_default');
    res.json(updatedArtwork);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete artwork
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('Delete request for artwork:', req.params.id);
    console.log('User:', req.user._id, req.user.user_type);

    const artwork = await Artwork.findById(req.params.id).populate('artist_id');
    if (!artwork) {
      console.log('Artwork not found');
      return res.status(404).json({ message: 'Artwork not found' });
    }

    console.log('Artwork artist_id:', artwork.artist_id);

    // Check if user can delete this artwork
    let canDelete = false;
    if (req.user.user_type === 'admin') {
      canDelete = true;
      console.log('User is admin, can delete');
    } else if (artwork.artist_id) {
      // Check if user is the artist
      const artistProfile = await ArtistProfile.findOne({ user_id: req.user._id });
      console.log('Artist profile found:', artistProfile ? artistProfile._id : 'None');

      const userArtistIds = [req.user._id];
      if (artistProfile) userArtistIds.push(artistProfile._id);

      console.log('userArtistIds:', userArtistIds.map(id => id.toString()));
      console.log('artwork.artist_id:', artwork.artist_id);

      // Safely handle both populated and non-populated artist_id
      const artworkArtistId = artwork.artist_id && artwork.artist_id._id 
        ? artwork.artist_id._id.toString() 
        : artwork.artist_id ? artwork.artist_id.toString() : null;

      if (artworkArtistId && userArtistIds.some(id => id.toString() === artworkArtistId)) {
        canDelete = true;
        console.log('User is the artist, can delete');
      } else {
        console.log('User is not the artist, cannot delete');
      }
    } else {
      console.log('Artwork has no artist_id, checking if orphaned artwork');
      // If artwork has no artist_id, allow deletion for authenticated users (orphaned artwork)
      canDelete = true;
    }

    if (!canDelete) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get the artist profile to decrement artworks_sold count (only if artist_id exists)
    if (artwork.artist_id) {
      const artistIdToUse = artwork.artist_id._id ? artwork.artist_id._id : artwork.artist_id;
      const artistProfile = await ArtistProfile.findById(artistIdToUse);
      if (artistProfile && artistProfile.artworks_sold > 0) {
        await ArtistProfile.findByIdAndUpdate(artistIdToUse, {
          $inc: { artworks_sold: -1 }
        });
      }
    }

    await Artwork.findByIdAndDelete(req.params.id);
    res.json({ message: 'Artwork deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload artwork with image
router.post('/upload', auth, checkPaymentInfoRequired, upload.artworkUpload.single('image'), async (req, res) => {
  console.log('Upload request received');
  console.log('User:', req.user);
  console.log('Body:', req.body);
  console.log('File:', req.file);

  let uploadedFilePath = null;

  try {
    // Check if file was uploaded
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ 
        success: false,
        message: 'No image file provided' 
      });
    }

    uploadedFilePath = req.file.path;

    // Simple validation
    if (!req.body.title || !req.body.category || !req.body.price) {
      console.log('Validation failed: missing fields');
      // Clean up uploaded file
      await fs.unlink(uploadedFilePath).catch(err => console.error('Error deleting file:', err));
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields: title, category, price' 
      });
    }

    // Check if user is an artist
    if (req.user.user_type !== 'artist') {
      console.log('User is not an artist');
      // Clean up uploaded file
      await fs.unlink(uploadedFilePath).catch(err => console.error('Error deleting file:', err));
      return res.status(403).json({ 
        success: false,
        message: 'Only artists can upload artworks' 
      });
    }

    // === DUPLICATE DETECTION ===
    console.log('Starting duplicate detection...');

    const fileBuffer = req.file.buffer ? req.file.buffer : await fs.readFile(uploadedFilePath);
    const imageMeta = await sharp(fileBuffer).metadata();
    const allowedFormats = new Set(['jpeg', 'png', 'webp']);
    if (!allowedFormats.has(imageMeta.format)) {
      await fs.unlink(uploadedFilePath).catch(err => console.error('Error deleting file:', err));
      return res.status(400).json({
        success: false,
        message: 'Invalid image type. Only jpg, jpeg, png, webp allowed.'
      });
    }

    const sha256Hash = generateSHA256Hash(fileBuffer);
    const imageHash = await generateNormalizedSHA256Hash(fileBuffer);
    console.log('Generated SHA-256 hash:', sha256Hash);

    const perceptualHash = await generatePerceptualHash(fileBuffer);
    console.log('Generated perceptual hash:', perceptualHash || 'N/A');

    const artistProfile = await ArtistProfile.findOne({ user_id: req.user._id });
    console.log('Artist profile found:', artistProfile);

    let artistId;
    if (artistProfile) {
      artistId = artistProfile._id;
    } else {
      console.log('No artist profile found, using user ID as artist ID');
      artistId = req.user._id;
    }

    const exactDuplicate = await Artwork.findOne({ $or: [{ sha256Hash }, { imageHash }] })
      .select('_id title created_at artist_id');
    if (exactDuplicate) {
      console.log('Exact duplicate detected:', exactDuplicate._id, 'hash:', imageHash);
      await fs.unlink(uploadedFilePath).catch(err => console.error('Error deleting file:', err));

      return res.status(409).json({
        success: false,
        errorType: 'DUPLICATE_IMAGE',
        message: 'Duplicate artwork detected.'
      });
    }

    if (perceptualHash) {
      const minSimilarity = Number(process.env.IMAGE_SIMILARITY_MIN || 0.9);
      const allArtworks = await Artwork.find({ perceptualHash: { $exists: true, $ne: null } })
        .select('perceptualHash artist_id')
        .limit(2000);

      for (const artwork of allArtworks) {
        const similarity = calculateHashSimilarity(perceptualHash, artwork.perceptualHash);
        if (similarity >= minSimilarity) {
          const isDifferentArtist = artwork.artist_id?.toString() !== artistId?.toString();
          console.log('Similar image detected:', artwork._id, 'similarity:', similarity);
          await fs.unlink(uploadedFilePath).catch(err => console.error('Error deleting file:', err));

          return res.status(409).json({
            success: false,
            errorType: 'DUPLICATE_IMAGE',
            message: isDifferentArtist
              ? 'Similar artwork already exists.'
              : 'Similar artwork already exists.'
          });
        }
      }
    }

    const watermarkScan = await detectWatermarkedText(fileBuffer);
    if (watermarkScan.hasKeyword || watermarkScan.hasLargeTextOverlay || watermarkScan.cornerTextDetected) {
      await fs.unlink(uploadedFilePath).catch(err => console.error('Error deleting file:', err));
      return res.status(422).json({
        success: false,
        errorType: 'WATERMARK_DETECTED',
        message: 'Watermarked or copyrighted images are not allowed.'
      });
    }

    console.log('No duplicates found, proceeding with upload...');

    // === GENERATE WATERMARKED PREVIEW ===
    const artistName = artistProfile?.artist_name || req.user.full_name || 'Artist';
    const galleryContext = await resolveGalleryAssignment(req.user._id, req.body);
    const signatureText = req.body.signatureText || artistName;
    const signatureRelativePath = req.user.signatureImage;
    const signatureAbsolutePath = signatureRelativePath
      ? path.join(__dirname, '..', signatureRelativePath)
      : null;

    const uploadsRoot = path.join(__dirname, '..', 'uploads');
    const publicPreviewDir = path.join(uploadsRoot, 'previews');
    await fs.mkdir(publicPreviewDir, { recursive: true });

    const previewFilename = `${path.parse(req.file.filename).name}-preview.jpg`;
    const previewAbsolutePath = path.join(publicPreviewDir, previewFilename);
    const previewRelativePath = `/uploads/previews/${previewFilename}`;
    const originalRelativePath = `storage/originals/${req.file.filename}`;
    const previewPublicUrl = `${req.protocol}://${req.get('host')}${previewRelativePath}`;

    try {
      await generateWatermarkedPreview({
        originalImagePath: uploadedFilePath,
        outputImagePath: previewAbsolutePath,
        signatureImagePath: signatureAbsolutePath,
        signatureText,
        platformWatermarkText: process.env.PLATFORM_WATERMARK_TEXT || 'VisualArt',
        enablePlatformWatermark: String(process.env.ENABLE_PLATFORM_WATERMARK || 'true') === 'true',
        opacity: Number(process.env.WATERMARK_OPACITY || 0.2)
      });
    } catch (watermarkError) {
      console.error('Error generating watermark:', watermarkError);
      await fs.unlink(uploadedFilePath).catch(err => console.error('Error deleting file:', err));
      return res.status(500).json({
        success: false,
        message: 'Failed to process image watermark. Please try again.'
      });
    }

    const artwork = new Artwork({
      title: req.body.title,
      description: req.body.description || '',
      category: req.body.category,
      price: parseFloat(req.body.price),
      base_price: parseFloat(req.body.price),
      width: req.body.width ? parseFloat(req.body.width) : null,
      height: req.body.height ? parseFloat(req.body.height) : null,
      dimension_unit: req.body.dimension_unit || 'cm',
      image_url: previewPublicUrl,
      original_image_url: originalRelativePath,
      watermarked_image_url: previewPublicUrl,
      originalImage: originalRelativePath,
      watermarkedImage: previewRelativePath,
      imageHash: imageHash,
      sha256Hash: sha256Hash,
      perceptualHash: perceptualHash,
      artist_id: artistId,
      gallery_id: galleryContext.galleryId,
      gallery_name: galleryContext.galleryName,
      gallery_slug: galleryContext.gallerySlug,
      frameStyle: req.body.frameStyle || galleryContext.frameStyle,
      isPublic: true,
      status: 'published'
    });

    console.log('Saving artwork:', artwork);
    await artwork.save();

    // Only populate and update count if artist profile exists
    if (artistProfile) {
      await artwork.populate('artist_id', 'full_name');
      await artwork.populate('gallery_id', 'name slug description theme_key model_key cover_image layout display_order is_default');
      // Update artist's artworks_sold count
      await ArtistProfile.findByIdAndUpdate(artistProfile._id, {
        $inc: { artworks_sold: 1 }
      });
    } else {
      // Populate with user full_name if no artist profile
      await artwork.populate('artist_id', 'full_name');
      await artwork.populate('gallery_id', 'name slug description theme_key model_key cover_image layout display_order is_default');
    }

    console.log('Artwork saved successfully');
    const responseArtwork = artwork.toObject();
    delete responseArtwork.original_image_url;
    delete responseArtwork.originalImage;

    res.status(201).json({
      success: true,
      message: 'Artwork uploaded successfully! 🎨',
      artwork: responseArtwork
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded files on error
    if (uploadedFilePath) {
      await fs.unlink(uploadedFilePath).catch(err =>
        console.error('Error deleting original file during cleanup:', err)
      );

      const previewFilename = `${path.parse(uploadedFilePath).name}-preview.jpg`;
      const previewPath = path.join(__dirname, '..', 'uploads', 'previews', previewFilename);
      await fs.unlink(previewPath).catch(err =>
        console.error('Error deleting preview file during cleanup:', err)
      );
    }

    // Handle specific MongoDB duplicate key error
    if (error.code === 11000 && (error.keyPattern?.imageHash || error.keyValue?.imageHash || error.keyPattern?.sha256Hash || error.keyValue?.sha256Hash)) {
      return res.status(409).json({
        success: false,
        errorType: 'DUPLICATE_IMAGE',
        message: 'Duplicate artwork detected.'
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Failed to upload artwork. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get short-lived token for original image download
router.post('/:id/original-token', auth, async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    // Check if user has access to original
    let hasAccess = false;
    const artistProfile = await ArtistProfile.findOne({ user_id: req.user._id });
    const userArtistIds = [req.user._id];
    if (artistProfile) userArtistIds.push(artistProfile._id);

    if (userArtistIds.some(id => id.toString() === artwork.artist_id.toString())) {
      hasAccess = true;
    }

    if (artwork.purchased_by && artwork.purchased_by.some(p => p.user_id.toString() === req.user._id.toString())) {
      hasAccess = true;
    }

    const orderExists = await Order.findOne({
      user_id: req.user._id,
      'items.product': artwork._id,
      status: { $in: ['completed', 'pending'] }
    }).select('_id');

    if (orderExists) {
      hasAccess = true;
    }

    if (req.user.user_type === 'admin') {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        message: 'Access denied. Purchase this artwork to view the original high-resolution image.'
      });
    }

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { artworkId: artwork._id.toString(), userId: req.user._id.toString() },
      process.env.ORIGINAL_IMAGE_TOKEN_SECRET || process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '5m' }
    );

    res.json({ token, expiresIn: 300 });
  } catch (error) {
    console.error('Error issuing original image token:', error);
    res.status(500).json({ message: error.message });
  }
});

// Download original image (auth + token required)
router.get('/:id/original', auth, async (req, res) => {
  try {
    const token = req.query.token || req.header('x-original-token');
    if (!token) {
      return res.status(401).json({ message: 'Missing access token' });
    }

    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ORIGINAL_IMAGE_TOKEN_SECRET || process.env.JWT_SECRET || 'fallback_secret');
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired access token' });
    }

    if (decoded.artworkId !== req.params.id || decoded.userId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Token does not match request' });
    }

    const artwork = await Artwork.findById(req.params.id);
    if (!artwork) {
      return res.status(404).json({ message: 'Artwork not found' });
    }

    const originalPath = artwork.originalImage || artwork.original_image_url;
    if (!originalPath || /^https?:\/\//i.test(originalPath)) {
      return res.status(404).json({ message: 'Original file not available' });
    }

    const resolvedPath = path.resolve(path.join(__dirname, '..', originalPath));
    const originalsRoot = path.resolve(path.join(__dirname, '..', 'storage', 'originals'));
    const legacyRoot = path.resolve(path.join(__dirname, '..', 'uploads', 'private', 'originals'));

    if (!resolvedPath.startsWith(originalsRoot) && !resolvedPath.startsWith(legacyRoot)) {
      return res.status(403).json({ message: 'Invalid file path' });
    }

    return res.sendFile(resolvedPath);
  } catch (error) {
    console.error('Error fetching original image:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
