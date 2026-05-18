import { getApiBaseUrl, sleep } from './appConfig';

const API_BASE_URL = getApiBaseUrl();
const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 25000);
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

const getMethod = (options = {}) => String(options.method || 'GET').toUpperCase();
const shouldRetryMethod = (method) => ['GET', 'HEAD'].includes(method);

const safeJson = async (response) => {
  try {
    return await response.clone().json();
  } catch (error) {
    return null;
  }
};

const safeText = async (response) => {
  try {
    return await response.clone().text();
  } catch (error) {
    return '';
  }
};

const createRequestError = (response, body) => {
  const message = body?.message || (typeof body === 'string' && body) || `HTTP ${response.status}`;
  const error = new Error(message);
  error.status = response.status;
  error.data = body;
  return error;
};

class ApiClient {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  async fetchResponse(url, options = {}, retryOptions = {}) {
    const method = getMethod(options);
    const retries = retryOptions.retries ?? (shouldRetryMethod(method) ? 2 : 0);
    const timeoutMs = retryOptions.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const retryDelayMs = retryOptions.retryDelayMs ?? 750;

    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = globalThis.setTimeout(() => controller.abort(new Error('Request timed out')), timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          credentials: options.credentials || 'include',
          cache: options.cache || 'no-cache',
          signal: controller.signal,
        });

        if (!response.ok && attempt < retries && RETRYABLE_STATUSES.has(response.status)) {
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }

        return response;
      } catch (error) {
        lastError = error;
        const isAbort = error?.name === 'AbortError' || /timed out/i.test(error?.message || '');
        const isRetryableNetworkError = isAbort || error?.message === 'Failed to fetch' || error?.message === 'NetworkError when attempting to fetch resource.';

        if (attempt < retries && isRetryableNetworkError) {
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }

        throw error;
      } finally {
        globalThis.clearTimeout(timeoutId);
      }
    }

    throw lastError || new Error('Request failed');
  }

  async fetchJson(url, options = {}, retryOptions = {}) {
    const response = await this.fetchResponse(url, options, retryOptions);

    if (!response.ok) {
      const jsonBody = await safeJson(response);
      const textBody = jsonBody ? null : await safeText(response);
      throw createRequestError(response, jsonBody || textBody);
    }

    const jsonBody = await safeJson(response);
    if (jsonBody !== null) return jsonBody;

    return safeText(response);
  }

  async fetchBlob(url, options = {}, retryOptions = {}) {
    const response = await this.fetchResponse(url, options, retryOptions);

    if (!response.ok) {
      const jsonBody = await safeJson(response);
      const textBody = jsonBody ? null : await safeText(response);
      throw createRequestError(response, jsonBody || textBody);
    }

    return response.blob();
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      return await this.fetchJson(url, {
        ...options,
        headers,
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('API request error:', { url, options, error });
      }

      throw error;
    }
  }

  // Auth endpoints
  async register(data) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.token);
    return response;
  }

  async sendOtp(data) {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyOtp(data) {
    const response = await this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response?.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async resendOtp(data) {
    return this.request('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async forgotPasswordOtp(email) {
    return this.request('/auth/forgot-password-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    this.setToken(response.token);
    return response;
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async resetPassword(token, password, confirmPassword) {
    return this.request(`/auth/reset-password/${token}`, {
      method: 'POST',
      body: JSON.stringify({ password, confirmPassword })
    });
  }

  async resetPasswordWithOtp(data) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Logout API error:', error);
      }
    } finally {
      this.clearToken();
    }
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Profile endpoints
  async getProfiles() {
    return this.request('/profiles');
  }

  async getAllUsers() {
    return this.request('/profiles');
  }

  async getProfile(id) {
    return this.request(`/profiles/${id}`);
  }

  async updateProfile(id, updates) {
    return this.request(`/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async uploadSignature(userId, formData) {
    const url = `${API_BASE_URL}/profiles/${userId}/signature`;
    const headers = {};

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return this.fetchJson(url, {
      method: 'POST',
      headers,
      body: formData,
    }, {
      retries: 0,
    });
  }

  async uploadProfilePicture(id, formData) {
    const url = `${API_BASE_URL}/profiles/${id}`;
    const headers = {};

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return this.fetchJson(url, {
      method: 'PUT',
      headers,
      body: formData,
    }, {
      retries: 0,
    });
  }

  async deleteProfile(id) {
    return this.request(`/profiles/${id}`, {
      method: 'DELETE',
    });
  }

  // Artist profile endpoints
  async getArtistProfiles() {
    return this.request('/artist-profiles');
  }

  async getArtistProfile(id) {
    return this.request(`/artist-profiles/${id}`);
  }

  async getArtistProfileByUserId(userId) {
    return this.request(`/artist-profiles/user/${userId}`);
  }

  async createArtistProfile(data) {
    return this.request('/artist-profiles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateArtistProfile(id, updates) {
    return this.request(`/artist-profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteArtistProfile(id) {
    return this.request(`/artist-profiles/${id}`, {
      method: 'DELETE',
    });
  }

  // Artist discovery for Meet Our Artists (public, no auth required)
  async getArtists() {
    const url = `${API_BASE_URL}/artists/public`;
    try {
      const data = await this.fetchJson(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return Array.isArray(data) ? data : [];
    } catch (error) {
      // Fallback for logged-in users if public endpoint fails (e.g. old backend)
      if (this.token) {
        try {
          return await this.request('/artists');
        } catch (fallbackError) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.warn('[ApiClient] getArtists fallback failed', fallbackError);
          }
        }
      }

      throw error;
    }
  }

  async getArtist(id) {
    return this.request(`/artists/${id}`);
  }

  async getArtistVrGalleries(artistId) {
    return this.request(`/artists/${artistId}/vr-galleries`);
  }

  async getArtistVrGallery(artistId, gallerySlug) {
    return this.request(`/artists/${artistId}/vr-galleries/${encodeURIComponent(gallerySlug)}`);
  }

  // Artwork endpoints
  async getArtworks(params) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/artworks${query}`);
  }

  // Public artworks (no auth required)
  async getPublicArtworks(params) {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    const url = `${API_BASE_URL}/artworks/public${query}`;
    return this.fetchJson(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getPublicArtwork(id) {
    const url = `${API_BASE_URL}/artworks/public/${id}`;
    return this.fetchJson(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getArtwork(id) {
    return this.request(`/artworks/${id}`);
  }

  async getMyArtworks() {
    return this.request('/artworks/my-artworks');
  }

  async getAllArtworks() {
    return this.request('/artworks');
  }

  async createArtwork(data) {
    return this.request('/artworks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async uploadArtwork(formData) {
    const url = `${API_BASE_URL}/artworks/upload`;
    const headers = {};

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return this.fetchJson(url, {
      method: 'POST',
      headers,
      body: formData,
    }, {
      retries: 0,
    });
  }

  async updateArtwork(id, updates) {
    return this.request(`/artworks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteArtwork(id) {
    return this.request(`/artworks/${id}`, {
      method: 'DELETE',
    });
  }

  // Get short-lived token for original image
  async getOriginalImageToken(artworkId) {
    return this.request(`/artworks/${artworkId}/original-token`, {
      method: 'POST'
    });
  }

  // Download original image (returns Blob)
  async downloadOriginalImage(artworkId) {
    const { token } = await this.getOriginalImageToken(artworkId);
    const url = `${API_BASE_URL}/artworks/${artworkId}/original?token=${encodeURIComponent(token)}`;
    const headers = {};

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return this.fetchBlob(url, { headers }, { retries: 0 });
  }

  // Order endpoints
  async getOrders() {
    const response = await this.request('/orders');
    return response;
  }

  async getAllOrders() {
    return this.request('/orders');
  }

  async getArtistOrders() {
    return this.request('/orders/artist');
  }

  async updateArtistOrderDeliveryStatus(orderId, delivery_status) {
    return this.request(`/orders/${orderId}/artist-delivery`, {
      method: 'PUT',
      body: JSON.stringify({ delivery_status })
    });
  }

  async createOrder(data) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createRazorpayCheckout(data) {
    return this.request('/razorpay/create-order', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyRazorpayPayment(data) {
    return this.request('/razorpay/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markRazorpayCheckoutFailed(data) {
    return this.request('/razorpay/fail', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getArtistWallet() {
    return this.request('/razorpay/wallet');
  }

  // Review endpoints
  async getReviewsForArtwork(artworkId) {
    return this.request(`/reviews/artwork/${artworkId}`);
  }

  async getAllReviews() {
    return this.request('/reviews');
  }

  async getArtistReviews() {
    return this.request('/reviews/artist');
  }

  async getArtistProfileReviews(artistId) {
    return this.request(`/reviews/artist-profile/${artistId}`);
  }

  async createReview(data) {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateReview(reviewId, data) {
    return this.request(`/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getUserReviews() {
    return this.request('/reviews');
  }

  // Artist dashboard endpoints
  async getArtistDashboardStats() {
    return this.request('/artists/dashboard-stats');
  }

  // Wishlist endpoints
  async getWishlist() {
    return this.request('/wishlist');
  }

  async addToWishlist(artworkId) {
    return this.request('/wishlist', {
      method: 'POST',
      body: JSON.stringify({ artwork_id: artworkId }),
    });
  }

  async removeFromWishlist(artworkId) {
    return this.request(`/wishlist/${artworkId}`, {
      method: 'DELETE',
    });
  }

  async checkWishlist(artworkId) {
    return this.request(`/wishlist/check/${artworkId}`);
  }

  // Cart endpoints
  async getCart() {
    return this.request('/cart');
  }

  async addToCart(artworkId) {
    return this.request('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ artworkId }),
    });
  }

  async removeFromCart(artworkId) {
    return this.request(`/cart/remove/${artworkId}`, {
      method: 'DELETE',
    });
  }

  async updateCartItem(artworkId, quantity) {
    return this.request(`/cart/update/${artworkId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  }

  async clearCart() {
    return this.request('/cart/clear', {
      method: 'DELETE',
    });
  }

  // Address endpoints
  async createAddress(addressData) {
    return this.request('/address/add', {
      method: 'POST',
      body: JSON.stringify(addressData),
    });
  }

  async getAddresses() {
    return this.request('/address/get');
  }

  async updateAddress(addressId, addressData) {
    return this.request(`/address/update/${addressId}`, {
      method: 'PUT',
      body: JSON.stringify(addressData),
    });
  }

  async deleteAddress(addressId) {
    return this.request(`/address/delete/${addressId}`, {
      method: 'DELETE',
    });
  }

  async setDefaultAddress(addressId) {
    return this.request(`/address/default/${addressId}`, {
      method: 'PUT',
    });
  }

  async getBuyerPaymentPreferences() {
    return this.request('/profiles/me/payment-preferences');
  }

  async updateBuyerPaymentPreferences(data) {
    return this.request('/profiles/me/payment-preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Admin endpoints
  async getAllUsersAdmin() {
    return this.request('/admin/users');
  }

  async getAllArtworksAdmin() {
    return this.request('/admin/artworks');
  }

  async getAllOrdersAdmin() {
    return this.request('/admin/orders');
  }

  async getAllReviewsAdmin() {
    return this.request('/admin/reviews');
  }

  // Payment endpoints
  async getPaymentInfo() {
    return this.request('/payment/info');
  }

  async updatePaymentInfo(data) {
    return this.request('/payment/update', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async checkPaymentStatus() {
    return this.request('/payment/check-status');
  }

  // Museum endpoints
  async getMuseumData({ artistId = '' } = {}) {
    const q = artistId ? { artistId } : {};
    const query = new URLSearchParams(q).toString();
    return this.request(`/museum/data${query ? `?${query}` : ''}`);
  }
}

export const api = new ApiClient();

// Type definitions for TypeScript support
export class User {
  constructor(data = {}) {
    this.id = data.id || '';
    this.email = data.email || '';
    this.full_name = data.full_name || '';
    this.phone = data.phone || '';
    this.address = data.address || '';
    this.user_type = data.user_type || 'user';
    this.created_at = data.created_at || '';
    this.updated_at = data.updated_at || '';
  }
}

export class ArtistProfile {
  constructor(data = {}) {
    this.id = data.id || '';
    this.user_id = data.user_id || '';
    this.bio = data.bio || '';
    this.specialization = data.specialization || '';
    this.portfolio_url = data.portfolio_url || '';
    this.social_links = data.social_links || {};
    this.profile_picture = data.profile_picture || '';
    this.created_at = data.created_at || '';
    this.updated_at = data.updated_at || '';
  }
}

export class Artwork {
  constructor(data = {}) {
    this.id = data.id || '';
    this.title = data.title || '';
    this.description = data.description || '';
    this.category = data.category || '';
    this.price = data.price || 0;
    this.image_url = data.image_url || '';
    this.artist_id = data.artist_id || '';
    this.status = data.status || 'available';
    this.created_at = data.created_at || '';
    this.updated_at = data.updated_at || '';
  }
}

export class Order {
  constructor(data = {}) {
    this.id = data.id || '';
    this.user_id = data.user_id || '';
    this.artwork_id = data.artwork_id || '';
    this.quantity = data.quantity || 1;
    this.total_amount = data.total_amount || 0;
    this.status = data.status || 'pending';
    this.shipping_address = data.shipping_address || '';
    this.created_at = data.created_at || '';
    this.updated_at = data.updated_at || '';
  }
}

export class Review {
  constructor(data = {}) {
    this.id = data.id || '';
    this.user_id = data.user_id || '';
    this.artwork_id = data.artwork_id || '';
    this.rating = data.rating || 5;
    this.comment = data.comment || '';
    this.created_at = data.created_at || '';
    this.updated_at = data.updated_at || '';
  }
}

export class WishlistItem {
  constructor(data = {}) {
    this.id = data.id || '';
    this.user_id = data.user_id || '';
    this.artwork_id = data.artwork_id || '';
    this.created_at = data.created_at || '';
  }
}
