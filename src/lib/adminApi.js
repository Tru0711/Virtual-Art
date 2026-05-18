import axios from 'axios';
import { getApiBaseUrl } from './appConfig';

const API_BASE_URL = getApiBaseUrl();

const adminClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

adminClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const unwrap = (promise) => promise.then((response) => response.data);

export const adminApi = {
  getStats: () => unwrap(adminClient.get('/admin/stats')),
  getUserGrowth: () => unwrap(adminClient.get('/admin/user-growth')),
  getSalesTrend: () => unwrap(adminClient.get('/admin/sales-trend')),
  getArtworkStatus: () => unwrap(adminClient.get('/admin/artwork-status')),
  getUsers: () => unwrap(adminClient.get('/admin/users')),
  getArtworks: () => unwrap(adminClient.get('/admin/artworks')),
  getOrders: () => unwrap(adminClient.get('/admin/orders')),
  getPaymentTransactions: () => unwrap(adminClient.get('/admin/payment-transactions')),
  getReviews: () => unwrap(adminClient.get('/admin/reviews')),
  updateUser: (userId, payload) => unwrap(adminClient.put(`/admin/users/${userId}`, payload)),
  deleteUser: (userId) => unwrap(adminClient.delete(`/admin/users/${userId}`)),
  approveArtwork: (artworkId) => unwrap(adminClient.post(`/admin/artworks/${artworkId}/approve`)),
  rejectArtwork: (artworkId, reason) => unwrap(adminClient.post(`/admin/artworks/${artworkId}/reject`, { reason })),
  updateDeliveryStatus: (orderId, delivery_status) => unwrap(adminClient.put(`/orders/${orderId}/delivery`, { delivery_status }))
};
