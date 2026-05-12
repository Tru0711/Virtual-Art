import { api } from './api.js';

export const signup = async (data) => {
  return api.register(data);
};

export const login = async (credentials) => {
  return api.login(credentials);
};

export const logout = async () => {
  return api.logout();
};

export const getCurrentUser = async () => {
  try {
    return await api.getCurrentUser();
  } catch {
    return null;
  }
};

export const getCurrentProfile = async () => {
  return getCurrentUser();
};

export const getArtistProfile = async (userId) => {
  try {
    const response = await api.getArtistProfileByUserId(userId);
    // Handle consistent API response format
    if (response?.success) {
      return response.data;
    }
    return response;
  } catch (error) {
    console.error('Error fetching artist profile:', error);
    return null;
  }
};

export const updateProfile = async (id, updates) => {
  return api.updateProfile(id, updates);
};

export const updateArtistProfile = async (id, updates) => {
  return api.updateArtistProfile(id, updates);
};
