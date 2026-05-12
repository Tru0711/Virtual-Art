/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { Star, Heart, ShoppingCart, ArrowLeft, MapPin, Calendar, Award, User, Eye, Palette, Ruler, CalendarDays, MessageSquare } from 'lucide-react';
import { toastSuccess, toastError } from '../../lib/toast';
import { getImageUrl } from '../../lib/imageUtils';
import ProtectedImage from '../common/ProtectedImage';
import ReviewsList from '../reviews/ReviewsList';
import { getBuyerPrice, getFormattedRupee, BUYER_MARKUP_LABEL } from '../../lib/pricing';
/* eslint-enable no-unused-vars */

const ArtworkDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const artworkId = id;
  
  // Simple token check using localStorage as specified
  const isAuthenticated = !!localStorage.getItem("token");
  const { profile } = useAuth();
  const [artwork, setArtwork] = useState(null);
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [relatedArtworks, setRelatedArtworks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [showReviews, setShowReviews] = useState(false);

  useEffect(() => {
    if (artworkId) {
      fetchArtworkDetails();
      if (profile?.user_type) {
        checkWishlistStatus();
      } else {
        setIsWishlisted(false);
      }
    }
  }, [artworkId, profile?.user_type]);

  const checkWishlistStatus = async () => {
    try {
      const wishlistData = await api.getWishlist();
      const isInWishlist = wishlistData.some(item => item.artwork_id === artworkId);
      setIsWishlisted(isInWishlist);
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

  const fetchArtworkDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      let artworkData = null;

      if (profile?.user_type) {
        try {
          artworkData = await api.getArtwork(artworkId);
        } catch (err) {
          if (err.status === 401 || err.status === 403) {
            artworkData = await api.getPublicArtwork(artworkId);
          } else {
            throw err;
          }
        }
      } else {
        artworkData = await api.getPublicArtwork(artworkId);
      }

      if (!artworkData) {
        setArtwork(null);
        setError('Artwork not found');
        return;
      }

      setArtwork(artworkData);

      if (artworkData.artist_id) {
        try {
          const artistData = await api.getArtistProfile(artworkData.artist_id._id || artworkData.artist_id);
          setArtist(artistData);
        } catch (error) {
          console.error('Error fetching artist profile:', error);
        }
      }

      // Fetch related artworks - with error handling
      try {
        const allArtworks = await api.getPublicArtworks();
        if (allArtworks && Array.isArray(allArtworks)) {
          const related = allArtworks
            .filter(art => art.category === artworkData.category && art._id !== artworkData._id)
            .slice(0, 4);
          setRelatedArtworks(related);
        }
      } catch (relError) {
        console.error('Error fetching related artworks:', relError);
        // Don't fail the whole page if related artworks fail
        setRelatedArtworks([]);
      }

    } catch (error) {
      console.error('Error fetching artwork details:', error);
      // Better error message extraction
      const errorMessage = error?.data?.message || error?.message || 'Failed to load artwork. Please try again later.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchArtworkReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await api.getReviewsForArtwork(artworkId);
      if (response.success) {
        setReviews(response.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleShowReviews = () => {
    if (!showReviews) {
      fetchArtworkReviews();
    }
    setShowReviews(!showReviews);
  };

  const handleAddToCart = async () => {
    // Check authentication using localStorage token
    if (!isAuthenticated) {
      // Store current page in location.state before redirecting
      navigate('/login/user', {
        state: { from: location.pathname + location.search }
      });
      return;
    }
    try {
      const currentCart = JSON.parse(localStorage.getItem('cartItems') || '{}');
      const newQuantity = (currentCart[artwork._id] || 0) + 1;
      currentCart[artwork._id] = newQuantity;
      localStorage.setItem('cartItems', JSON.stringify(currentCart));
      window.dispatchEvent(new Event('storage'));
      toastSuccess(`Added "${artwork.title}" to cart!`);
      navigate('/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toastError('Failed to add item to cart. Please try again.');
    }
  };

  const handleAddToWishlist = async () => {
    // Check authentication using localStorage token
    if (!isAuthenticated) {
      // Store current page in location.state before redirecting
      navigate('/login/user', {
        state: { from: location.pathname + location.search }
      });
      return;
    }
    try {
      if (isWishlisted) {
        await api.removeFromWishlist(artwork._id);
        setIsWishlisted(false);
        toastSuccess('Removed from wishlist');
      } else {
        await api.addToWishlist(artwork._id);
        setIsWishlisted(true);
        toastSuccess('Added to wishlist');
      }
      window.dispatchEvent(new CustomEvent('wishlistUpdated'));
    } catch (error) {
      console.error('Error updating wishlist:', error);
      if (error.message?.includes('already in wishlist')) {
        toastError('This artwork is already in your wishlist');
        setIsWishlisted(true);
      } else {
        toastError('Failed to update wishlist. Please try again.');
      }
    }
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      navigate('/login/user', {
        state: { from: location.pathname + location.search }
      });
      return;
    }

    if (artwork.status === 'sold') {
      toastError('This artwork is already sold');
      return;
    }

    const instantCheckout = { [artwork._id]: 1 };
    localStorage.setItem('cartItems', JSON.stringify(instantCheckout));
    window.dispatchEvent(new CustomEvent('cartUpdated'));
    navigate('/checkout');
  };

  // Helper to format painting dimensions
  const formatPaintingSize = () => {
    const width = artwork?.width;
    const height = artwork?.height;
    const unit = artwork?.dimension_unit || 'cm';
    
    if (width && height) {
      return `${width} × ${height} ${unit}`;
    }
    return artwork?.size || 'Not specified';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading artwork details...</p>
        </div>
      </div>
    );
  }

  if (error || !artwork) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-rose-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-8">
          <p className="text-gray-600 text-lg mb-4">
            {error || "Artwork not found or you don't have permission to view it"}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-lg hover:from-amber-600 hover:to-rose-600 font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const avgRating = artwork.avg_rating || 0;
  const totalReviews = artwork.total_reviews || 0;

  const mainImageUrl = getImageUrl(
    artwork.image_url || artwork.watermarked_image_url || artwork.watermarkedImage
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-rose-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-amber-600 font-medium transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {mainImageUrl ? (
                <ProtectedImage
                  src={mainImageUrl}
                  alt={artwork.title}
                  className="w-full h-[500px] object-cover"
                  overlayText={profile?.email ? `Previewed by ${profile.email}` : ''}
                />
              ) : (
                <div className="w-full h-[500px] flex items-center justify-center bg-gray-100 text-gray-500 text-lg">
                  Artwork image not available
                </div>
              )}
            </div>

            {artwork.image_url && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                <div className="flex-shrink-0 w-24 h-24 bg-white rounded-xl overflow-hidden border-2 border-amber-500 shadow-md">
                  <img
                    src={getImageUrl(artwork.image_url)}
                    alt="Main Image"
                    className="w-full h-full object-cover cursor-pointer"
                  />
                </div>
                {artwork.watermarked_image_url && (
                  <div className="flex-shrink-0 w-24 h-24 bg-white rounded-xl overflow-hidden border-2 border-gray-200 shadow-md">
                    <img
                      src={getImageUrl(artwork.watermarked_image_url)}
                      alt="Watermarked"
                      className="w-full h-full object-cover cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            {/* Title and Category */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-4 py-1.5 bg-gradient-to-r from-amber-400 to-rose-400 text-white rounded-full text-sm font-semibold capitalize shadow-md">
                  {artwork.category || 'General'}
                </span>
                <span className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-md ${
                  artwork.status === 'published' ? 'bg-green-100 text-green-700' :
                  artwork.status === 'sold' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {artwork.status === 'published' ? 'Available' : artwork.status}
                </span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">{artwork.title}</h1>
              {artwork.description && (
                <p className="text-gray-600 text-lg leading-relaxed">{artwork.description}</p>
              )}
            </div>

            {/* Rating Section */}
            <div className="bg-white rounded-xl shadow-md p-4">
              <button 
                onClick={handleShowReviews}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-6 w-6 ${
                          star <= Math.round(avgRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-600 font-medium">
                    {avgRating > 0 ? avgRating.toFixed(1) : 'No ratings yet'}
                  </span>
                  <span className="text-gray-500">({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})</span>
                </div>
                <div className="flex items-center gap-2 text-amber-600 font-medium">
                  <MessageSquare className="h-5 w-5" />
                  <span>{showReviews ? 'Hide Reviews' : 'Show Reviews'}</span>
                </div>
              </button>
            </div>

            {/* Reviews Section */}
            {showReviews && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Customer Reviews</h3>
                {reviewsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                  </div>
                ) : (
                  <ReviewsList 
                    reviews={reviews} 
                    avgRating={avgRating}
                    totalReviews={totalReviews}
                  />
                )}
              </div>
            )}

            {/* Price and Medium */}
            <div className="bg-gradient-to-r from-amber-50 to-rose-50 rounded-2xl shadow-lg p-6 border border-amber-100">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Price</p>
                  <p className="text-4xl font-bold text-gray-900">{getFormattedRupee(getBuyerPrice(artwork))}</p>
                  <p className="text-sm text-gray-500 mt-1">{BUYER_MARKUP_LABEL} included at checkout</p>
                </div>
                <div className="text-right">
                  {artwork.medium && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Palette className="h-5 w-5 text-amber-600" />
                      <span className="font-semibold">{artwork.medium}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-700 mt-2">
                    <Ruler className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold">{formatPaintingSize()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Artist Information */}
            {artist && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-amber-600" />
                  About the Artist
                </h3>
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-rose-500 rounded-full overflow-hidden flex-shrink-0 shadow-lg">
                    {artist.profile_picture ? (
                      <img src={getImageUrl(artist.profile_picture)} alt="Artist" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white text-2xl font-bold">
                        {artist.artist_name?.[0] || 'A'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-xl text-gray-900">{artist.artist_name || 'Artist Name'}</h4>
                    <p className="text-gray-600 mb-3 font-medium">{artist.art_style || 'Artist'}</p>
                    
                    {/* Artist Rating */}
                    {artist.avg_rating > 0 && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= Math.round(artist.avg_rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {artist.avg_rating.toFixed(1)} ({artist.total_reviews || 0} reviews)
                        </span>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {artist.location && (
                        <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
                          <MapPin className="h-4 w-4 text-amber-600" />
                          <span>{artist.location}</span>
                        </div>
                      )}
                      {artist.years_experience && (
                        <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
                          <Calendar className="h-4 w-4 text-amber-600" />
                          <span>{artist.years_experience} years</span>
                        </div>
                      )}
                      {artist.awards_won > 0 && (
                        <div className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
                          <Award className="h-4 w-4 text-amber-600" />
                          <span>{artist.awards_won} awards</span>
                        </div>
                      )}
                    </div>
                    {artist.bio && (
                      <p className="text-gray-600 mt-3 leading-relaxed">{artist.bio}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              <button
                onClick={() => {
                  // Check authentication using localStorage token
                  if (!isAuthenticated) {
                    // Store current page in location.state before redirecting
                    navigate('/login/user', {
                      state: { from: location.pathname + location.search }
                    });
                  } else {
                    navigate(`/ar-preview/${artwork._id}`);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
              >
                <Eye className="h-6 w-6" />
                View in AR
              </button>
              <div className="flex gap-4">
                <button
                  onClick={handleBuyNow}
                  disabled={artwork.status === 'sold'}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl ${
                    artwork.status === 'sold'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700'
                  }`}
                >
                  {artwork.status === 'sold' ? 'Sold Out' : 'Buy Now'}
                </button>
                <button
                  onClick={handleAddToCart}
                  disabled={artwork.status === 'sold'}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-bold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl ${
                    artwork.status === 'sold'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:from-amber-600 hover:to-rose-600'
                  }`}
                >
                  <ShoppingCart className="h-6 w-6" />
                  {artwork.status === 'sold' ? 'Sold Out' : 'Add to Cart'}
                </button>
                <button
                  onClick={handleAddToWishlist}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-110 shadow-md ${
                    isWishlisted
                      ? 'border-red-500 bg-red-50 text-red-500'
                      : 'border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-500 bg-white'
                  }`}
                >
                  <Heart className={`h-7 w-7 ${isWishlisted ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Additional Details */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-amber-600" />
                Artwork Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Created On</p>
                  <p className="font-semibold text-gray-900">{artwork?.created_at ? new Date(artwork.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not available'}</p>
                </div>
                {artwork.medium && (
                  <div className="bg-gradient-to-br from-amber-50 to-rose-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Medium</p>
                    <p className="font-semibold text-gray-900">{artwork.medium}</p>
                  </div>
                )}
                {(artwork.width || artwork.height) && (
                  <div className="bg-gradient-to-br from-amber-50 to-rose-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Size</p>
                    <p className="font-semibold text-gray-900">{formatPaintingSize()}</p>
                  </div>
                )}
                {artwork.subject && (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">Subject</p>
                    <p className="font-semibold text-gray-900">{artwork.subject}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Artworks */}
        {relatedArtworks.length > 0 && (
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <Palette className="h-8 w-8 text-amber-600" />
              Related Artworks
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedArtworks.map((relatedArt) => (
                <div
                  key={relatedArt._id}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-2 border border-gray-100 hover:border-amber-200"
                  onClick={() => navigate(`/artwork-details/${relatedArt._id}`)}
                >
                  <div className="h-56 bg-gray-200">
                    <img
                      src={getImageUrl(relatedArt.image_url) || 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg'}
                      alt={relatedArt.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg';
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">{relatedArt.category}</p>
                    <h3 className="font-bold text-gray-900 mb-1 truncate">{relatedArt.title}</h3>
                    <p className="text-xl font-bold text-gray-900">{getFormattedRupee(getBuyerPrice(relatedArt))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtworkDetails;
