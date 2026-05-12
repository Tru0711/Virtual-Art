import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Palette, MapPin, Award, TrendingUp, Star } from 'lucide-react';
import { api } from '../../lib/api';
import { getImageUrl } from '../../lib/imageUtils';

const fallbackImage = 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg';

const ArtistsPage = () => {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchArtists = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.getArtists();
      
      let list = Array.isArray(response) ? response : response?.data || [];
      
      const withId = list.filter((a) => a.id || a._id);
      const uniqueArtists = Array.from(
        new Map(
          withId.map((artist) => [
            (artist.id || artist._id).toString(),
            { ...artist, id: artist.id || artist._id },
          ])
        ).values()
      );
      
      setArtists(uniqueArtists);
    } catch (err) {
      console.error('[ArtistsPage] Error fetching artists:', err);
      
      let errorMessage = 'Failed to load artists. Please try again.';
      
      if (err.message) {
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('network')) {
          errorMessage = 'Cannot connect to server. Please ensure the backend is running on port 5000.';
        } else if (err.message.includes('401') || err.message.includes('403')) {
          errorMessage = 'Authentication required. Please log in and try again.';
        } else if (err.message.includes('500') || err.message.includes('502') || err.message.includes('503')) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtists();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading talented artists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-rose-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-amber-600 via-rose-500 to-amber-600 py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
            <Palette className="h-5 w-5 text-white" />
            <span className="text-white font-medium">Discover Talent</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Meet Our Artists
          </h1>
          <p className="text-amber-50 text-lg max-w-2xl mx-auto">
            Browse through our curated collection of talented creators and explore their stunning artworks
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-red-700 font-medium">{error}</p>
                  <p className="text-sm text-red-600 mt-1">Ensure the backend is running on the correct port (e.g. 5000).</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchArtists}
                className="flex-shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!error && artists.length === 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg text-center">
            <Palette className="h-12 w-12 text-blue-500 mx-auto mb-3" />
            <p className="text-blue-700 font-medium text-lg">No artists found at the moment</p>
            <p className="text-blue-600 text-sm mt-1">Check back soon for talented creators!</p>
          </div>
        )}

        {/* Artists Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {artists.map((artist) => (
            <div
              key={artist.id ?? artist._id}
              className="group bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-all duration-300 overflow-hidden border border-gray-100 hover:border-amber-300 transform hover:-translate-y-1"
              style={{ boxShadow: '0 4px 6px -1px rgba(251, 191, 36, 0.1), 0 2px 4px -1px rgba(251, 191, 36, 0.06)' }}
            >
              {/* Artist Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={getImageUrl(artist.profile_picture) || fallbackImage}
                  alt={artist.artist_name || artist.full_name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(event) => {
                    event.currentTarget.src = fallbackImage;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-300"></div>
                
                {/* Artworks Badge */}
                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-md">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-semibold text-gray-800">{artist.artworks_count}</span>
                    <span className="text-xs text-gray-600">works</span>
                  </div>
                </div>

                {/* Rating Badge */}
                {artist.avg_rating > 0 && (
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-md">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-current" />
                      <span className="text-xs font-semibold text-gray-800">{artist.avg_rating.toFixed(1)}</span>
                      <span className="text-xs text-gray-600">({artist.total_reviews || 0})</span>
                    </div>
                  </div>
                )}

                {/* Artist Name Overlay */}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-white font-bold text-lg mb-0.5 drop-shadow-lg line-clamp-1">
                    {artist.artist_name || artist.full_name}
                  </h3>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4">
                {/* Bio */}
                <p className="text-gray-600 text-xs leading-relaxed mb-3 line-clamp-2 h-10">
                  {artist.bio || 'Passionate artist creating beautiful and inspiring works.'}
                </p>

                {/* View Profile Button */}
                <Link
                  to={`/artists/${artist.id ?? artist._id}`}
                  className="block w-full text-center bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 text-sm"
                >
                  View Profile
                </Link>
              </div>

              {/* Decorative Bottom Border */}
              <div className="h-0.5 bg-gradient-to-r from-amber-400 via-rose-400 to-amber-400"></div>
            </div>
          ))}
        </div>

        {/* Call to Action for Artists */}
        {artists.length > 0 && (
          <div className="mt-16 bg-gradient-to-r from-amber-100 to-rose-100 rounded-2xl p-8 text-center border border-amber-200">
            <Award className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Are You an Artist?
            </h2>
            <p className="text-gray-600 mb-6 max-w-xl mx-auto">
              Join our community of talented creators and showcase your artwork to art enthusiasts worldwide
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Palette className="h-5 w-5" />
              Join as Artist
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistsPage;
