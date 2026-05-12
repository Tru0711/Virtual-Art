import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { getImageUrl } from '../../lib/imageUtils';
import { toast } from 'react-hot-toast';
import ReviewModal from '../common/ReviewModal';
import OrderDetailsModal from './OrderDetailsModal';
import { Star, Package, Clock, CheckCircle } from 'lucide-react';
import { getFormattedRupee } from '../../lib/pricing';

const MyOrders = () => {
    const [myOrders, setMyOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedArtwork, setSelectedArtwork] = useState(null);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [trackingOrderId, setTrackingOrderId] = useState(null);
    const [existingReview, setExistingReview] = useState(null);
    const [userReviews, setUserReviews] = useState({});
    const { profile } = useAuth();

    const fetchMyOrders = async () => {
        try {
            setLoading(true);
            const response = await api.getOrders();
            if (response.success) {
                setMyOrders(response.orders || []);
            } else {
                setMyOrders([]);
            }
        } catch (error) {
            setMyOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserReviews = async () => {
        try {
            const response = await api.getUserReviews();
            if (response.success) {
                const reviewsMap = {};
                response.reviews?.forEach(review => {
                    const artworkId = review.artwork_id?._id || review.artwork_id;
                    reviewsMap[artworkId] = review;
                });
                setUserReviews(reviewsMap);
            }
        } catch (error) {
        }
    };

    const handleRateReview = (artwork, orderId) => {
        const artworkId = artwork._id || artwork.id;
        const existingReview = userReviews[artworkId];
        
        setSelectedArtwork(artwork);
        setSelectedOrderId(orderId);
        setExistingReview(existingReview || null);
        setReviewModalOpen(true);
    };

    const handleReviewSubmitted = () => {
        fetchMyOrders();
        fetchUserReviews();
        toast.success('Review submitted successfully!');
    };

    useEffect(() => {
        if (profile) {
            fetchMyOrders();
            fetchUserReviews();
        }
    }, [profile]);

    const canReviewOrder = (order) => {
        const deliveryStatus = order?.delivery_status?.toLowerCase();
        const status = order?.status?.toLowerCase();
        
        if (deliveryStatus === 'delivered' || status === 'delivered' || status === 'completed') {
            return true;
        }
        
        const orderDate = order?.order_date || order?.created_at;
        if (orderDate) {
            const minutesSinceOrder = Math.floor((new Date() - new Date(orderDate)) / (1000 * 60));
            return minutesSinceOrder >= 5;
        }
        
        return false;
    };
    
    const isDelivered = (order) => {
        const deliveryStatus = order?.delivery_status?.toLowerCase();
        const status = order?.status?.toLowerCase();
        return deliveryStatus === 'delivered' || status === 'completed';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-rose-50 flex items-center justify-center pt-16">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Loading your orders...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-rose-50 pt-16 pb-16">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">My Orders</h1>
                    <div className="w-24 h-1 bg-amber-500 rounded-full mx-auto"></div>
                    <p className="text-gray-600 mt-4">Track and manage your artwork purchases</p>
                </div>

                {myOrders.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="h-12 w-12 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-xl mb-2">No orders found</p>
                        <p className="text-gray-400">Your purchased artworks will appear here</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {myOrders.map((order, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">Order ID:</span>
                                        <span className="font-mono text-sm font-medium text-gray-800 bg-white px-2 py-1 rounded border">
                                            {order._id?.slice(-8) || order.id?.slice(-8) || 'N/A'}
                                        </span>
                                        {isDelivered(order) && (
                                            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                Delivered
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="divide-y divide-gray-100">
                                    {order.items?.map((item, itemIndex) => {
                                        const productId = item.product?._id || item.product?.id || item.productId;
                                        const isReviewed = !!userReviews[productId];
                                        const canReview = canReviewOrder(order);
                                        
                                                        return (
                                            <div key={itemIndex} className="p-6 flex flex-col md:flex-row md:items-center gap-6">
                                                <div className="bg-gray-100 p-2 rounded-xl">
                                                    <img
                                                        src={getImageUrl(item.product?.image_url) || 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg'}
                                                        alt={item.product?.title}
                                                        className="w-24 h-24 object-cover rounded-lg"
                                                        onError={(e) => {
                                                            e.currentTarget.src = 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg';
                                                        }}
                                                    />
                                                </div>

                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold text-gray-800">
                                                        {item.product?.title || item.productTitle || 'Artwork'}
                                                    </h3>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        Category: {item.product?.category || 'N/A'}
                                                    </p>
                                                    
                                                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-4 w-4" />
                                                            {order.order_date 
                                                                ? new Date(order.order_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                                                                : order.created_at 
                                                                    ? new Date(order.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                                                                    : 'N/A'
                                                            }
                                                        </span>
                                                        <span>
                                                            Payment: {order.paymentType || order.payment_type || 'COD'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-3">
                                                    <p className="text-xl font-bold text-amber-600">
                                                        {getFormattedRupee(order.amount || order.total_amount || ((item.product?.price || item.price || 0) * (item.quantity || 1))) }
                                                    </p>
                                                    
                                                    {canReview && !isReviewed && (
                                                        <button
                                                            onClick={() => handleRateReview(item.product, order._id)}
                                                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                                        >
                                                            <Star className="h-4 w-4" />
                                                            Rate & Review
                                                        </button>
                                                    )}
                                                    
                                                    {isReviewed && (
                                                        <span className="px-4 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg flex items-center gap-2">
                                                            <CheckCircle className="h-4 w-4" />
                                                            Reviewed
                                                        </span>
                                                    )}
                                                    
                                                    {!canReview && !isReviewed && (
                                                        <span className="px-4 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg flex items-center gap-2">
                                                            <Clock className="h-4 w-4" />
                                                            Review after 5 min
                                                        </span>
                                                    )}

                                                    <button
                                                        onClick={() => setTrackingOrderId(order._id || order.id)}
                                                        className="mt-2 w-full md:w-auto px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                                    >
                                                        View Tracking
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedArtwork && (
                <ReviewModal
                    isOpen={reviewModalOpen}
                    onClose={() => {
                        setReviewModalOpen(false);
                        setSelectedArtwork(null);
                        setSelectedOrderId(null);
                        setExistingReview(null);
                    }}
                    artwork={selectedArtwork}
                    orderId={selectedOrderId}
                    existingReview={existingReview}
                    onReviewSubmitted={handleReviewSubmitted}
                />
            )}

            {trackingOrderId && (
                <OrderDetailsModal
                    orderId={trackingOrderId}
                    onClose={() => setTrackingOrderId(null)}
                />
            )}
        </div>
    );
};

export default MyOrders;
