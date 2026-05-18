/**
 * Utility functions for handling image URLs
 */

import { getAssetBaseUrl, normalizeAbsoluteUrl } from './appConfig';

/**
 * Build full image URL from a relative or absolute path
 * @param {string} imagePath - The image path (can be relative or absolute URL)
 * @returns {string|null} - Full image URL or null if no path provided
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;

  return normalizeAbsoluteUrl(imagePath, getAssetBaseUrl());
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
