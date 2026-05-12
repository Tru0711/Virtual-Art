import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, Mail, Lock, User, Phone, Globe, MapPin, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';

const ArtistAuth = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });

  const [signupData, setSignupData] = useState({
    full_name: '',
    artist_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    bio: '',
    portfolio_link: '',
    address: '',
    terms_accepted: false,
  });

  const validateSignup = () => {
    if (!signupData.full_name.trim()) return 'Full name is required';
    if (!signupData.artist_name.trim()) return 'Artist name is required';
    if (!signupData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'Valid email is required';
    if (signupData.password.length < 8) return 'Password must be at least 8 characters';
    if (signupData.password !== signupData.confirm_password) return 'Passwords do not match';
    if (signupData.phone && !signupData.phone.match(/^\d{10}$/)) return 'Phone must be 10 digits';
    if (!signupData.bio.trim() || signupData.bio.length < 200 || signupData.bio.length > 300)
      return 'Bio must be between 200-300 characters';
    if (signupData.portfolio_link && !signupData.portfolio_link.match(/^https?:\/\/.+/))
      return 'Portfolio link must be a valid URL';
    if (!signupData.terms_accepted) return 'You must accept terms and conditions';
    return null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(loginData); // Use the auth context login method
      navigate('/artist/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateSignup();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const otpResponse = await api.sendOtp({
        email: signupData.email,
        password: signupData.password,
        full_name: signupData.full_name,
        user_type: 'artist',
        phone: signupData.phone || undefined,
        address: signupData.address || undefined,
        artist_name: signupData.artist_name,
        bio: signupData.bio,
        portfolio_link: signupData.portfolio_link || undefined,
      });

      navigate('/verify-otp', {
        state: {
          email: signupData.email.trim().toLowerCase(),
          purpose: 'signup',
          expiresInSeconds: otpResponse?.expiresInSeconds,
          cooldownSeconds: otpResponse?.cooldownSeconds,
        },
      });
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-rose-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
        <button
          onClick={() => navigate('/login')}
          className="text-gray-600 hover:text-gray-800 mb-4 flex items-center gap-2"
        >
          ← Back
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-rose-500 rounded-full flex items-center justify-center">
            <Palette className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Artist {isLogin ? 'Login' : 'Sign Up'}</h2>
            <p className="text-gray-600">
              {isLogin ? 'Welcome back!' : 'Start your artistic journey'}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Mail className="inline h-4 w-4 mr-1" />
                Email
              </label>
              <input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Lock className="inline h-4 w-4 mr-1" />
                Password
              </label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-amber-600 hover:text-amber-700 text-sm font-semibold"
            >
              Forgot Password?
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <User className="inline h-4 w-4 mr-1" />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={signupData.full_name}
                  onChange={(e) => setSignupData({ ...signupData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Palette className="inline h-4 w-4 mr-1" />
                  Artist Name *
                </label>
                <input
                  type="text"
                  value={signupData.artist_name}
                  onChange={(e) => setSignupData({ ...signupData, artist_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Mail className="inline h-4 w-4 mr-1" />
                Email *
              </label>
              <input
                type="email"
                value={signupData.email}
                onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Lock className="inline h-4 w-4 mr-1" />
                  Password * (Min 8 chars)
                </label>
                <input
                  type="password"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Lock className="inline h-4 w-4 mr-1" />
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={signupData.confirm_password}
                  onChange={(e) => setSignupData({ ...signupData, confirm_password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Phone className="inline h-4 w-4 mr-1" />
                Phone Number (10 digits)
              </label>
              <input
                type="tel"
                value={signupData.phone}
                onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                maxLength={10}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FileText className="inline h-4 w-4 mr-1" />
                Bio * (200-300 characters)
              </label>
              <textarea
                value={signupData.bio}
                onChange={(e) => setSignupData({ ...signupData, bio: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                rows={4}
                maxLength={300}
                required
              />
              <p className="text-sm text-gray-500 mt-1">{signupData.bio.length}/300 characters</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Globe className="inline h-4 w-4 mr-1" />
                Portfolio Link
              </label>
              <input
                type="url"
                value={signupData.portfolio_link}
                onChange={(e) => setSignupData({ ...signupData, portfolio_link: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="https://"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <MapPin className="inline h-4 w-4 mr-1" />
                Address / Location
              </label>
              <input
                type="text"
                value={signupData.address}
                onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={signupData.terms_accepted}
                onChange={(e) => setSignupData({ ...signupData, terms_accepted: e.target.checked })}
                className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                required
              />
              <label htmlFor="terms" className="text-sm text-gray-700">
                I accept the Terms & Conditions *
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-amber-600 hover:text-amber-700 font-semibold"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArtistAuth;
