const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const sharp = require('sharp');
const Artwork = require('../models/Artwork');
const ArtistProfile = require('../models/ArtistProfile');
const Gallery = require('../models/Gallery');
const { detectWatermarkedText } = require('../utils/textDetection');
const {
  uploadBuffer,
  isCloudinaryConfigured,
} = require('../config/cloudinary');
const {
  generateSHA256Hash,
  generateNormalizedSHA256Hash,
  generatePerceptualHash,
  calculateHashSimilarity,
} = require('../utils/imageHash');

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

const escapeSvgText = (text = '') => text
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const buildTextSignatureSvg = ({ text, width, height, opacity, fontSize }) => {
  const safeText = escapeSvgText(text);
  return `
    <svg width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="none" />
      <text
        x="50%"
        y="50%"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${fontSize}"
        font-weight="600"
        fill="rgba(255, 255, 255, ${opacity})"
        stroke="rgba(0, 0, 0, 0.35)"
        stroke-width="2"
        paint-order="stroke fill"
        text-anchor="middle"
        dominant-baseline="middle">
        ${safeText}
      </text>
    </svg>
  `;
};

const downloadBufferFromUrl = async (value) => {
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    const response = await fetch(value);
    if (!response.ok) {
      throw new Error(`Failed to download remote image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const localPath = path.isAbsolute(value) ? value : path.join(__dirname, '..', value);
  try {
    return await fs.readFile(localPath);
  } catch (error) {
    return null;
  }
};

const buildWatermarkedPreviewBuffer = async ({
  originalBuffer,
  signatureBuffer,
  signatureText,
  platformWatermarkText = 'VisualArt',
  enablePlatformWatermark = false,
  opacity = 0.2,
}) => {
  const base = sharp(originalBuffer).rotate().resize({ width: 1200, withoutEnlargement: true });
  const { data, info } = await base.toBuffer({ resolveWithObject: true });

  const width = info.width || 1200;
  const height = info.height || 1200;
  const cornerWidth = Math.max(140, Math.round(width * 0.22));
  const cornerHeight = Math.max(52, Math.round(cornerWidth * 0.34));
  const margin = Math.max(16, Math.round(width * 0.03));

  const overlays = [];

  if (enablePlatformWatermark) {
    const tileWidth = Math.max(180, Math.floor(width / 3));
    const tileHeight = Math.max(120, Math.floor(height / 3));
    const diagonalWatermarkSvg = `
      <svg width="${width}" height="${height}">
        <defs>
          <pattern id="watermark-pattern" x="0" y="0" width="${tileWidth}" height="${tileHeight}" patternUnits="userSpaceOnUse">
            <text
              x="50%"
              y="50%"
              font-family="Arial, sans-serif"
              font-size="${Math.max(18, Math.round(width / 35))}"
              fill="rgba(255, 255, 255, 0.18)"
              stroke="rgba(0, 0, 0, 0.2)"
              stroke-width="1"
              paint-order="stroke fill"
              text-anchor="middle"
              dominant-baseline="middle"
              transform="rotate(-45 ${tileWidth / 2} ${tileHeight / 2})">
              ${escapeSvgText(platformWatermarkText)}
            </text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#watermark-pattern)" />
      </svg>
    `;

    overlays.push({
      input: Buffer.from(diagonalWatermarkSvg),
      top: 0,
      left: 0,
      blend: 'over',
    });
  }

  let signatureOverlay = null;
  if (signatureBuffer) {
    signatureOverlay = await sharp(signatureBuffer)
      .resize({ width: cornerWidth, height: cornerHeight, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
  } else {
    const fontSize = Math.max(18, Math.round(cornerHeight * 0.72));
    const svg = buildTextSignatureSvg({
      text: signatureText || 'Artist',
      width: cornerWidth,
      height: cornerHeight,
      opacity: Math.max(0.45, opacity),
      fontSize,
    });
    signatureOverlay = Buffer.from(svg);
  }

  overlays.push({ input: signatureOverlay, top: margin, left: margin, blend: 'over' });
  overlays.push({ input: signatureOverlay, top: margin, left: Math.max(margin, width - cornerWidth - margin), blend: 'over' });

  return sharp(data)
    .composite(overlays)
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
};

const uploadArtwork = async (req, res) => {
  if (!isCloudinaryConfigured) {
    return res.status(500).json({
      success: false,
      message: 'Cloudinary is not configured on the server.',
    });
  }

  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    if (!req.body.title || !req.body.category || !req.body.price) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, category, price',
      });
    }

    if (req.user.user_type !== 'artist') {
      return res.status(403).json({
        success: false,
        message: 'Only artists can upload artworks',
      });
    }

    const originalBuffer = req.file.buffer;
    const imageMeta = await sharp(originalBuffer).metadata();
    const allowedFormats = new Set(['jpeg', 'png', 'webp']);
    if (!allowedFormats.has(imageMeta.format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image type. Only jpg, jpeg, png, webp allowed.',
      });
    }

    const sha256Hash = generateSHA256Hash(originalBuffer);
    const imageHash = await generateNormalizedSHA256Hash(originalBuffer);
    const perceptualHash = await generatePerceptualHash(originalBuffer);

    const artistProfile = await ArtistProfile.findOne({ user_id: req.user._id });
    const artistId = artistProfile ? artistProfile._id : req.user._id;

    const exactDuplicate = await Artwork.findOne({ $or: [{ sha256Hash }, { imageHash }] })
      .select('_id title created_at artist_id');
    if (exactDuplicate) {
      return res.status(409).json({
        success: false,
        errorType: 'DUPLICATE_IMAGE',
        message: 'Duplicate artwork detected.',
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
          return res.status(409).json({
            success: false,
            errorType: 'DUPLICATE_IMAGE',
            message: 'Similar artwork already exists.',
          });
        }
      }
    }

    const watermarkScan = await detectWatermarkedText(originalBuffer);
    if (watermarkScan.hasKeyword || watermarkScan.hasLargeTextOverlay || watermarkScan.cornerTextDetected) {
      return res.status(422).json({
        success: false,
        errorType: 'WATERMARK_DETECTED',
        message: 'Watermarked or copyrighted images are not allowed.',
      });
    }

    const signatureText = req.body.signatureText || artistProfile?.artist_name || req.user.full_name || 'Artist';
    const galleryContext = await resolveGalleryAssignment(req.user._id, req.body);
    const signatureBuffer = await downloadBufferFromUrl(req.user.signatureImage || null);

    const previewBuffer = await buildWatermarkedPreviewBuffer({
      originalBuffer,
      signatureBuffer,
      signatureText,
      platformWatermarkText: process.env.PLATFORM_WATERMARK_TEXT || 'VisualArt',
      enablePlatformWatermark: String(process.env.ENABLE_PLATFORM_WATERMARK || 'true') === 'true',
      opacity: Number(process.env.WATERMARK_OPACITY || 0.2),
    });

    const uploadPrefix = `virtual-art/artworks/${artistId.toString()}`;
    const uniqueStamp = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    const originalUpload = await uploadBuffer(originalBuffer, {
      folder: `${uploadPrefix}/originals`,
      public_id: `original-${uniqueStamp}`,
      resource_type: 'image',
      overwrite: false,
      unique_filename: false,
    });

    console.log('[artworkUpload] original cloudinary url:', originalUpload.secure_url);

    const previewUpload = await uploadBuffer(previewBuffer, {
      folder: `${uploadPrefix}/previews`,
      public_id: `preview-${uniqueStamp}`,
      resource_type: 'image',
      overwrite: false,
      unique_filename: false,
    });

    console.log('[artworkUpload] preview cloudinary url:', previewUpload.secure_url);

    const artwork = new Artwork({
      title: req.body.title,
      description: req.body.description || '',
      category: req.body.category,
      price: parseFloat(req.body.price),
      base_price: parseFloat(req.body.price),
      width: req.body.width ? parseFloat(req.body.width) : null,
      height: req.body.height ? parseFloat(req.body.height) : null,
      dimension_unit: req.body.dimension_unit || 'cm',
      image_url: previewUpload.secure_url,
      original_image_url: originalUpload.secure_url,
      watermarked_image_url: previewUpload.secure_url,
      image: previewUpload.secure_url,
      imageUrl: previewUpload.secure_url,
      thumbnail: previewUpload.secure_url,
      originalImage: originalUpload.secure_url,
      originalImageUrl: originalUpload.secure_url,
      watermarkedImage: previewUpload.secure_url,
      watermarkedImageUrl: previewUpload.secure_url,
      imageHash,
      sha256Hash,
      perceptualHash,
      artist_id: artistId,
      gallery_id: galleryContext.galleryId,
      gallery_name: galleryContext.galleryName,
      gallery_slug: galleryContext.gallerySlug,
      frameStyle: req.body.frameStyle || galleryContext.frameStyle,
      isPublic: true,
      status: 'published',
    });

    await artwork.save();

    console.log('[artworkUpload] mongo image_url:', artwork.image_url);
    console.log('[artworkUpload] mongo watermarked_image_url:', artwork.watermarked_image_url);
    console.log('[artworkUpload] mongo original_image_url:', artwork.original_image_url);

    if (artistProfile) {
      await artwork.populate('artist_id', 'full_name');
      await artwork.populate('gallery_id', 'name slug description theme_key model_key cover_image layout display_order is_default');
      await ArtistProfile.findByIdAndUpdate(artistProfile._id, { $inc: { artworks_sold: 1 } });
    } else {
      await artwork.populate('artist_id', 'full_name');
      await artwork.populate('gallery_id', 'name slug description theme_key model_key cover_image layout display_order is_default');
    }

    const responseArtwork = artwork.toObject();
    responseArtwork.image = responseArtwork.image || responseArtwork.image_url;
    responseArtwork.imageUrl = responseArtwork.imageUrl || responseArtwork.image_url;
    responseArtwork.thumbnail = responseArtwork.thumbnail || responseArtwork.watermarked_image_url || responseArtwork.image_url;
    responseArtwork.thumbnail_url = responseArtwork.thumbnail_url || responseArtwork.thumbnail;
    responseArtwork.watermarkedImage = responseArtwork.watermarkedImage || responseArtwork.watermarked_image_url;
    responseArtwork.watermarkedImageUrl = responseArtwork.watermarkedImageUrl || responseArtwork.watermarked_image_url;
    responseArtwork.originalImage = responseArtwork.originalImage || responseArtwork.original_image_url;
    responseArtwork.originalImageUrl = responseArtwork.originalImageUrl || responseArtwork.original_image_url;
    delete responseArtwork.original_image_url;
    delete responseArtwork.originalImage;

    res.status(201).json({
      success: true,
      message: 'Artwork uploaded successfully! 🎨',
      artwork: responseArtwork,
    });
  } catch (error) {
    console.error('Upload error:', error);

    if (error.code === 11000 && (error.keyPattern?.imageHash || error.keyValue?.imageHash || error.keyPattern?.sha256Hash || error.keyValue?.sha256Hash)) {
      return res.status(409).json({
        success: false,
        errorType: 'DUPLICATE_IMAGE',
        message: 'Duplicate artwork detected.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload artwork. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  uploadArtwork,
};