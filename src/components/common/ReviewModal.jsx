import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { getImageUrl } from '../../lib/imageUtils';
import { toast } from 'react-hot-toast';

const ReviewModal = ({ isOpen, onClose, artwork, orderId, existingReview, onReviewSubmitted }) => {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditMode = !!existingReview;

    useEffect(() => {
        if (existingReview) {
            setRating(existingReview.rating);
            setComment(existingReview.comment);
        } else {
            setRating(0);
            setComment('');
        }
    }, [existingReview, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        if (comment.trim().length < 5) {
            toast.error('Please write at least 5 characters');
            return;
        }

        setIsSubmitting(true);

        try {
            let response;
            
            if (isEditMode) {
                response = await api.updateReview(existingReview._id, {
                    rating,
                    comment: comment.trim()
                });
            } else {
                response = await api.createReview({
                    artwork_id: artwork._id,
                    rating,
                    comment: comment.trim()
                });
            }

            if (response.success || response.message?.includes('successfully')) {
                toast.success(isEditMode ? 'Review updated successfully!' : 'Review submitted successfully!');
                onReviewSubmitted();
                setRating(0);
                setComment('');
                onClose();
            } else {
                toast.error(response.message || `Failed to ${isEditMode ? 'update' : 'submit'} review`);
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            const errorMsg = error.response?.data?.message || error.message || `Failed to ${isEditMode ? 'update' : 'submit'} review`;
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setRating(0);
            setComment('');
            onClose();
        }
    };

    const StarRating = () => {
        return (
            <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        className="focus:outline-none transition-transform hover:scale-110"
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        onClick={() => setRating(star)}
                    >
                        <svg
                            className={`w-10 h-10 ${
                                star <= (hoveredRating || rating)
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-gray-300'
                            }`}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                            />
                        </svg>
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Your Review' : 'Write a Review'}</h2>
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <img
                            src={getImageUrl(artwork.image_url) || 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg'}
                            alt={artwork.title}
                            className="w-20 h-20 object-cover rounded-lg"
                            onError={(e) => {
                                e.currentTarget.src = 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg';
                            }}
                        />
                        <div>
                            <h3 className="font-semibold text-gray-800 text-lg">{artwork.title}</h3>
                            <p className="text-sm text-gray-600">
                                {artwork.category} • {artwork.medium}
                            </p>
                            <div className="mt-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded inline-block">
                                ✓ Verified Purchase
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Rate this artwork<span className="text-red-500">*</span>
                        </label>
                        <StarRating />
                        {rating > 0 && (
                            <p className="mt-2 text-sm text-gray-600">
                                {rating === 1 && 'Poor'}
                                {rating === 2 && 'Fair'}
                                {rating === 3 && 'Good'}
                                {rating === 4 && 'Very Good'}
                                {rating === 5 && 'Excellent'}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="comment" className="block text-sm font-semibold text-gray-700 mb-2">
                            Your Review<span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Share your experience with this artwork... (minimum 5 characters)"
                            rows={6}
                            disabled={isSubmitting}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                            required
                        />
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-gray-500">
                                Minimum 5 characters required
                            </p>
                            <p className={`text-xs ${comment.trim().length >= 5 ? 'text-green-600' : 'text-gray-400'}`}>
                                {comment.trim().length} / 5
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || rating === 0 || comment.trim().length < 5}
                            className="flex-1 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                        >
                            {isSubmitting ? (isEditMode ? 'Updating...' : 'Submitting...') : (isEditMode ? 'Update Review' : 'Submit Review')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReviewModal;
