import React from "react";
import { useNavigate } from "react-router-dom";
import { resolveArtworkImageUrl } from "../../lib/imageUtils";
import { useAuth } from "../../contexts/AuthContext";

export default function ArtworkCard({
  image,
  title,
  category,
  description,
  price,
  artistName,
  rating,
  artworkId: propArtworkId,
  artwork,
  isInWishlist,
  onAddToCart,
  onToggleWishlist,
  onViewDetails,
  showArtistName = true,
}) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Extract artworkId from props
  const resolvedArtworkId = propArtworkId || artwork?._id || artwork?.id;

  const handleViewDetails = () => {
    // Allow viewing artwork details without login
    navigate(`/artwork-details/${resolvedArtworkId}`);
  };

  const handleAddToCart = (e) => {
    e?.stopPropagation();
    if (onAddToCart) {
      onAddToCart(resolvedArtworkId);
    }
  };

  const handleToggleWishlist = (e) => {
    e?.stopPropagation();
    if (onToggleWishlist) {
      onToggleWishlist(resolvedArtworkId);
    }
  };

  const resolvedCategory = category || "General";
  const resolvedTitle = title || "Untitled";
  const resolvedArtistName = artistName || "Unknown Artist";
  const resolvedDescription = description || "No description";
  // Handle both rating and avg_rating fields
  const resolvedRating = rating ?? artwork?.avg_rating ?? 0;
  const resolvedPrice = Number(price || 0);

  const resolvedImageUrl =
    resolveArtworkImageUrl(artwork) ||
    resolveArtworkImageUrl(image) ||
    (typeof image === 'string' ? image : null) ||
    null;
  
  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl overflow-hidden flex flex-col border border-gray-100 hover:border-orange-200 transition-all duration-300 hover:-translate-y-1">
      <div className="w-full h-[250px] bg-gray-100 overflow-hidden">
        {resolvedImageUrl ? (
          <img
            src={resolvedImageUrl}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            alt={resolvedTitle}
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300">
            <div className="text-center px-4">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/80 text-xl font-semibold text-gray-500 shadow-sm">
                {resolvedTitle.charAt(0).toUpperCase()}
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">No image</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-2">
          {resolvedCategory}
        </p>
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-1 mb-1">
          {resolvedTitle}
        </h3>
        {showArtistName && (
          <p className="text-sm text-gray-600 mb-3 flex items-center gap-1">
            <span className="text-gray-400">by</span>
            <span className="font-medium">{resolvedArtistName}</span>
          </p>
        )}
        <p className="text-gray-600 text-sm mb-2">{resolvedDescription}</p>

        {/* Only show rating if it exists and is greater than 0 */}
        {resolvedRating > 0 && (
          <div className="flex items-center mb-2">
            {[...Array(5)].map((_, index) => (
              <span
                key={index}
                className={`text-sm ${
                  index < resolvedRating ? "text-yellow-400" : "text-gray-300"
                }`}
              >
                ★
              </span>
            ))}
            <span className="text-sm text-gray-600 ml-1">({resolvedRating})</span>
          </div>
        )}

        <p className="text-gray-800 font-semibold mb-4">
          ₹{resolvedPrice.toLocaleString("en-IN")}
        </p>

        <div className="flex gap-2 mt-auto items-center">
          <button
            className="flex-1 bg-orange-500 text-white py-2 rounded-2xl hover:bg-orange-600 shadow-md hover:shadow-lg transition-all duration-300 font-medium text-sm cursor-pointer"
            onClick={handleViewDetails}
          >
            View Details
          </button>
          <button
            className="p-2 text-2xl hover:scale-110 transition-transform duration-300 rounded-full hover:bg-gray-100"
            onClick={handleAddToCart}
            title="Add to Cart"
          >
            🛒
          </button>
          <button
            className="p-2 text-2xl hover:scale-110 transition-transform duration-300 rounded-full hover:bg-gray-100"
            onClick={handleToggleWishlist}
            title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
          >
            {isInWishlist ? "❤️" : "🤍"}
          </button>
        </div>
      </div>
    </div>
  );
}
