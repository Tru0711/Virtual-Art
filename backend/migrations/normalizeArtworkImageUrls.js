/**
 * Migration Script: Normalize artwork image URLs
 *
 * This script rewrites legacy localhost artwork URLs to the production backend host,
 * preserves existing unique upload paths, and clears unrecoverable/broken references.
 *
 * Run with:
 * node backend/migrations/normalizeArtworkImageUrls.js
 */

require('dotenv').config();
const fs = require('fs').promises;
const mongoose = require('mongoose');
const path = require('path');
const Artwork = require('../models/Artwork');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/virtual';
const PRODUCTION_BACKEND_ORIGIN = (process.env.PUBLIC_BACKEND_ORIGIN || process.env.BACKEND_PUBLIC_URL || 'https://virtual-art-backend.onrender.com').replace(/\/+$/, '');

const ARTWORK_IMAGE_FIELDS = [
  'image_url',
  'image',
  'imageUrl',
  'watermarked_image_url',
  'watermarkedImageUrl',
  'watermarkedImage',
  'thumbnail',
  'thumbnail_url',
  'original_image_url',
  'originalImageUrl',
  'originalImage',
];

const PLACEHOLDER_PATTERNS = [
  /pexels\.com\/photos\/1266808/i,
  /placeholder/i,
  /default/i,
  /sample/i,
  /dummy/i,
  /undefined/i,
  /null/i,
];

const isString = (value) => typeof value === 'string' && value.trim().length > 0;

const isPlaceholder = (value) => {
  if (!isString(value)) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
};

const normalizeRelativePath = (value) => {
  if (!isString(value)) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('./')) return `/${trimmed.slice(2)}`;
  if (trimmed.startsWith('../')) return `/${trimmed.replace(/^\.\.\//, '')}`;
  return null;
};

const resolveLocalFilePath = (pathname) => {
  const cleanPath = pathname.replace(/^\/+/, '');
  const uploadsRoot = path.join(__dirname, '..', 'uploads');
  const storageRoot = path.join(__dirname, '..', 'storage');

  if (cleanPath.startsWith('uploads/')) {
    return path.join(uploadsRoot, cleanPath.replace(/^uploads\//, ''));
  }

  if (cleanPath.startsWith('storage/')) {
    return path.join(storageRoot, cleanPath.replace(/^storage\//, ''));
  }

  return null;
};

const fileExists = async (filePath) => {
  if (!filePath) return false;
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

const normalizeArtworkUrl = async (value) => {
  if (!isString(value)) return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:') || isPlaceholder(trimmed)) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const isLegacyLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);

      if (!isLegacyLocalhost) {
        return parsed.toString();
      }

      const localPath = parsed.pathname || '/';
      const resolvedLocalFile = resolveLocalFilePath(localPath);
      if (resolvedLocalFile && !(await fileExists(resolvedLocalFile))) {
        return null;
      }

      return `${PRODUCTION_BACKEND_ORIGIN}${localPath}${parsed.search || ''}${parsed.hash || ''}`;
    } catch (error) {
      return null;
    }
  }

  const relativePath = normalizeRelativePath(trimmed);
  if (!relativePath) return null;

  const resolvedLocalFile = resolveLocalFilePath(relativePath);
  if (resolvedLocalFile && !(await fileExists(resolvedLocalFile))) {
    return null;
  }

  return `${PRODUCTION_BACKEND_ORIGIN}${relativePath}`;
};

const choosePrimarySource = (artwork) => (
  artwork.image_url
  || artwork.image
  || artwork.imageUrl
  || artwork.watermarked_image_url
  || artwork.watermarkedImageUrl
  || artwork.watermarkedImage
  || artwork.thumbnail
  || artwork.thumbnail_url
  || artwork.original_image_url
  || artwork.originalImageUrl
  || artwork.originalImage
  || null
);

async function migrateArtworkImages() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const artworks = await Artwork.find({});
  console.log(`Found ${artworks.length} artworks to inspect`);

  let updatedCount = 0;
  let skippedCount = 0;
  const unresolved = [];

  for (const artwork of artworks) {
    const current = artwork.toObject();
    const primarySource = choosePrimarySource(current);

    const normalizedPrimary = await normalizeArtworkUrl(primarySource);
    const normalizedWatermarked = await normalizeArtworkUrl(
      current.watermarked_image_url
      || current.watermarkedImageUrl
      || current.watermarkedImage
      || normalizedPrimary
    );
    const normalizedOriginal = await normalizeArtworkUrl(
      current.original_image_url
      || current.originalImageUrl
      || current.originalImage
      || normalizedWatermarked
      || normalizedPrimary
    );

    const patch = {};

    if (normalizedPrimary && current.image_url !== normalizedPrimary) patch.image_url = normalizedPrimary;
    if (normalizedPrimary && current.image !== normalizedPrimary) patch.image = normalizedPrimary;
    if (normalizedPrimary && current.imageUrl !== normalizedPrimary) patch.imageUrl = normalizedPrimary;

    if (normalizedWatermarked && current.watermarked_image_url !== normalizedWatermarked) patch.watermarked_image_url = normalizedWatermarked;
    if (normalizedWatermarked && current.watermarkedImage !== normalizedWatermarked) patch.watermarkedImage = normalizedWatermarked;
    if (normalizedWatermarked && current.watermarkedImageUrl !== normalizedWatermarked) patch.watermarkedImageUrl = normalizedWatermarked;
    if (normalizedWatermarked && current.thumbnail !== normalizedWatermarked) patch.thumbnail = normalizedWatermarked;
    if (normalizedWatermarked && current.thumbnail_url !== normalizedWatermarked) patch.thumbnail_url = normalizedWatermarked;

    if (normalizedOriginal && current.original_image_url !== normalizedOriginal) patch.original_image_url = normalizedOriginal;
    if (normalizedOriginal && current.originalImage !== normalizedOriginal) patch.originalImage = normalizedOriginal;
    if (normalizedOriginal && current.originalImageUrl !== normalizedOriginal) patch.originalImageUrl = normalizedOriginal;

    if (!normalizedPrimary && current.image_url) patch.image_url = null;
    if (!normalizedPrimary && current.image) patch.image = null;
    if (!normalizedPrimary && current.imageUrl) patch.imageUrl = null;

    if (!normalizedWatermarked && current.watermarked_image_url) patch.watermarked_image_url = null;
    if (!normalizedWatermarked && current.watermarkedImage) patch.watermarkedImage = null;
    if (!normalizedWatermarked && current.watermarkedImageUrl) patch.watermarkedImageUrl = null;
    if (!normalizedWatermarked && current.thumbnail) patch.thumbnail = null;
    if (!normalizedWatermarked && current.thumbnail_url) patch.thumbnail_url = null;

    if (!normalizedOriginal && current.original_image_url) patch.original_image_url = null;
    if (!normalizedOriginal && current.originalImage) patch.originalImage = null;
    if (!normalizedOriginal && current.originalImageUrl) patch.originalImageUrl = null;

    if (Object.keys(patch).length === 0) {
      skippedCount += 1;
      continue;
    }

    await Artwork.findByIdAndUpdate(artwork._id, patch, { new: false });
    updatedCount += 1;

    if (!normalizedPrimary && !normalizedWatermarked && !normalizedOriginal) {
      unresolved.push({ id: String(artwork._id), title: artwork.title });
    }

    console.log('[normalizeArtworkImageUrls] updated', {
      id: String(artwork._id),
      title: artwork.title,
      primarySource,
      normalizedPrimary,
      normalizedWatermarked,
      normalizedOriginal,
    });
  }

  console.log('\n=== MIGRATION SUMMARY ===');
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Unresolved: ${unresolved.length}`);

  if (unresolved.length > 0) {
    console.log('Unresolved artworks:');
    unresolved.forEach((item) => {
      console.log(`- ${item.title || item.id}`);
    });
  }

  await mongoose.connection.close();
}

migrateArtworkImages().catch(async (error) => {
  console.error('Artwork image migration failed:', error);
  await mongoose.connection.close().catch(() => {});
  process.exitCode = 1;
});