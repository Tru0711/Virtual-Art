import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import { getImageUrl } from '../../lib/imageUtils';
import { ArrowLeft, ShoppingCart, Star, User, AlertCircle, ZoomIn, ZoomOut, RotateCw, Move } from 'lucide-react';
import { toastSuccess, toastError } from '../../lib/toast';
import { useAuth } from '../../contexts/AuthContext';

const Desktop3DPreview = () => {
  const { artworkId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const [artwork, setArtwork] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  
  // 3D Preview controls
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const fetchArtwork = async () => {
      try {
        setIsLoading(true);
        // Use public endpoint for non-logged-in users
        const artworkData = await api.getPublicArtwork(artworkId);
        setArtwork(artworkData);
      } catch (error) {
        console.error('Error fetching artwork:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (artworkId) {
      fetchArtwork();
    }
  }, [artworkId, loadAttempt]);

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setLoadAttempt((attempt) => attempt + 1);
  };

  const handleBack = () => {
    navigate(`/ar-preview/${artworkId}`);
  };

  const handleAddToCart = async () => {
    // Check if user is logged in
    if (!profile?.user_type) {
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const artworkImageUrl = artwork 
    ? getImageUrl(artwork.watermarked_image_url || artwork.watermarkedImage || artwork.image_url) 
    : 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading artwork...</p>
        </div>
      </div>
    );
  }

  if (hasError || !artwork) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-gray-800 rounded-2xl p-8">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-white text-xl mb-4">Failed to load artwork</p>
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 mr-3"
          >
            Retry
          </button>
          <button
            onClick={() => navigate('/artworks')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Browse Artworks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 relative">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="absolute top-4 left-4 z-20 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Device Selection
      </button>

      {/* Fullscreen Toggle */}
      <button
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 z-20 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
      >
        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      </button>

      {/* 3D Preview Container */}
      <div className="w-full h-screen relative overflow-hidden">
        {/* Virtual Wall Background */}
        <div 
          className="w-full h-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          }}
        >
          {/* Artwork on Virtual Wall */}
          <div
            className="relative transition-transform duration-300"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
            }}
          >
            <img
              src={artworkImageUrl}
              alt={artwork.title}
              className="max-w-2xl md:max-w-3xl lg:max-w-4xl shadow-2xl rounded-lg"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px rgba(139, 92, 246, 0.2)',
              }}
            />
            
            {/* Artwork Frame Effect */}
            <div className="absolute -inset-4 border-4 border-amber-700/50 rounded-lg -z-10 transform translate-z-[-20px]"></div>
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-lg hidden lg:block">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <ZoomIn className="h-4 w-4" />
              <span>Zoom In/Out</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCw className="h-4 w-4" />
              <span>Rotate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls and Info Panel */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/90 to-transparent p-6">
        <div className="max-w-6xl mx-auto">
          {/* Scale and Rotation Controls */}
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={() => setScale(s => Math.max(0.3, s - 0.1))}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
            >
              <ZoomOut className="h-4 w-4" />
              Zoom Out
            </button>
            <span className="px-4 py-2 bg-white/10 text-white rounded-lg flex items-center gap-2">
              <Move className="h-4 w-4" />
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(2, s + 0.1))}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
            >
              <ZoomIn className="h-4 w-4" />
              Zoom In
            </button>
            <div className="w-px bg-white/20 mx-2"></div>
            <button
              onClick={() => setRotation(r => r - 15)}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            >
              ↺ Rotate Left
            </button>
            <button
              onClick={() => setRotation(0)}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={() => setRotation(r => r + 15)}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
            >
              Rotate Right ↻
            </button>
          </div>

          {/* Artwork Info */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-white">
              <h2 className="text-2xl font-bold">{artwork.title}</h2>
              <div className="flex items-center gap-4 mt-1">
                {artwork.artist_id && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{artwork.artist_id.artist_name || 'Artist'}</span>
                  </div>
                )}
                {artwork.avg_rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span>{artwork.avg_rating.toFixed(1)}</span>
                  </div>
                )}
                <span className="text-blue-400 font-bold text-xl">
                  ₹{Number(artwork.price).toLocaleString("en-IN")}
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Size: {artwork.width || 24} × {artwork.height || 18} {artwork.dimension_unit || 'inches'}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleBack}
                className="px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
              >
                Change Device
              </button>
              <button
                onClick={handleAddToCart}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:from-blue-600 hover:to-cyan-700 flex items-center gap-2"
              >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Desktop3DPreview;
