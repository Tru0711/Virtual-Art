const rawApiUrl = import.meta.env.VITE_API_URL;
function normalizeApiBase(url) {
  if (!url) return 'https://virtual-art-backend.onrender.com/api';
  const u = url.replace(/\/$/, '');
  return u.endsWith('/api') ? u : `${u}/api`;
}
const API_BASE_URL = normalizeApiBase(rawApiUrl);

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

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-cache',
    });

    if (!response.ok) {
      // Try to parse JSON error body, fallback to text
      let errorBody = null;
      try {
        errorBody = await response.json();
      } catch (e) {
        try {
          const txt = await response.text();
          errorBody = { message: txt || `HTTP ${response.status}` };
        } catch (_) {
          errorBody = { message: `HTTP ${response.status}` };
        }
      }

      const msg = (errorBody && (errorBody.message || JSON.stringify(errorBody))) || `HTTP ${response.status}`;
      const requestError = new Error(msg);
      requestError.status = response.status;
      requestError.data = errorBody;
      if (import.meta.env.DEV) {
        // Helpful debug output in development
        // eslint-disable-next-line no-console
        console.error('API request error:', { url, options, status: response.status, body: errorBody });
      }
      throw requestError;
    }

    // Attempt to parse JSON response, but handle empty or non-JSON bodies gracefully
    try {
      return await response.json();
    } catch (e) {
      try {
        const txt = await response.text();
        return txt;
      } catch (_) {
        return null;
      }
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

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      cache: 'no-cache',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      const requestError = new Error(error.message || `HTTP ${response.status}`);
      requestError.status = response.status;
      requestError.data = error;
      throw requestError;
    }

    return response.json();
  }

  async uploadProfilePicture(id, formData) {
    const url = `${API_BASE_URL}/profiles/${id}`;
    const headers = {};

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData,
      cache: 'no-cache',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      const requestError = new Error(error.message || `HTTP ${response.status}`);
      requestError.status = response.status;
      requestError.data = error;
      throw requestError;
    }

    return response.json();
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
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-cache',
    });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
    // Fallback for logged-in users if public endpoint fails (e.g. old backend)
    if (this.token) {
      try {
        return await this.request('/artists');
      } catch {}
    }
    const err = await res.json().catch(() => ({ message: 'Failed to load artists' }));
    throw new Error(err.message || `Failed to load artists (${res.status})`);
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
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      const requestError = new Error(error.message || `HTTP ${response.status}`);
      requestError.status = response.status;
      requestError.data = error;
      throw requestError;
    }

    return response.json();
  }

  async getPublicArtwork(id) {
    const url = `${API_BASE_URL}/artworks/public/${id}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      const requestError = new Error(error.message || `HTTP ${response.status}`);
      requestError.status = response.status;
      requestError.data = error;
      throw requestError;
    }

    return response.json();
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

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      const requestError = new Error(error.message || `HTTP ${response.status}`);
      requestError.status = response.status;
      requestError.data = error;
      throw requestError;
    }

    return response.json();
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

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.blob();
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
