import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { getImageUrl } from '../../lib/imageUtils';
import { toastError, toastSuccess } from '../../lib/toast';
// eslint-disable-next-line no-unused-vars
import ArtworkCard from '../artworks/ArtworkCard';
import { useAuth } from '../../contexts/AuthContext';
import VREntryPopup from '../common/VREntryPopup';

const PublicArtistProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [artistProfile, setArtistProfile] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVRPopup, setShowVRPopup] = useState(false);
  const [selectedGalleryId, setSelectedGalleryId] = useState(null);
  
  // Email customization state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSubject, setEmailSubject] = useState('Artwork Inquiry');
  const [emailBody, setEmailBody] = useState('Hello, I am interested in your artwork.');

  // Check if current user is a buyer
  const isBuyer = profile?.user_type === 'user';

  useEffect(() => {
    if (id) {
      fetchArtistData();
      // Only fetch wishlist if user is logged in
      if (profile?.user_type) {
        fetchWishlist();
      }
    }
  }, [id, profile?.user_type]);

  const fetchArtistData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const response = await api.getArtist(id);
      const profile = response?.artist ?? null;
      const artistArtworks = response?.artworks ?? [];

      if (!profile) {
        setError('Artist profile not found.');
        setArtistProfile(null);
        setArtworks([]);
      } else {
        setArtistProfile(profile);
        setArtworks(Array.isArray(artistArtworks) ? artistArtworks : []);
      }
    } catch (err) {
      console.error('Error fetching artist data:', err);
      setError(err?.message || 'Failed to load artist profile');
      setArtistProfile(null);
      setArtworks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlist = async () => {
    // Skip if no user is logged in
    if (!profile?.user_type) {
      setWishlist([]);
      return;
    }
    try {
      const wishlistData = await api.getWishlist();
      setWishlist(wishlistData || []);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      setWishlist([]);
    }
  };

  const resolveArtworkImage = (artwork) => {
    return (
      artwork?.image_url ||
      artwork?.watermarked_image_url ||
      artwork?.watermarkedImage ||
      artwork?.imageUrl ||
      ''
    );
  };

  const resolveArtworkDescription = (artwork) => {
    return (
      artwork?.description ||
      artwork?.details ||
      artwork?.summary ||
      ''
    );
  };

  const handleAddToCart = async (artwork) => {
    // Check if user is logged in
    if (!profile?.user_type) {
      navigate('/login/user', {
        state: { from: window.location.pathname }
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
    } catch (error) {
      console.error('Error adding to cart:', error);
      toastError('Failed to add item to cart. Please try again.');
    }
  };

  const handleWishlistToggle = async (artworkId) => {
    // Check if user is logged in
    if (!profile?.user_type) {
      navigate('/login/user', {
        state: { from: window.location.pathname }
      });
      return;
    }
    try {
      const isInWishlist = wishlist.some(item => item.artwork_id === artworkId);
      if (isInWishlist) {
        await api.removeFromWishlist(artworkId);
      } else {
        await api.addToWishlist(artworkId);
      }
      const updatedWishlist = await api.getWishlist();
      setWishlist(updatedWishlist || []);
      window.dispatchEvent(new CustomEvent('wishlistUpdated'));
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-300 via-white to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading artist profile...</p>
        </div>
      </div>
    );
  }

  if (error || !artistProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Artist Not Found</h1>
          <p className="text-gray-600">{error || 'The artist profile you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  // Prepare data for template (guard so profile always displays)
  const ARTIST_PROFILE_IMAGE = getImageUrl(artistProfile.profile_picture) || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face';
  const ARTIST_NAME = artistProfile.artist_name || artistProfile.full_name || 'Artist';
  const ARTIST_TITLE = artistProfile.art_style || 'Artist';
  const ARTIST_LOCATION = artistProfile.location || 'Location not specified';
  const YEARS_EXPERIENCE = Number(artistProfile.years_experience ?? 0);
  const EXHIBITIONS = Number(artistProfile.exhibitions ?? 0);
  const AWARDS_WON = Number(artistProfile.awards_won ?? 0);
  const ARTWORKS_SOLD = Number(artistProfile.artworks_sold ?? 0);
  const ABOUT_ARTIST_TEXT = artistProfile.bio || `${ARTIST_NAME} is a talented artist on our platform.`;
  
  // Contact info
  const ARTIST_EMAIL = artistProfile.email || '';
  const ARTIST_PHONE = artistProfile.phone || '';

  const socialLinks = artistProfile.social_links && typeof artistProfile.social_links === 'object' ? artistProfile.social_links : {};
  const INSTAGRAM_LINK = socialLinks.instagram || '#';
  const FACEBOOK_LINK = socialLinks.facebook || '#';
  const WEBSITE_LINK = artistProfile.portfolio_link || '#';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-rose-50 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-amber-200/60 to-rose-200/40 blur-3xl"></div>
      <div className="pointer-events-none absolute top-40 -right-24 h-80 w-80 rounded-full bg-gradient-to-br from-orange-200/40 to-amber-100/30 blur-3xl"></div>
      {/* HERO SECTION */}
      <header className="relative h-80 w-full flex items-end justify-center bg-gradient-to-br from-amber-200/80 via-amber-100/60 to-rose-200/60">
        {/* Light Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/40"></div>
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-amber-900/40 to-transparent"></div>

        {/* Content */}
        <div className="relative text-center text-white pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] uppercase tracking-[0.2em] text-amber-100">
            Featured Artist
          </div>

          <div className="mt-4 inline-flex items-center justify-center rounded-full p-1 bg-gradient-to-br from-amber-200/80 via-white/60 to-rose-200/60">
            <img
              src={ARTIST_PROFILE_IMAGE}
              alt={ARTIST_NAME}
              className="w-28 h-28 rounded-full border-4 border-white/80 object-cover"
            />
          </div>

          <h1 className="text-4xl font-bold mt-3 tracking-tight">{ARTIST_NAME}</h1>
          <p className="text-sm opacity-90 mt-1">{ARTIST_TITLE}</p>

          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/25 backdrop-blur-sm text-xs">
            <i className="fa-solid fa-location-dot text-amber-200"></i>
            <span>{ARTIST_LOCATION}</span>
          </div>
        </div>
      </header>

      {/* STATS SECTION */}
      <section className="max-w-6xl mx-auto px-4 -mt-10 fade-in-soft">
        <div className="rounded-3xl bg-gradient-to-br from-amber-50 via-white to-orange-50/80 p-6 sm:p-8 shadow-[0_20px_45px_rgba(15,23,42,0.08)] border border-amber-100/70">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[11px] uppercase tracking-[0.2em] text-amber-600 font-semibold">Highlights</span>
            <div className="h-px flex-1 bg-gradient-to-r from-amber-300/70 to-transparent"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-white via-amber-50 to-orange-100/70 p-6 rounded-2xl shadow-[0_12px_30px_rgba(15,23,42,0.08)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.14)] text-center border border-amber-100/70 transition-all duration-300 ease-out hover:-translate-y-1.5">
              <div className="text-amber-600 text-3xl mb-3">
                <i className="fa-solid fa-clock"></i>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">{YEARS_EXPERIENCE}</h2>
              <p className="text-xs uppercase tracking-[0.08em] text-gray-500 mt-1">Years Experience</p>
            </div>

            <div className="bg-gradient-to-br from-white via-amber-50 to-orange-100/70 p-6 rounded-2xl shadow-[0_12px_30px_rgba(15,23,42,0.08)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.14)] text-center border border-amber-100/70 transition-all duration-300 ease-out hover:-translate-y-1.5">
              <div className="text-amber-600 text-3xl mb-3">
                <i className="fa-solid fa-image"></i>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">{EXHIBITIONS}</h2>
              <p className="text-xs uppercase tracking-[0.08em] text-gray-500 mt-1">Exhibitions</p>
            </div>

            <div className="bg-gradient-to-br from-white via-amber-50 to-orange-100/70 p-6 rounded-2xl shadow-[0_12px_30px_rgba(15,23,42,0.08)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.14)] text-center border border-amber-100/70 transition-all duration-300 ease-out hover:-translate-y-1.5">
              <div className="text-amber-600 text-3xl mb-3">
                <i className="fa-solid fa-award"></i>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">{AWARDS_WON}</h2>
              <p className="text-xs uppercase tracking-[0.08em] text-gray-500 mt-1">Awards Won</p>
            </div>

            <div className="bg-gradient-to-br from-white via-amber-50 to-orange-100/70 p-6 rounded-2xl shadow-[0_12px_30px_rgba(15,23,42,0.08)] hover:shadow-[0_18px_36px_rgba(15,23,42,0.14)] text-center border border-amber-100/70 transition-all duration-300 ease-out hover:-translate-y-1.5">
              <div className="text-amber-600 text-3xl mb-3">
                <i className="fa-solid fa-bag-shopping"></i>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">{ARTWORKS_SOLD}</h2>
              <p className="text-xs uppercase tracking-[0.08em] text-gray-500 mt-1">Artworks Sold</p>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="max-w-5xl mx-auto bg-white mt-12 p-8 sm:p-10 rounded-3xl shadow-[0_18px_45px_rgba(15,23,42,0.08)] border border-amber-100/70 border-l-4 border-l-amber-400 fade-in-soft relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-amber-200/40 to-transparent blur-2xl"></div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[11px] uppercase tracking-[0.2em] text-amber-600 font-semibold">Story</span>
          <div className="h-px flex-1 bg-gradient-to-r from-amber-300/70 to-transparent"></div>
        </div>
        <h2 className="text-3xl font-bold mb-4 text-gray-800 tracking-tight">About the Artist</h2>

        <p className="text-gray-700 leading-[1.8] tracking-[0.01em]">
          {ABOUT_ARTIST_TEXT}
        </p>

        {/* Contact Details Section - Only shown to buyers */}
        {isBuyer && (ARTIST_EMAIL || ARTIST_PHONE) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Contact Details</h3>
            <div className="flex flex-wrap gap-4 mb-4">
              {ARTIST_EMAIL && (
                <button 
                  onClick={() => setShowEmailForm(!showEmailForm)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  <i className="fa-solid fa-envelope"></i>
                  <span>Send Email</span>
                </button>
              )}
              {ARTIST_PHONE && (
                <a 
                  href={`tel:${ARTIST_PHONE}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
                >
                  <i className="fa-solid fa-phone"></i>
                  <span>Call</span>
                </a>
              )}
            </div>
            
            {/* Email Customization Form */}
            {showEmailForm && ARTIST_EMAIL && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Customize Your Email</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="Enter email subject"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Message</label>
                    <textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                      placeholder="Enter your message"
                    />
                  </div>
                  <a 
                    href={`https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${encodeURIComponent(ARTIST_EMAIL)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-lg transition-all shadow-md hover:shadow-lg text-sm"
                  >
                    <i className="fa-solid fa-paper-plane"></i>
                    <span>Open Gmail</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Social Buttons */}
        <div className="flex gap-4 mt-6 flex-wrap">
          {INSTAGRAM_LINK !== '#' && (
            <a href={INSTAGRAM_LINK} className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-lg" target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          )}

          {FACEBOOK_LINK !== '#' && (
            <a href={FACEBOOK_LINK} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-lg" target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
          )}

          {WEBSITE_LINK !== '#' && (
            <a href={WEBSITE_LINK} className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white px-4 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-lg" target="_blank" rel="noopener noreferrer">
              Visit Website
            </a>
          )}

          <button
            type="button"
            onClick={() => {
              setSelectedGalleryId(null);
              setShowVRPopup(true);
            }}
            className="bg-gradient-to-r from-slate-800 to-slate-900 hover:from-black hover:to-slate-800 text-white px-4 py-2 rounded-lg text-sm transition-all shadow-md hover:shadow-lg"
          >
            Enter VR Gallery
          </button>
        </div>
      </section>

      {/* ARTWORKS SECTION */}
      {artworks.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 mt-12 mb-12 fade-in-soft">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-amber-600 font-semibold">Collection</p>
              <h2 className="text-3xl font-bold text-gray-900">Featured Artworks</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              <span>A curated selection from this artist</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artworks.slice(0, 6).map((artwork) => (
              <ArtworkCard
                key={artwork._id || artwork.id}
                artworkId={artwork._id || artwork.id}
                image={resolveArtworkImage(artwork)}
                title={artwork.title}
                category={artwork.category}
                description={resolveArtworkDescription(artwork)}
                price={artwork.price}
                artistName={ARTIST_NAME}
                rating={artwork.rating && artwork.rating > 0 ? artwork.rating : 0}
                showArtistName={false}
                isInWishlist={wishlist.some(item => item.artwork_id === (artwork._id || artwork.id))}
                onAddToCart={() => handleAddToCart(artwork)}
                onToggleWishlist={handleWishlistToggle}
              />
            ))}
          </div>
        </section>
      )}

      <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/js/all.min.js"></script>
      
      <VREntryPopup 
        isOpen={showVRPopup}
        artistId={id}
        galleryId={selectedGalleryId}
        onClose={() => setShowVRPopup(false)}
      />
    </div>
  );
};

export default PublicArtistProfile;
