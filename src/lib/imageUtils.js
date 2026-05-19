/**
 * Utility functions for handling image URLs
 */

import { getAssetBaseUrl, normalizeAbsoluteUrl } from './appConfig';

export const DEFAULT_ARTWORK_IMAGE_URL = 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg';

const ARTWORK_FALLBACK_FIELDS = [
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
  'url',
  'src',
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

const isStringValue = (value) => typeof value === 'string' && value.trim().length > 0;

const isPlaceholderUrl = (value) => {
  if (!isStringValue(value)) return true;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
};

const hasValidProtocol = (value) => /^(https?:)?\/\//i.test(value);

const isLocalhostHostname = (hostname) => hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';

const isRelativeArtworkPath = (value) => {
  if (!isStringValue(value)) return false;
  return value.startsWith('/uploads/')
    || value.startsWith('/storage/')
    || value.startsWith('./uploads/')
    || value.startsWith('./storage/')
    || value.startsWith('../uploads/')
    || value.startsWith('../storage/');
};

const rewriteLocalhostUrl = (value) => {
  if (!isStringValue(value)) return null;

  try {
    const parsed = new URL(value);
    const isLocalhost = isLocalhostHostname(parsed.hostname);
    if (!isLocalhost) return parsed.toString();

    return normalizeAbsoluteUrl(parsed.pathname || '/', getAssetBaseUrl());
  } catch (error) {
    return value;
  }
};

const normalizeArtworkCandidate = (value) => {
  if (!isStringValue(value)) return null;

  const trimmed = value.trim();
  if (isPlaceholderUrl(trimmed)) return null;
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return null;

  if (hasValidProtocol(trimmed)) {
    const rewritten = rewriteLocalhostUrl(trimmed);
    const absolute = normalizeAbsoluteUrl(rewritten, getAssetBaseUrl());
    return isPlaceholderUrl(absolute) ? null : absolute;
  }

  if (isRelativeArtworkPath(trimmed)) {
    const absolute = normalizeAbsoluteUrl(trimmed, getAssetBaseUrl());
    return isPlaceholderUrl(absolute) ? null : absolute;
  }

  return null;
};

export const isValidArtworkImageUrl = (value) => Boolean(normalizeArtworkCandidate(value));

/**
 * Build full image URL from a relative or absolute path.
 * Generic helper for non-artwork assets.
 * @param {string} imagePath - The image path (can be relative or absolute URL)
 * @returns {string|null} - Full image URL or null if no path provided
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return DEFAULT_ARTWORK_IMAGE_URL;

  if (typeof imagePath === 'object') {
    return resolveArtworkImageUrl(imagePath) || DEFAULT_ARTWORK_IMAGE_URL;
  }

  const text = String(imagePath).trim();
  if (!text || text.startsWith('data:') || text.startsWith('blob:')) return DEFAULT_ARTWORK_IMAGE_URL;

  const normalized = normalizeArtworkCandidate(text);
  if (normalized) {
    return normalized;
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[imageUtils] rejected image url', { original: imagePath, fallback: DEFAULT_ARTWORK_IMAGE_URL });
  }

  return DEFAULT_ARTWORK_IMAGE_URL;
};

export const resolveArtworkImageUrl = (artwork) => {
  if (!artwork) return null;

  const source = typeof artwork === 'string' ? { image_url: artwork } : artwork;
  const rejectedFields = [];

  for (const field of ARTWORK_FALLBACK_FIELDS) {
    const candidate = source?.[field];
    const normalized = normalizeArtworkCandidate(candidate);

    if (normalized) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[imageUtils] resolved artwork image', { field, normalized });
      }
      return normalized;
    }

    if (isStringValue(candidate)) {
      rejectedFields.push({ field, value: candidate });
    }
  }

  if (Array.isArray(source?.images) && source.images.length > 0) {
    for (let index = 0; index < source.images.length; index += 1) {
      const firstImage = source.images[index];
      const candidate = typeof firstImage === 'string'
        ? firstImage
        : (firstImage?.url || firstImage?.src || '');
      const normalized = normalizeArtworkCandidate(candidate);

      if (normalized) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[imageUtils] resolved artwork image from images[]', { index, normalized });
        }
        return normalized;
      }

      if (isStringValue(candidate)) {
        rejectedFields.push({ field: `images[${index}]`, value: candidate });
      }
    }
  }

  if (import.meta.env.DEV && rejectedFields.length > 0) {
    // eslint-disable-next-line no-console
    console.debug('[imageUtils] rejected artwork image fields', rejectedFields);
  }

  return null;
};

export const resolveArtworkImageSource = (artwork, imageOverride = null) => {
  const artworkUrl = resolveArtworkImageUrl(artwork);
  if (artworkUrl) return artworkUrl;

  if (isValidArtworkImageUrl(imageOverride)) {
    return normalizeArtworkCandidate(imageOverride);
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
