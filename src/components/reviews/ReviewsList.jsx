import React from 'react';
import { Star } from 'lucide-react';
import { DEFAULT_ARTWORK_IMAGE_URL, getImageUrl } from '../../lib/imageUtils';

const ReviewsList = ({ reviews = [], ratingBreakdown = null, avgRating = 0, totalReviews = 0 }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {(totalReviews > 0 || ratingBreakdown) && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-8">
            {/* Average Rating */}
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900">{avgRating.toFixed(1)}</div>
              <div className="flex gap-1 justify-center my-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= Math.round(avgRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600">{totalReviews} reviews</p>
            </div>

            {/* Rating Breakdown */}
            {ratingBreakdown && (
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = ratingBreakdown[stars] || 0;
                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 w-8">{stars}</span>
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500 w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <p className="text-gray-500 text-lg">No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review._id}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-start gap-4">
                {/* User Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-rose-500 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {review.user_id?.full_name?.[0] || 'U'}
                </div>

                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {review.user_id?.full_name || 'Anonymous'}
                      </h4>
                      <p className="text-sm text-gray-500">{formatDate(review.created_at)}</p>
                    </div>
                    {/* Rating Stars */}
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-5 w-5 ${
                            star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Artwork Reference */}
                  {review.artwork_id && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm text-gray-500">Reviewing:</span>
                      <span className="text-sm font-medium text-amber-600">
                        {review.artwork_id.title || 'Artwork'}
                      </span>
                      {review.artwork_id.image_url && (
                        <img
                          src={getImageUrl(review.artwork_id.image_url)}
                          alt={review.artwork_id.title}
                          className="w-8 h-8 rounded-md object-cover"
                          onError={(event) => {
                            event.currentTarget.src = DEFAULT_ARTWORK_IMAGE_URL;
                          }}
                        />
                      )}
                    </div>
                  )}

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsList;
