const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const ArtistProfile = require('../models/ArtistProfile');
const Artwork = require('../models/Artwork');
const Gallery = require('../models/Gallery');
const Order = require('../models/Order');
const Review = require('../models/Review');
const { auth } = require('../middleware/auth');

const router = express.Router();

const PUBLISHED_STATUSES = ['published', 'sold'];

/**
 * Convert relative paths to absolute URLs
 */
const toAbsoluteUrl = (req, value) => {
  if (!value) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  const clean = value.startsWith('/') ? value : `/${value}`;
  return `${req.protocol}://${req.get('host')}${clean}`;
};

/**
 * Construct full image URL if needed
 * Handles both local paths and absolute URLs
 */
const buildImageUrl = (imagePath) => {
  if (!imagePath) return null;
  // Already a full URL
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // Local path - will be resolved by frontend with API_URL
  return imagePath;
};

const normalizeGalleryToken = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const humanizeGalleryName = (value) => {
  const text = String(value || '').trim().replace(/[_-]+/g, ' ');
  return text
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase()) || 'Gallery';
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

const pickModelKey = (slug) => {
  const normalized = normalizeGalleryToken(slug);
  if (normalized.includes('nature') || normalized.includes('garden')) return 'vr_gallery';
  if (normalized.includes('abstract')) return 'vr_art_gallery_01';
  if (normalized.includes('crypto')) return 'looniversal_crypto_arvr_art_gallery';
  if (normalized.includes('round')) return 'vr_round_art_gallery';
  if (normalized.includes('showcase')) return 'vr_gallery_showcase_presentation_building';
  if (normalized.includes('pyramid')) return 'modern_vr_art_gallery_pyramid';
  if (normalized.includes('classic')) return 'vr_art_gallery_01';
  const models = [
    'vr_gallery',
    'modern_vr_art_gallery_pyramid',
    'vr_art_gallery_01',
    'vr_gallery_showcase_presentation_building',
    'vr_round_art_gallery',
    'looniversal_crypto_arvr_art_gallery',
  ];
  return models[hashToken(normalized) % models.length];
};

const pickFrameStyle = (themeKey) => {
  if (themeKey === 'nature') return 'floating';
  if (themeKey === 'crypto') return 'modern';
  if (themeKey === 'abstract') return 'minimal';
  if (themeKey === 'round') return 'modern';
  if (themeKey === 'showcase') return 'classic';
  return 'classic';
};

const toGallerySlug = (artwork) => normalizeGalleryToken(
  artwork?.gallery_slug
  || artwork?.gallerySlug
  || artwork?.gallery_name
  || artwork?.galleryName
  || artwork?.gallery_id?.slug
  || artwork?.gallery_id?.name
  || artwork?.gallery
  || artwork?.collection
  || artwork?.category
  || 'featured'
);

const buildGalleryDescriptor = (artist, galleryDoc, artworks = []) => {
  const slug = galleryDoc?.slug || toGallerySlug(artworks[0] || {});
  const name = galleryDoc?.name || humanizeGalleryName(slug || 'gallery');
  const themeKey = galleryDoc?.theme_key || pickThemeKey(slug);
  const modelKey = galleryDoc?.model_key || pickModelKey(slug);
  const description = galleryDoc?.description || `${name} for ${artist.artist_name || artist.full_name || 'this artist'}`;

  return {
    id: String(galleryDoc?._id || slug),
    galleryId: galleryDoc?._id || null,
    slug,
    name,
    themeKey,
    modelKey,
    description,
    coverImage: galleryDoc?.cover_image || artworks[0]?.image_url || '',
    displayOrder: galleryDoc?.display_order || 0,
    isDefault: Boolean(galleryDoc?.is_default),
    artworkCount: artworks.length,
    layout: galleryDoc?.layout || {},
    source: galleryDoc ? 'database' : 'derived',
  };
};

const groupArtworksByGallery = async ({ artist, artistIds, artworks }) => {
  const galleries = await Gallery.find({ artist_id: artist._id }).sort({ display_order: 1, created_at: 1 }).lean();
  const galleryById = new Map(galleries.filter((gallery) => gallery && gallery._id).map((gallery) => [String(gallery._id), gallery]));
  const galleryBySlug = new Map(galleries.filter((gallery) => gallery && gallery.slug).map((gallery) => [normalizeGalleryToken(gallery.slug), gallery]));
  const grouped = new Map();

  artworks.forEach((artwork) => {
    const explicitGallery = artwork.gallery_id && typeof artwork.gallery_id === 'object'
      ? galleryById.get(String(artwork.gallery_id._id || artwork.gallery_id.id || ''))
      : galleryById.get(String(artwork.gallery_id || ''));

    const gallerySlug = normalizeGalleryToken(
      explicitGallery?.slug
      || artwork.gallery_slug
      || artwork.gallerySlug
      || artwork.gallery_name
      || artwork.galleryName
      || artwork.category
      || 'featured'
    );

    const galleryDoc = explicitGallery || galleryBySlug.get(gallerySlug) || null;
    const key = String(galleryDoc?._id || gallerySlug);
    const list = grouped.get(key) || [];
    list.push(artwork);
    grouped.set(key, list);
  });

  const galleryRecords = [];

  galleries.forEach((galleryDoc) => {
    const list = grouped.get(String(galleryDoc._id)) || [];
    galleryRecords.push(buildGalleryDescriptor(artist, galleryDoc, list));
  });

  grouped.forEach((list, key) => {
    if (!galleryById.has(key)) {
      galleryRecords.push(buildGalleryDescriptor(artist, null, list));
    }
  });

  return galleryRecords.sort((left, right) => (left.displayOrder - right.displayOrder) || left.name.localeCompare(right.name));
};

const loadArtistContext = async (artistId) => {
  const paramId = artistId;
  if (!paramId || !mongoose.Types.ObjectId.isValid(paramId)) {
    return null;
  }

  let artist = await User.findById(paramId).select('-password');
  let profile = null;

  if (artist && artist.user_type === 'artist') {
    profile = await ArtistProfile.findOne({ user_id: artist._id }).lean();
  } else {
    const profileDoc = await ArtistProfile.findById(paramId).lean();
    if (profileDoc && profileDoc.user_id) {
      profile = profileDoc;
      artist = await User.findById(profileDoc.user_id).select('-password');
    }
  }

  if (!artist || artist.user_type !== 'artist') {
    return null;
  }

  const artistIds = [artist._id];
  if (profile && profile._id) {
    artistIds.push(profile._id);
  }

  const artworks = await Artwork.find({
    artist_id: { $in: artistIds },
    status: { $in: PUBLISHED_STATUSES },
  })
    .populate('artist_id', 'full_name')
    .populate('gallery_id', 'name slug description theme_key model_key cover_image layout display_order is_default artist_id')
    .sort({ displayOrder: 1, created_at: -1 })
    .lean();

  const processedArtworks = artworks.map((artwork) => {
    const image_url = buildImageUrl(artwork.image_url);
    // Include original HD image URL for VR gallery HD texture loading
    const original_image_url = buildImageUrl(artwork.original_image_url || artwork.originalImage || artwork.image_url);
    const galleryId = artwork.gallery_id && typeof artwork.gallery_id === 'object' ? artwork.gallery_id._id : artwork.gallery_id || null;
    const gallerySlug = artwork.gallery_slug || artwork.gallerySlug || artwork.gallery_id?.slug || '';
    const galleryName = artwork.gallery_name || artwork.galleryName || artwork.gallery_id?.name || '';
    return {
      ...artwork,
      image_url,
      original_image_url,
      artistId: artwork.artist_id?._id || artwork.artist_id || null,
      galleryId,
      gallery_id: artwork.gallery_id,
      gallery_slug: gallerySlug,
      gallery_name: galleryName,
      frameStyle: artwork.frameStyle || 'classic',
    };
  });

  const galleries = await groupArtworksByGallery({ artist, artistIds, artworks: processedArtworks });

  return { artist, profile, artworks: processedArtworks, galleries };
};

/**
 * Shared handler: list artists that have an ArtistProfile (one per user, no duplicates).
 */
const listArtistsWithProfiles = async () => {
  const profiles = await ArtistProfile.find({}).lean();
  const validProfiles = profiles.filter((p) => {
    const uid = p && p.user_id;
    return uid && mongoose.Types.ObjectId.isValid(uid);
  });
  const uniqueUserIds = [...new Set(validProfiles.map((p) => String(p.user_id)))];
  if (uniqueUserIds.length === 0) {
    return [];
  }
  const artistUserObjectIds = uniqueUserIds.map((id) => new mongoose.Types.ObjectId(id));

  const artists = await User.find({
    _id: { $in: artistUserObjectIds },
    user_type: 'artist',
  })
    .select('-password')
    .lean();

  const artistIds = (artists || []).map((a) => a._id);
  const profileByUserId = new Map(
    validProfiles.map((p) => [String(p.user_id), p])
  );
  const artistProfileIds = validProfiles.map((p) => p._id).filter(Boolean);
  const artworkArtistIds = [...artistIds, ...artistProfileIds];

  const artistIdToUserId = new Map();
  artistIds.forEach((id) => artistIdToUserId.set(String(id), String(id)));
  validProfiles.forEach((p) => {
    if (p._id && p.user_id) {
      artistIdToUserId.set(String(p._id), String(p.user_id));
    }
  });

  let countByUserId = new Map();
  if (artworkArtistIds.length > 0) {
    const artworkCounts = await Artwork.aggregate([
      { $match: { artist_id: { $in: artworkArtistIds }, status: { $in: PUBLISHED_STATUSES } } },
      { $group: { _id: '$artist_id', count: { $sum: 1 } } },
    ]);
    artworkCounts.forEach((entry) => {
      const userId = artistIdToUserId.get(String(entry._id));
      if (userId) {
        countByUserId.set(userId, (countByUserId.get(userId) || 0) + entry.count);
      }
    });
  }

  const payload = artists.map((artist) => {
    const profile = profileByUserId.get(String(artist._id));
    return {
      id: artist._id,
      full_name: artist.full_name,
      profile_picture: buildImageUrl(artist.profile_picture),
      artist_name: (profile && profile.artist_name) || artist.full_name,
      bio: (profile && profile.bio) || '',
      artworks_count: countByUserId.get(String(artist._id)) || 0,
    };
  });

  return Array.from(new Map(payload.map((a) => [String(a.id), a])).values());
};

// GET /api/artist/dashboard-stats - Get dashboard statistics for logged-in artist
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    // Verify user is an artist
    if (req.user.user_type !== 'artist') {
      return res.status(403).json({ message: 'Access denied. Artist only.' });
    }

    // Get artist profile
    const artistProfile = await ArtistProfile.findOne({ user_id: req.user._id });
    const artistIds = [req.user._id];
    if (artistProfile) {
      artistIds.push(artistProfile._id);
    }

    // Count total uploads (artworks)
    const totalUploads = await Artwork.countDocuments({ 
      artist_id: { $in: artistIds } 
    });

    // Get all artworks for this artist
    const artworks = await Artwork.find({ 
      artist_id: { $in: artistIds } 
    }).select('_id');
    
    const artworkIds = artworks.map(art => art._id);

    // Count completed orders (sales) for artist's artworks
    const sales = await Order.countDocuments({
      artwork_id: { $in: artworkIds },
      status: 'completed'
    });

    // Count total orders for artist's artworks
    const orders = await Order.countDocuments({
      artwork_id: { $in: artworkIds }
    });

    // Calculate average rating from reviews
    const reviewStats = await Review.aggregate([
      {
        $match: {
          artist_id: { $in: artistIds }
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    const avgRating = reviewStats.length > 0 ? reviewStats[0].avgRating : 0;

    res.json({
      success: true,
      stats: {
        totalUploads,
        sales,
        avgRating: Number(avgRating.toFixed(1)),
        orders
      }
    });
  } catch (error) {
    console.error('[ARTISTS API] Error fetching dashboard stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// Public list for "Meet Our Artists" (no login required)
router.get('/public', async (req, res) => {
  try {
    const list = await listArtistsWithProfiles();
    console.log(`[ARTISTS API] Public list: ${list.length} unique artists`);
    res.json(list);
  } catch (error) {
    console.error('[ARTISTS API] Error fetching public artists:', error);
    res.status(500).json({ message: error.message });
  }
});

// Authenticated list (same data, requires auth)
router.get('/', auth, async (req, res) => {
  try {
    const list = await listArtistsWithProfiles();
    console.log(`[ARTISTS API] Returning ${list.length} unique artists`);
    res.json(list);
  } catch (error) {
    console.error('[ARTISTS API] Error fetching artists:', error);
    res.status(500).json({ message: error.message });
  }
});

// Normalize Mongoose Map or object to plain object for JSON
const toPlainSocialLinks = (social_links) => {
  if (!social_links) return {};
  if (typeof social_links.toObject === 'function') return social_links.toObject();
  if (social_links instanceof Map) return Object.fromEntries(social_links);
  return typeof social_links === 'object' ? social_links : {};
};

router.get('/:id/vr-galleries', async (req, res) => {
  try {
    const context = await loadArtistContext(req.params.id);
    if (!context) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    // Normalize artwork image URLs to absolute URLs
    const normalizedArtworks = context.artworks.map(artwork => ({
      ...artwork,
      image_url: toAbsoluteUrl(req, artwork.image_url),
      original_image_url: toAbsoluteUrl(req, artwork.original_image_url),
      watermarked_image_url: artwork.watermarked_image_url ? toAbsoluteUrl(req, artwork.watermarked_image_url) : undefined
    }));

    const socialLinks = toPlainSocialLinks(context.profile?.social_links);
    const artistPayload = {
      id: context.artist._id,
      full_name: context.artist.full_name,
      email: context.profile?.email || context.artist.email || '',
      phone: context.profile?.phone || context.artist.phone || '',
      profile_picture: buildImageUrl(context.artist.profile_picture),
      artist_name: context.profile?.artist_name || context.artist.full_name,
      bio: context.profile?.bio || '',
      portfolio_link: context.profile?.portfolio_link || '',
      art_style: context.profile?.art_style || '',
      location: context.profile?.location || '',
      social_links: socialLinks,
      years_experience: context.profile?.years_experience ?? 0,
      exhibitions: context.profile?.exhibitions ?? 0,
      awards_won: context.profile?.awards_won ?? 0,
      artworks_sold: context.profile?.artworks_sold ?? 0,
      artworks_count: normalizedArtworks.length,
    };

    res.json({
      artist: artistPayload,
      galleries: context.galleries,
      artworks: normalizedArtworks,
    });
  } catch (error) {
    console.error('[ARTISTS API] Error fetching VR galleries:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id/vr-galleries/:gallerySlug', async (req, res) => {
  try {
    const context = await loadArtistContext(req.params.id);
    if (!context) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    const requestedSlug = normalizeGalleryToken(req.params.gallerySlug);
    const gallery = context.galleries.find((entry) => normalizeGalleryToken(entry.slug) === requestedSlug || normalizeGalleryToken(entry.id) === requestedSlug)
      || context.galleries[0]
      || null;

    if (!gallery) {
      return res.status(404).json({ message: 'Gallery not found for this artist' });
    }

    const galleryArtworks = context.artworks.filter((artwork) => {
      const candidateSlug = normalizeGalleryToken(
        artwork.gallery_slug
        || artwork.gallerySlug
        || artwork.gallery_id?.slug
        || artwork.gallery_name
        || artwork.galleryName
        || artwork.category
        || 'featured'
      );
      return candidateSlug === normalizeGalleryToken(gallery.slug)
        || String(artwork.galleryId || artwork.gallery_id?._id || artwork.gallery_id || '') === String(gallery.galleryId || gallery.id || '');
    }).map(artwork => ({
      ...artwork,
      image_url: toAbsoluteUrl(req, artwork.image_url),
      original_image_url: toAbsoluteUrl(req, artwork.original_image_url)
    }));

    res.json({
      artist: {
        id: context.artist._id,
        full_name: context.artist.full_name,
        artist_name: context.profile?.artist_name || context.artist.full_name,
        profile_picture: buildImageUrl(context.artist.profile_picture),
      },
      gallery,
      artworks: galleryArtworks,
    });
  } catch (error) {
    console.error('[ARTISTS API] Error fetching VR gallery:', error);
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const paramId = req.params.id;
    if (!paramId || !mongoose.Types.ObjectId.isValid(paramId)) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    let artist = await User.findById(paramId).select('-password');
    let profile = null;

    if (artist && artist.user_type === 'artist') {
      profile = await ArtistProfile.findOne({ user_id: artist._id }).lean();
    } else {
      // Try as ArtistProfile id (e.g. link from list that used profile id)
      const profileDoc = await ArtistProfile.findById(paramId).lean();
      if (profileDoc && profileDoc.user_id) {
        profile = profileDoc;
        artist = await User.findById(profileDoc.user_id).select('-password');
        if (!artist || artist.user_type !== 'artist') {
          return res.status(404).json({ message: 'Artist not found' });
        }
      }
    }

    if (!artist) {
      return res.status(404).json({ message: 'Artist not found' });
    }

    const artistIds = [artist._id];
    if (profile && profile._id) {
      artistIds.push(profile._id);
    }

    const artworks = await Artwork.find({
      artist_id: { $in: artistIds },
      status: { $in: PUBLISHED_STATUSES }
    }).sort({ created_at: -1 }).lean();

    const processedArtworks = artworks.map(artwork => ({
      ...artwork,
      image_url: toAbsoluteUrl(req, artwork.image_url),
      original_image_url: toAbsoluteUrl(req, artwork.original_image_url || artwork.originalImage || artwork.image_url)
    }));

    const socialLinks = toPlainSocialLinks(profile?.social_links);

    res.json({
      artist: {
        id: artist._id,
        full_name: artist.full_name,
        email: profile?.email || artist.email || '',
        phone: profile?.phone || artist.phone || '',
        profile_picture: buildImageUrl(artist.profile_picture),
        artist_name: profile?.artist_name || artist.full_name,
        bio: profile?.bio || '',
        portfolio_link: profile?.portfolio_link || '',
        art_style: profile?.art_style || '',
        location: profile?.location || '',
        social_links: socialLinks,
        years_experience: profile?.years_experience ?? 0,
        exhibitions: profile?.exhibitions ?? 0,
        awards_won: profile?.awards_won ?? 0,
        artworks_sold: profile?.artworks_sold ?? 0,
        artworks_count: processedArtworks.length
      },
      artworks: processedArtworks
    });
  } catch (error) {
    console.error('[ARTISTS API] Error fetching artist:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
