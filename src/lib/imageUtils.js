/**
 * Utility functions for handling image URLs
 */

const API_URL = (() => {
  if (import.meta.env.VITE_ASSET_URL) {
    return import.meta.env.VITE_ASSET_URL;
  }

  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
  }

  return 'https://virtual-art-backend.onrender.com';
})();

/**
 * Build full image URL from a relative or absolute path
 * @param {string} imagePath - The image path (can be relative or absolute URL)
 * @returns {string|null} - Full image URL or null if no path provided
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If it's already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it's a relative path, prepend API URL
  // Remove leading slash if present to avoid double slashes
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return `${API_URL}/${cleanPath}`;
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
