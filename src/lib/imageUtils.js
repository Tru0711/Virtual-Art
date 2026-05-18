/**
 * Utility functions for handling image URLs
 */

import { getAssetBaseUrl, normalizeAbsoluteUrl } from './appConfig';

const ARTWORK_FALLBACK_FIELDS = [
  'image_url',
  'image',
  'imageUrl',
  'watermarked_image_url',
  'original_image_url',
  'watermarkedImageUrl',
  'originalImageUrl',
  'watermarkedImage',
  'originalImage',
  'thumbnail',
  'thumbnail_url',
  'url',
  'src',
];

/**
 * Build full image URL from a relative or absolute path
 * @param {string} imagePath - The image path (can be relative or absolute URL)
 * @returns {string|null} - Full image URL or null if no path provided
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;

  if (typeof imagePath === 'object') {
    return resolveArtworkImageUrl(imagePath);
  }

  return normalizeAbsoluteUrl(imagePath, getAssetBaseUrl());
};

export const resolveArtworkImageUrl = (artwork) => {
  if (!artwork) return null;

  if (typeof artwork === 'string') {
    return getImageUrl(artwork);
  }

  for (const field of ARTWORK_FALLBACK_FIELDS) {
    const value = artwork[field];
    if (value) {
      return getImageUrl(value);
    }
  }

  if (Array.isArray(artwork.images) && artwork.images.length > 0) {
    const firstImage = artwork.images[0];

    if (typeof firstImage === 'string') {
      return getImageUrl(firstImage);
    }

    if (firstImage?.url || firstImage?.src) {
      return getImageUrl(firstImage.url || firstImage.src);
    }
  }

  return null;
};

/**
 * Get fallback initials from a name
 * @param {string} name - The name to get initials from
 * @returns {string} - First letter or 'U' for User
 */
export const getInitials = (name) => {
  if (!name) return 'U';
  return name.charAt(0).toUpperCase();
};
