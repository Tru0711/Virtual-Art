import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, ArtistProfile } from '../lib/api.js';
import { getCurrentProfile, getArtistProfile } from '../lib/auth.js';
import { api } from '../lib/api.js';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [artistProfile, setArtistProfile] = useState(undefined);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.user_type === 'admin';

  const loadProfile = async (currentUser) => {
    try {
      const userProfile = await getCurrentProfile();
      setProfile(userProfile);

      if (userProfile?.user_type === 'artist') {
        const artistData = await getArtistProfile(userProfile.id);
        setArtistProfile(artistData);
      } else {
        setArtistProfile(null);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  const completeAuth = async (authResponse) => {
    if (!authResponse?.token || !authResponse?.user) {
      throw new Error('Invalid authentication response');
    }

    localStorage.setItem('token', authResponse.token);
    api.setToken(authResponse.token);
    setUser(authResponse.user);
    await loadProfile(authResponse.user);
    return authResponse;
  };

  const login = async (credentials) => {
    try {
      const response = await api.login(credentials);
      await completeAuth(response);
      return response;
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state regardless of API call success
      setUser(null);
      setProfile(null);
      setArtistProfile(null);
      localStorage.removeItem('token');
      // Clear cart data on logout
      localStorage.removeItem('cartItems');
      window.dispatchEvent(new Event('storage'));
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      api.setToken(token);

      try {
        const currentUser = await getCurrentProfile();
        if (currentUser) {
          setUser(currentUser);
          await loadProfile(currentUser);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear any invalid tokens
        localStorage.removeItem('token');
        api.clearToken();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, artistProfile, loading, isAdmin, login, logout, refreshProfile, completeAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
