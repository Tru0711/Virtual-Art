import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Palette, Info, Mail, LogIn, User, LogOut, ChevronDown, Edit, BarChart3, ShoppingCart, Home, Search, Key, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getImageUrl } from '../../lib/imageUtils';
import ArtistCredentialsModal from '../artist/ArtistCredentialsModal';

const Navbar = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);

  useEffect(() => {
    const updateCartCount = () => {
      const savedCart = localStorage.getItem('cartItems');
      if (savedCart) {
        try {
          const cartItems = JSON.parse(savedCart);
          // Check if it's not an object or null
          if (typeof cartItems !== 'object' || cartItems === null || Array.isArray(cartItems)) {
            localStorage.removeItem('cartItems');
            setCartCount(0);
            return;
          }
          // Validate that cart items are objects with valid quantities
          const validCart = {};
          for (const [key, value] of Object.entries(cartItems)) {
            if (typeof value === 'number' && value > 0 && value <= 99) {
              validCart[key] = value;
            }
          }
          const count = Object.values(validCart).reduce((total, qty) => total + qty, 0);
          setCartCount(count);
          // Update localStorage with cleaned up cart data
          if (Object.keys(validCart).length === 0) {
            localStorage.removeItem('cartItems');
          } else {
            localStorage.setItem('cartItems', JSON.stringify(validCart));
          }
        } catch (error) {
          console.error('Error parsing cart data in navbar:', error);
          // Clear corrupted cart data
          localStorage.removeItem('cartItems');
          setCartCount(0);
        }
      } else {
        setCartCount(0);
      }
    };

    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    window.addEventListener('cartUpdated', updateCartCount);

    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  }, []);

  const { logout } = useAuth();

  const handleLogout = async () => {
    const userType = profile?.user_type; // Capture user type before logout
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      // best-effort clear
      localStorage.removeItem('token');
    } finally {
      setDropdownOpen(false);
      // Redirect based on user type: artists to login, users to home
      if (userType === 'artist') {
        navigate('/login');
      } else {
        navigate('/');
      }
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-amber-50 via-white to-rose-50 shadow-md border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/"
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Palette className="h-8 w-8 text-amber-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">
                Virtual Art
              </span>
            </Link>



            <div className="flex items-center gap-6">
              <Link
                to="/"
                className="flex items-center gap-1 text-gray-700 hover:text-amber-600 transition-colors"
              >
                <Home className="h-5 w-5" />
                <span className="hidden sm:inline">Home</span>
              </Link>

              {profile?.user_type !== 'user' && location.pathname === "/" && (
                <Link
                  to="/about"
                  className="flex items-center gap-1 text-gray-700 hover:text-amber-600 transition-colors"
                >
                  <Info className="h-5 w-5" />
                  <span className="hidden sm:inline">About</span>
                </Link>
              )}

              {profile?.user_type === 'user' && (
                <>
                  <Link
                    to="/artists"
                    className="flex items-center gap-1 text-gray-700 hover:text-amber-600 transition-colors"
                  >
                    <Palette className="h-5 w-5" />
                    <span className="hidden sm:inline">Artists</span>
                  </Link>

                  <Link
                    to="/search"
                    className="flex items-center gap-1 text-gray-700 hover:text-amber-600 transition-colors"
                  >
                    <Search className="h-5 w-5" />
                    <span className="hidden sm:inline">Search</span>
                  </Link>
                </>
              )}

              {profile?.user_type === 'artist' && location.pathname !== "/artist/profile" && (
                <Link
                  to="/artist/profile"
                  className="flex items-center gap-1 text-gray-700 hover:text-amber-600 transition-colors"
                >
                  <Palette className="h-5 w-5" />
                  <span className="hidden sm:inline">My Dashboard</span>
                </Link>
              )}

              <Link
                to="/contact"
                className="flex items-center gap-1 text-gray-700 hover:text-amber-600 transition-colors"
              >
                <Mail className="h-5 w-5" />
                <span className="hidden sm:inline">Contact</span>
              </Link>

              {user ? (
                <div className="flex items-center gap-4">
                  {profile?.user_type === 'user' && (
                    <Link
                      to="/cart"
                      className="relative flex items-center gap-2 p-2 text-gray-700 hover:text-amber-600 transition-colors"
                    >
                      <ShoppingCart className="h-6 w-6" />
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {cartCount}
                        </span>
                      )}
                    </Link>
                  )}

                  <div className="relative">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-full hover:shadow-lg transition-shadow"
                    >
                      {profile?.profile_picture ? (
                        <img
                          src={getImageUrl(profile.profile_picture)}
                          alt="Avatar"
                          className="h-5 w-5 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                      <span>{profile?.full_name}</span>
                      <ChevronDown className="h-4 w-4" />
                    </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      {profile?.user_type !== 'artist' && (
                        <Link
                          to={
                            profile?.user_type === 'admin' ? '/admin/dashboard' :
                            '/user/dashboard'
                          }
                          className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <BarChart3 className="h-4 w-4" />
                          Dashboard
                        </Link>
                      )}
                      {profile?.user_type === 'user' && (
                        <Link
                          to="/my-orders"
                          className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          My Orders
                        </Link>
                      )}
                      {profile?.user_type === 'admin' && (
                        <Link
                          to="/user/profile"
                          className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <User className="h-4 w-4" />
                          View Profile
                        </Link>
                      )}
                      <Link
                        to={profile?.user_type === 'artist' ? '/artist/profile/edit' : '/user/profile'}
                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Edit className="h-4 w-4" />
                        Edit Profile
                      </Link>
                      {/* Payment Settings for artists */}
                      {profile?.user_type === 'artist' && (
                        <Link
                          to="/artist/payment-settings"
                          className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <DollarSign className="h-4 w-4" />
                          Payment Settings
                        </Link>
                      )}
                      {/* Credentials option for users and artists */}
                      {(profile?.user_type === 'artist' || profile?.user_type === 'user') && (
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            setShowCredentialsModal(true);
                          }}
                          className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Key className="h-4 w-4" />
                          Credentials
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  )}
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-full hover:shadow-lg transition-shadow"
                >
                  <LogIn className="h-5 w-5" />
                  <span>Login</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Artist Credentials Modal */}
      <ArtistCredentialsModal 
        isOpen={showCredentialsModal} 
        onClose={() => setShowCredentialsModal(false)} 
      />
    </>
  );
};

export default Navbar;
