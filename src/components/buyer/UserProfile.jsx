import React, { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  Edit,
  Heart,
  Star,
  LogOut,
  HelpCircle,
  Truck,
  Settings,
  ChevronRight,
  Save,
  Camera,
  CreditCard,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { toastSuccess, toastError } from '../../lib/toast';
import { getImageUrl } from '../../lib/imageUtils';

const UserProfile = () => {
  const { user, profile, logout, refreshProfile } = useAuth();
  const [activeSection, setActiveSection] = useState('account');
  const [isEditing, setIsEditing] = useState(false);
  const [wishlist, setWishlist] = useState([]);


  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    email: '',
    mobile: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    country: '',
    profilePicture: '',
  });
  const [profilePictureFile, setProfilePictureFile] = useState(null);

  useEffect(() => {
    if (profile) {
      fetchWishlist();
      loadProfileData();
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        gender: '',
        email: '',
        mobile: '',
        dateOfBirth: '',
        address: '',
        city: '',
        state: '',
        country: '',
        profilePicture: '',
      });
    }
  }, [profile]);

  useEffect(() => {
    const handleWishlistUpdate = () => {
      fetchWishlist();
    };

    window.addEventListener('wishlistUpdated', handleWishlistUpdate);

    return () => {
      window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
    };
  }, []);

  const loadProfileData = () => {
    if (profile) {
      const nameParts = profile?.full_name?.split(' ') || [];
      const newFormData = {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        gender: profile?.gender || '',
        email: profile?.email || '',
        mobile: profile?.phone || '',
        dateOfBirth: profile?.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : '',
        address: profile?.address || '',
        city: profile?.city || '',
        state: profile?.state || '',
        country: profile?.country || '',
        profilePicture: profile?.profile_picture || '',
      };
      setFormData(newFormData);
    }
  };



  const fetchWishlist = async () => {
    try {
      const wishlistData = await api.getWishlist();
      setWishlist(wishlistData);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      setWishlist([]);
    }
  };



  const handleSaveChanges = async () => {
    try {
      // Use profile.id as that's the correct MongoDB _id field from the API response
      const userId = profile?.id;
      
      if (!userId) {
        toastError('User ID not found. Please log in again.');
        return;
      }

      // First upload profile picture if selected
      if (profilePictureFile) {
        const pictureFormData = new FormData();
        pictureFormData.append('profile_picture', profilePictureFile);
        await api.uploadProfilePicture(userId, pictureFormData);
      }

      // Then update other profile fields - only include non-empty values
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const updates = {};
      
      if (fullName) updates.full_name = fullName;
      if (formData.mobile) updates.phone = formData.mobile;
      if (formData.address) updates.address = formData.address;
      if (formData.gender) updates.gender = formData.gender;
      if (formData.dateOfBirth) updates.dateOfBirth = formData.dateOfBirth;
      if (formData.city) updates.city = formData.city;
      if (formData.state) updates.state = formData.state;
      if (formData.country) updates.country = formData.country;

      // Only call update if there are fields to update
      if (Object.keys(updates).length > 0) {
        await api.updateProfile(userId, updates);
      }

      setIsEditing(false);
      setProfilePictureFile(null);
      // Refresh profile data without full page reload
      await loadProfileData();
      // Refresh the auth context to update navbar
      await refreshProfile();

      toastSuccess('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toastError(error.message || 'Failed to update profile. Please try again.');
    }
  };

  const removeFromWishlist = async (artworkId) => {
    try {
      await api.removeFromWishlist(artworkId);
      toastSuccess('Removed from wishlist');
      fetchWishlist();
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toastError('Failed to remove from wishlist. Please try again.');
    }
  };

  const handleAddToCart = async (artworkId) => {
    try {
      if (!artworkId) {
        toastError('Invalid artwork');
        return;
      }

      const response = await api.addToCart(artworkId);
      
      if (response?.success) {
        toastSuccess('Added to cart successfully!');
        
        // Update localStorage for backward compatibility with existing cart system
        const savedCart = localStorage.getItem('cartItems');
        let cartItems = {};
        if (savedCart) {
          try {
            cartItems = JSON.parse(savedCart);
          } catch (error) {
            console.error('Error parsing cart:', error);
            cartItems = {};
          }
        }
        
        // Add artwork to cart (quantity 1) if not already present
        if (!cartItems[artworkId]) {
          cartItems[artworkId] = 1;
          localStorage.setItem('cartItems', JSON.stringify(cartItems));
        }
        
        // Dispatch event to update cart count in navbar
        window.dispatchEvent(new CustomEvent('cartUpdated'));
      } else {
        toastError(response?.message || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      const errorMessage = error?.data?.message || error?.message || 'Failed to add to cart';
      toastError(errorMessage);
    }
  };





  const sidebarItems = [
    { id: 'account', label: 'Account Settings', icon: Settings },
    { id: 'stuff', label: 'My Stuff', icon: Heart },
    { id: 'payment-preferences', label: 'Payment Preferences', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {/* Profile Avatar and Greeting */}
              <div className="text-center mb-6">
                <div className="relative w-20 h-20 mx-auto mb-3">
                  {profile?.profile_picture ? (
                    <img
                      src={getImageUrl(profile.profile_picture)}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const fallback = parent.querySelector('.fallback-avatar');
                          if (fallback && fallback instanceof HTMLElement) fallback.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold fallback-avatar ${
                      profile?.profile_picture ? 'hidden' : ''
                    }`}
                  >
                    {profile?.full_name?.[0] || 'U'}
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Hello, {profile?.full_name?.split(' ')[0] || 'User'}
                </h2>
              </div>

              {/* Navigation Menu */}
              <nav className="space-y-2 mb-6">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                        activeSection === item.id
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  );
                })}
              </nav>

              {/* Logout removed: use profile dropdown logout in Navbar only */}


            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              {activeSection === 'account' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Personal Information</h1>
                    <button
                      onClick={() => {
                        if (isEditing) {
                          handleSaveChanges();
                        } else {
                          setIsEditing(true);
                        }
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        isEditing
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isEditing ? (
                        <>
                          <Save className="h-4 w-4" />
                          Save Changes
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4" />
                          Edit Profile
                        </>
                      )}
                    </button>
                    {isEditing && (
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          loadProfileData();
                        }}
                        className="ml-2 px-4 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!isEditing}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!isEditing}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        disabled={!isEditing}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          !isEditing ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                        }`}
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                        disabled={true}
                        title="Email cannot be changed for security reasons"
                      />
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed for security reasons</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        value={formData.mobile}
                        onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!isEditing}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setProfilePictureFile(file);
                              // Create a preview URL
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                setFormData({ ...formData, profilePicture: e.target?.result });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                          id="profile-picture-upload"
                          disabled={!isEditing}
                        />
                        <label
                          htmlFor="profile-picture-upload"
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                            isEditing
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <Camera className="h-4 w-4" />
                          {profilePictureFile ? 'Change Photo' : 'Upload Photo'}
                        </label>
                        {formData.profilePicture && (
                          <img
                            src={formData.profilePicture}
                            alt="Preview"
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-300"
                          />
                        )}

                        {activeSection === 'addresses' && (
                          <div className="space-y-4">
                            <h1 className="text-2xl font-bold text-gray-800">Saved Addresses</h1>
                            <p className="text-gray-600">Manage your delivery addresses and set a default address for faster checkout.</p>
                            <Link to="/user/saved-addresses" className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                              Open Saved Addresses
                            </Link>
                          </div>
                        )}

                        {activeSection === 'payment-preferences' && (
                          <div className="space-y-4">
                            <h1 className="text-2xl font-bold text-gray-800">Payment Preferences</h1>
                            <p className="text-gray-600">Save your preferred method and optional masked identifier for quicker Razorpay checkout.</p>
                            <Link to="/user/payment-preferences" className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                              Open Payment Preferences
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!isEditing}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!isEditing}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                      <input
                        type="text"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>

                  {/* Edit Profile removed: use profile dropdown in Navbar only */}

                  {/* Logout removed: use profile dropdown logout in Navbar only */}

                  {/* FAQ Section */}
                  <div className="border-t border-gray-200 pt-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-6">Frequently Asked Questions</h2>

                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-2">
                          What happens when I update my email address or mobile number?
                        </h3>
                        <p className="text-gray-600">
                          Your email and mobile number are used for account verification and communication.
                          Changes may require re-verification for security purposes.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-800 mb-2">
                          When will my account be updated with new details?
                        </h3>
                        <p className="text-gray-600">
                          Changes are applied immediately after saving. Some updates may take a few minutes
                          to reflect across all systems.
                        </p>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-800 mb-2">
                          Does it affect my existing account access?
                        </h3>
                        <p className="text-gray-600">
                          No, updating your profile information won't affect your current account access.
                          You'll remain logged in and can continue using all features.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}



              {activeSection === 'stuff' && (
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 mb-6">My Wishlist</h1>
                  {wishlist.length === 0 ? (
                    <p className="text-gray-600 text-center py-12">Your wishlist is empty</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {wishlist.map((item) => (
                        <div
                          key={item._id}
                          className="bg-gray-50 rounded-lg overflow-hidden shadow-md"
                        >
                          <div className="h-48 bg-gray-200">
                            <img
                              src={getImageUrl(item.artwork_id?.image_url) || 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg'}
                              alt={item.artwork_id?.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src =
                                  'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg';
                              }}
                            />
                          </div>
                          <div className="p-4">
                            <h3 className="font-bold text-gray-800 mb-1">
                              {item.artwork_id?.title || 'Unknown'}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">{item.artwork_id?.category}</p>
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-lg font-bold text-blue-600">
                                ₹{item.artwork_id?.price?.toLocaleString("en-IN") || '0'}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleAddToCart(item.artwork_id?._id)}
                                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                              >
                                Add to Cart
                              </button>
                              <button
                                onClick={() => removeFromWishlist(item.artwork_id?._id)}
                                className="px-3 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}


            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
