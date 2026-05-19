import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { getFormattedRupee } from '../../lib/pricing';
import { DEFAULT_ARTWORK_IMAGE_URL, getImageUrl } from '../../lib/imageUtils';
// eslint-disable-next-line no-unused-vars
import Navbar from '../layout/Navbar';
// eslint-disable-next-line no-unused-vars
import ArtistHeader from './ArtistHeader';
// eslint-disable-next-line no-unused-vars
import ArtistStatsCards from './ArtistStatsCards';
// eslint-disable-next-line no-unused-vars
import ArtistOverviewTab from './ArtistOverviewTab';
// eslint-disable-next-line no-unused-vars
import ArtistArtworksTab from './ArtistArtworksTab';
// eslint-disable-next-line no-unused-vars
import ArtistOrdersTab from './ArtistOrdersTab';
// eslint-disable-next-line no-unused-vars
import ArtistReviewsTab from './ArtistReviewsTab';

const ArtistProfileDashboard = () => {
  const navigate = useNavigate();
  const { profile, artistProfile, refreshProfile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [artworks, setArtworks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isFetchingRef = useRef(false);
  const initialFetchDone = useRef(false);
  const [stats, setStats] = useState({
    totalUploads: 0,
    avgRating: 0,
    orders: 0,
  });
  const [wallet, setWallet] = useState({ balance: 0, total_credits: 0, total_debits: 0, currency: 'INR' });
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [walletSummary, setWalletSummary] = useState({ total_earnings: 0, pending_amount: 0, total_sold_artworks: 0 });
  const [walletLoading, setWalletLoading] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  function checkPaymentStatus() {
    return api.checkPaymentStatus()
      .then((response) => {
        setPaymentCompleted(response?.is_completed || false);
      })
      .catch((error) => {
        console.error('Error checking payment status:', error);
        setPaymentError(error?.message || 'Could not check payment status');
      });
  }

  function loadWalletData() {
    setWalletLoading(true);
    return api.getArtistWallet()
      .then((response) => {
        if (response?.success) {
          setWallet(response.wallet || { balance: 0, total_credits: 0, total_debits: 0, currency: 'INR' });
          setWalletTransactions(response.transactions || []);
          setWalletSummary(response.summary || { total_earnings: 0, pending_amount: 0, total_sold_artworks: 0 });
        }
      })
      .catch((error) => {
        console.error('Error loading wallet data:', error);
      })
      .finally(() => setWalletLoading(false));
  }

  const renderEarningsTab = () => {
    const paidTransactions = walletTransactions.filter((transaction) => transaction.status === 'paid');
    const recentPayments = walletTransactions.slice(0, 10);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm text-emerald-700">Total Earnings</p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{getFormattedRupee(walletSummary.total_earnings)}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm text-amber-700">Pending Amount</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{getFormattedRupee(walletSummary.pending_amount)}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-sm text-slate-700">Total Sold Artworks</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{walletSummary.total_sold_artworks || paidTransactions.length}</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payments Received</h3>
          <div className="space-y-3">
            {walletLoading && <p className="text-sm text-gray-500">Loading payments...</p>}

            {!walletLoading && !recentPayments.length && (
              <p className="text-sm text-gray-500">No payments received yet.</p>
            )}

            {recentPayments.map((transaction) => (
              <div key={transaction._id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  {transaction.artwork_id?.image_url ? (
                    <img
                      src={getImageUrl(transaction.artwork_id.image_url)}
                      alt={transaction.artwork_id?.title || 'Artwork'}
                      className="h-14 w-14 rounded-md object-cover border border-gray-200"
                      onError={(event) => {
                        event.currentTarget.src = DEFAULT_ARTWORK_IMAGE_URL;
                      }}
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-md bg-gray-200" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{transaction.artwork_id?.title || transaction.metadata?.title || 'Artwork sale'}</p>
                    <p className="text-xs text-gray-500">Buyer: {transaction.buyer_id?.full_name || transaction.buyer_id?.email || 'Unknown buyer'}</p>
                    <p className="text-xs text-gray-500">{new Date(transaction.payment_date || transaction.created_at || transaction.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div className="text-left md:text-right">
                  <p className="font-semibold text-emerald-700">{getFormattedRupee(transaction.artist_amount || transaction.artist_share)}</p>
                  <p className={`text-xs capitalize ${
                    transaction.status === 'paid' ? 'text-emerald-600' :
                    transaction.status === 'initiated' ? 'text-amber-600' :
                    'text-red-600'
                  }`}>
                    {transaction.status === 'paid' ? 'success' : transaction.status === 'initiated' ? 'pending' : 'failed'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    // Wait for auth to finish loading before fetching dashboard data
    if (authLoading) {
      return;
    }

    // Only fetch on initial load, not on every profile change
    if (!initialFetchDone.current && (profile?._id || profile?.id)) {
      initialFetchDone.current = true;
      fetchDashboardData();
      refreshProfile();
    } else if (!initialFetchDone.current && profile) {
      initialFetchDone.current = true;
      fetchDashboardData();
    }

    const handleArtworkUploaded = () => {
      fetchDashboardData();
    };

    window.addEventListener('artworkUploaded', handleArtworkUploaded);

    return () => {
      window.removeEventListener('artworkUploaded', handleArtworkUploaded);
    };
  }, [authLoading, profile?._id, profile?.id]);

  useEffect(() => {
    if (!authLoading && profile?.user_type === 'artist' && paymentCompleted === false) {
      navigate('/artist/payment-settings');
    }
  }, [authLoading, profile?.user_type, paymentCompleted, navigate]);

  useEffect(() => {
    if (!authLoading && profile?.id && profile?.user_type === 'artist') {
      checkPaymentStatus();
      loadWalletData();
    }

    const handlePaymentUpdated = () => {
      checkPaymentStatus();
      loadWalletData();
    };

    window.addEventListener('paymentUpdated', handlePaymentUpdated);
    return () => window.removeEventListener('paymentUpdated', handlePaymentUpdated);
  }, [authLoading, profile?.id]);

  const fetchDashboardData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setLoading(true);
    setError(null);

    try {
      // Fetch data sequentially with individual error handling
      const statsRes = await api.getArtistDashboardStats().catch(() => null);
      const artworksRes = await api.getMyArtworks().catch(() => []);
      const ordersRes = await api.getArtistOrders().catch(() => []);
      const reviewsRes = await api.getArtistReviews().catch(() => []);

      // Handle stats response
      if (statsRes?.success && statsRes?.stats) {
        setStats({
          totalUploads: statsRes.stats.totalUploads || 0,
          avgRating: statsRes.stats.avgRating || 0,
          orders: statsRes.stats.orders || 0,
        });
      }

      // Handle artworks response
      const artworksData = Array.isArray(artworksRes)
        ? artworksRes
        : artworksRes?.artworks || artworksRes?.data || [];

      // Handle orders response
      const ordersData =
        ordersRes?.success && Array.isArray(ordersRes.orders)
          ? ordersRes.orders
          : Array.isArray(ordersRes)
          ? ordersRes
          : [];

      // Handle reviews response
      const reviewsData =
        reviewsRes?.success && Array.isArray(reviewsRes.reviews)
          ? reviewsRes.reviews
          : Array.isArray(reviewsRes)
          ? reviewsRes
          : [];

      setArtworks(artworksData);
      setOrders(ordersData);
      setReviews(reviewsData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <ArtistHeader
        profile={profile}
        artistProfile={artistProfile}
        onProfilePictureUpdate={() => {
          refreshProfile();
          fetchDashboardData();
        }}
      />

      <ArtistStatsCards stats={stats} />

      {error && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="font-medium">Error loading dashboard data</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {paymentError && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
            <p className="font-medium">Payment status unavailable</p>
            <p className="text-sm">{paymentError}</p>
          </div>
        </div>
      )}

      {paymentCompleted === false && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Complete your payment settings to upload artwork</p>
              <p className="text-sm">Artwork uploads are disabled until your bank details are saved.</p>
            </div>
            <button
              onClick={() => navigate('/artist/payment-settings')}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
            >
              Open Payment Settings
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 pb-4">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Artist Wallet Balance</p>
              <p className="text-3xl font-bold text-gray-900">
                {walletLoading ? 'Loading...' : getFormattedRupee(wallet.balance)}
              </p>
            </div>
            <div className="text-sm text-gray-600">
              <p>Total Credits: {getFormattedRupee(wallet.total_credits)}</p>
              <p>Total Debits: {getFormattedRupee(wallet.total_debits)}</p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Recent Transactions</h3>
            <div className="space-y-3">
              {walletTransactions.slice(0, 5).map((transaction) => (
                <div key={transaction._id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div>
                    <p className="font-medium text-gray-900">{transaction.artwork_id?.title || transaction.metadata?.title || 'Artwork sale'}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.created_at || transaction.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-700">+{getFormattedRupee(transaction.artist_amount)}</p>
                    <p className="text-xs text-gray-500">{transaction.status}</p>
                  </div>
                </div>
              ))}
              {!walletTransactions.length && !walletLoading && (
                <p className="text-sm text-gray-500">No wallet transactions yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">
                Loading dashboard data...
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            
            {/* Premium Tabs */}
            <div className="border-b border-gray-200 bg-gray-50">
              <nav className="flex overflow-x-auto px-6 py-3 space-x-4">
                {[
                  { value: 'overview', label: 'Overview' },
                  { value: 'artworks', label: 'Artworks' },
                  { value: 'orders', label: 'Orders' },
                  { value: 'reviews', label: 'Reviews' },
                  { value: 'earnings', label: 'My Earnings' },
                ].map((tabItem) => (
                    <button
                      key={tabItem.value}
                      onClick={() => setActiveTab(tabItem.value)}
                      className={`relative px-5 py-3 text-sm font-semibold rounded-lg transition-all duration-300 whitespace-nowrap
                        ${
                          activeTab === tabItem.value
                            ? 'text-blue-600 bg-white shadow-sm'
                            : 'text-gray-500 hover:text-blue-600 hover:bg-white/70'
                        }`}
                    >
                      {tabItem.label}

                      <span
                        className={`absolute left-0 -bottom-2 h-0.5 w-full transition-all duration-300 ${
                          activeTab === tabItem.value
                            ? 'bg-blue-600'
                            : 'bg-transparent'
                        }`}
                      />
                    </button>
                  ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <ArtistOverviewTab
                  orders={orders}
                  artworks={artworks}
                  stats={stats}
                />
              )}

              {activeTab === 'artworks' && (
                <ArtistArtworksTab
                  artworks={artworks}
                  profile={profile}
                  artistProfile={artistProfile}
                  onArtworkDeleted={(artworkId) => {
                    if (artworkId) {
                      setArtworks((prev) =>
                        prev.filter(
                          (art) => (art._id || art.id) !== artworkId
                        )
                      );
                    }
                    fetchDashboardData();
                  }}
                  onArtworkUploaded={() => {
                    window.dispatchEvent(
                      new CustomEvent('artworkUploaded')
                    );
                  }}
                />
              )}

              {activeTab === 'orders' && (
                <ArtistOrdersTab orders={orders} />
              )}

              {activeTab === 'reviews' && (
                <ArtistReviewsTab reviews={reviews} />
              )}

              {activeTab === 'earnings' && renderEarningsTab()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistProfileDashboard;
