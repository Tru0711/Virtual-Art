

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import { getImageUrl } from '../../lib/imageUtils';
import { Smartphone, Monitor, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ARView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const [artwork, setArtwork] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showDeviceSelection, setShowDeviceSelection] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const fetchArtwork = async () => {
      try {
        setIsLoading(true);
        // Use public endpoint for non-logged-in users
        const artworkData = await api.getPublicArtwork(id);
        setArtwork(artworkData);
      } catch (error) {
        console.error('Error fetching artwork:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchArtwork();
    }
  }, [id, loadAttempt]);

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setLoadAttempt((attempt) => attempt + 1);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleBack = () => {
    navigate(`/artwork-details/${id}`);
  };

  const handleDeviceSelect = (device) => {
    if (!artwork) return;
    
    // Navigate to the specific device route
    if (device === 'webcam') {
      navigate(`/ar-webcam/${artwork._id}`);
    } else if (device === 'desktop') {
      navigate(`/ar-3d-preview/${artwork._id}`);
    } else if (device === 'mobile') {
      navigate(`/ar-mobile/${artwork._id}`);
    }
  };

  const getArtworkDimensions = () => {
    if (!artwork) return { width: 24, height: 18, unit: 'inches' };
    return {
      width: artwork.width || 24,
      height: artwork.height || 18,
      unit: artwork.dimension_unit || 'inches'
    };
  };

  return (
    <div className="min-h-screen bg-gray-100 relative">
      {/* Device Selection Modal */}
      {showDeviceSelection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white border-2 border-purple-200 rounded-2xl shadow-2xl max-w-lg w-full p-8 relative">
            <button
              onClick={handleBack}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            
            <div className="text-center">
              <div className="mb-4 text-5xl">🖼️</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Choose Your Device</h2>
              <p className="text-gray-600 text-base mb-6">
                Select how you want to preview this artwork
              </p>

              {/* Artwork Info */}
              {artwork && (
                <div className="bg-purple-50 rounded-lg p-4 mb-6">
                  <p className="text-sm font-semibold text-purple-800">{artwork.title}</p>
                  <p className="text-xs text-purple-600">
                    Size: {getArtworkDimensions().width} × {getArtworkDimensions().height} {getArtworkDimensions().unit}
                  </p>
                </div>
              )}

              {/* Device Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Laptop with Webcam Option - NEW */}
                <button
                  onClick={() => handleDeviceSelect('webcam')}
                  className="flex flex-col items-center p-6 border-2 border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
                >
                  <svg className="h-16 w-16 text-purple-600 mb-3 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Laptop Webcam</h3>
                  <p className="text-sm text-gray-600 text-center">
                    See painting on your wall via webcam
                  </p>
                  <ul className="text-xs text-gray-500 mt-3 space-y-1">
                    <li>• Uses your webcam</li>
                    <li>• See on your wall</li>
                    <li>• Drag to position</li>
                  </ul>
                </button>

                {/* Laptop/Desktop Option */}
                <button
                  onClick={() => handleDeviceSelect('desktop')}
                  className="flex flex-col items-center p-6 border-2 border-blue-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <Monitor className="h-16 w-16 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Laptop / Desktop</h3>
                  <p className="text-sm text-gray-600 text-center">
                    Interactive 3D preview on a virtual wall
                  </p>
                  <ul className="text-xs text-gray-500 mt-3 space-y-1">
                    <li>• Drag to rotate</li>
                    <li>• Scroll to zoom</li>
                    <li>• Scale with controls</li>
                  </ul>
                </button>

                {/* Mobile Option */}
                <button
                  onClick={() => handleDeviceSelect('mobile')}
                  className="flex flex-col items-center p-6 border-2 border-green-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all group"
                >
                  <Smartphone className="h-16 w-16 text-green-600 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Mobile Device</h3>
                  <p className="text-sm text-gray-600 text-center">
                    Full AR experience on your wall
                  </p>
                  <ul className="text-xs text-gray-500 mt-3 space-y-1">
                    <li>• Point camera at wall</li>
                    <li>• Tap to place</li>
                    <li>• Resize to match</li>
                  </ul>
                </button>
              </div>

              <button
                onClick={handleBack}
                className="mt-6 text-gray-500 hover:text-gray-700 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={handleBack}
        className="absolute top-4 left-4 z-10 px-4 py-2 bg-white text-black rounded-lg shadow-lg hover:bg-gray-200 transition-colors"
      >
        ← Back
      </button>

      {/* AR Preview Container - Full Width */}
      <div className="w-full px-4 py-8">
        <div className="bg-white shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
            <h1 className="text-3xl font-bold text-center">AR Preview</h1>
            <p className="text-center text-purple-100 mt-2 text-lg">
              Experience "{artwork?.title || 'Artwork'}" in Augmented Reality
            </p>
          </div>

          {/* Artwork Display */}
          <div className="p-8">
            <div className="flex flex-col items-center space-y-8">
              {/* Artwork Image - Larger Display */}
              <div className="relative bg-gray-50 rounded-lg p-6 shadow-inner w-full max-w-2xl">
                {isLoading && (
                  <div className="w-full h-80 bg-gray-200 rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600"></div>
                  </div>
                )}

                {!hasError && artwork ? (
                  <img
                    src={getImageUrl(artwork.watermarked_image_url || artwork.watermarkedImage || artwork.image_url) || 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg'}
                    alt={artwork.title || "Artwork for AR placement"}
                    className={`w-full max-h-96 object-contain rounded-lg shadow-md transition-opacity duration-300 ${
                      isLoading ? 'opacity-0' : 'opacity-100'
                    }`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                ) : (
                  <div className="w-full h-80 bg-gray-200 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <div className="text-6xl mb-4">🖼️</div>
                      <p className="text-xl">{hasError ? 'Failed to load artwork' : 'Artwork preview not available'}</p>
                      {hasError && (
                        <button
                          type="button"
                          onClick={handleRetry}
                          className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* AR / 3D Instructions */}
              <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-blue-900 mb-3">
                    Laptop / Desktop
                  </h3>
                  <ul className="text-blue-700 text-base space-y-1">
                    <li>• 3D Preview on virtual wall</li>
                    <li>• Drag to rotate • Scroll to zoom</li>
                    <li>• Scale with +/- controls</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-green-900 mb-3">
                    Mobile (AR)
                  </h3>
                  <ul className="text-green-700 text-base space-y-1">
                    <li>• Point camera at a wall</li>
                    <li>• Tap to place artwork</li>
                    <li>• Reposition and scale</li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-6">
                <button
                  onClick={handleBack}
                  className="px-8 py-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-lg font-medium"
                >
                  Back to Artwork
                </button>
                <button
                  onClick={() => setShowDeviceSelection(true)}
                  disabled={!artwork}
                  className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start AR Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ARView;
