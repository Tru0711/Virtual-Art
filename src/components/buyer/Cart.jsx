import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { DEFAULT_ARTWORK_IMAGE_URL, getImageUrl } from '../../lib/imageUtils';
import { toast } from 'react-hot-toast';
import { getBuyerPrice, getSplitAmounts, getFormattedRupee } from '../../lib/pricing';

const EMPTY_ADDRESS_FORM = {
  full_name: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  pincode: '',
  country: '',
  is_default: false,
};

const toAddressPayload = (form, email = '') => {
  const parts = String(form.full_name || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '-',
    email,
    phone: String(form.phone || '').trim(),
    street: String(form.street || '').trim(),
    city: String(form.city || '').trim(),
    state: String(form.state || '').trim(),
    zipCode: String(form.pincode || '').trim(),
    country: String(form.country || '').trim(),
    is_default: Boolean(form.is_default),
  };
};

const fromAddressToForm = (address) => ({
  full_name: `${address.firstName || ''} ${address.lastName || ''}`.trim(),
  phone: address.phone || '',
  street: address.street || '',
  city: address.city || '',
  state: address.state || '',
  pincode: address.zipCode || '',
  country: address.country || '',
  is_default: Boolean(address.is_default),
});

const Cart = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState({});
  const [artworks, setArtworks] = useState([]);
  const [cartArray, setCartArray] = useState([]);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState('');
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [addressErrors, setAddressErrors] = useState({});
  const [savingAddress, setSavingAddress] = useState(false);
  const [deletingAddress, setDeletingAddress] = useState(false);

  const [paymentOption, setPaymentOption] = useState('COD');
  const [processingPayment, setProcessingPayment] = useState(false);

  const hasValidSelectedAddress = Boolean(selectedAddress?._id);

  const validateAddressForm = () => {
    const errors = {};
    if (!String(addressForm.full_name || '').trim()) errors.full_name = 'Full name is required';
    if (!/^\d{10,15}$/.test(String(addressForm.phone || '').trim())) errors.phone = 'Enter a valid phone number (10-15 digits)';
    if (!String(addressForm.street || '').trim()) errors.street = 'Street address is required';
    if (!String(addressForm.city || '').trim()) errors.city = 'City is required';
    if (!String(addressForm.state || '').trim()) errors.state = 'State is required';
    if (!/^\d{4,10}$/.test(String(addressForm.pincode || '').trim())) errors.pincode = 'Enter a valid pincode (4-10 digits)';
    if (!String(addressForm.country || '').trim()) errors.country = 'Country is required';

    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetAddressForm = () => {
    setAddressForm({ ...EMPTY_ADDRESS_FORM, is_default: addresses.length === 0 });
    setEditingAddressId('');
    setAddressErrors({});
  };

  const loadAddresses = async (selectId = '') => {
    try {
      const data = await api.getAddresses();
      if (!data.success) {
        toast.error(data.message || 'Failed to load addresses');
        return;
      }

      const list = data.addresses || [];
      setAddresses(list);

      if (!list.length) {
        setSelectedAddress(null);
        setShowAddressForm(true);
        resetAddressForm();
        return;
      }

      const nextSelected = list.find((item) => item._id === selectId)
        || list.find((item) => item.is_default)
        || list[0];

      setSelectedAddress(nextSelected || null);
      setShowAddressForm(false);
    } catch (error) {
      toast.error(error.message || 'Failed to load addresses');
    }
  };

  const saveAddress = async (event) => {
    event.preventDefault();
    if (!validateAddressForm()) return;

    if (!profile?.email) {
      toast.error('Unable to save address without buyer email');
      return;
    }

    try {
      setSavingAddress(true);
      const payload = toAddressPayload(addressForm, profile.email);
      let savedId = '';

      if (editingAddressId) {
        const response = await api.updateAddress(editingAddressId, payload);
        savedId = response?.address?._id || editingAddressId;
      } else {
        const response = await api.createAddress(payload);
        savedId = response?.address?._id || '';
      }

      if (payload.is_default && savedId) {
        await api.setDefaultAddress(savedId);
      }

      await loadAddresses(savedId);
      toast.success(editingAddressId ? 'Address updated successfully' : 'Address added successfully');
      setShowAddressForm(false);
      resetAddressForm();
    } catch (error) {
      toast.error(error.message || 'Failed to save address');
    } finally {
      setSavingAddress(false);
    }
  };

  const openAddAddress = () => {
    setEditingAddressId('');
    setAddressForm({ ...EMPTY_ADDRESS_FORM, is_default: addresses.length === 0 });
    setAddressErrors({});
    setShowAddressForm(true);
  };

  const openEditAddress = () => {
    if (!selectedAddress) return;
    setEditingAddressId(selectedAddress._id);
    setAddressForm(fromAddressToForm(selectedAddress));
    setAddressErrors({});
    setShowAddressForm(true);
  };

  const deleteAddress = async () => {
    if (!selectedAddress?._id) return;
    try {
      setDeletingAddress(true);
      await api.deleteAddress(selectedAddress._id);
      await loadAddresses();
      toast.success('Address deleted successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to delete address');
    } finally {
      setDeletingAddress(false);
    }
  };

  const setAsDefault = async () => {
    if (!selectedAddress?._id) return;
    try {
      await api.setDefaultAddress(selectedAddress._id);
      await loadAddresses(selectedAddress._id);
      toast.success('Default address updated');
    } catch (error) {
      toast.error(error.message || 'Failed to set default address');
    }
  };

  const placeOrder = async () => {
    if (!hasValidSelectedAddress) {
      toast.error('Please add/select a delivery address before proceeding.');
      return;
    }

    try {
      if (paymentOption === 'Online') {
        sessionStorage.setItem('checkoutAddressId', selectedAddress._id);
        navigate('/checkout', { state: { selectedAddressId: selectedAddress._id } });
        return;
      }

      const orderData = {
        userId: profile._id,
        items: cartArray.map((item) => ({ product: item._id, quantity: item.quantity })),
        address: selectedAddress._id,
        paymentMethod: null,
      };

      const data = await api.createOrder(orderData);

      if (data.success) {
        toast.success(data.message || 'Order placed successfully');
        setCartItems({});
        localStorage.removeItem('cartItems');
        window.dispatchEvent(new CustomEvent('cartUpdated'));
        navigate('/my-orders');
      } else {
        toast.error(data.message || 'Failed to place order');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to place order');
    } finally {
      setProcessingPayment(false);
    }
  };

  const removeFromCart = (artworkId) => {
    const newCartItems = { ...cartItems };
    delete newCartItems[artworkId];
    setCartItems(newCartItems);
    localStorage.setItem('cartItems', JSON.stringify(newCartItems));
    window.dispatchEvent(new Event('storage'));
  };

  const updateCartItem = (artworkId, quantity) => {
    const newCartItems = { ...cartItems, [artworkId]: quantity };
    setCartItems(newCartItems);
    localStorage.setItem('cartItems', JSON.stringify(newCartItems));
    window.dispatchEvent(new Event('storage'));
  };

  const totals = useMemo(() => {
    return cartArray.reduce((acc, item) => {
      const split = getSplitAmounts(item, item.quantity);
      acc.base += split.baseAmount;
      acc.markup += split.markupAmount;
      acc.total += split.buyerAmount;
      return acc;
    }, { base: 0, markup: 0, total: 0 });
  }, [cartArray]);

  useEffect(() => {
    const fetchArtworks = async () => {
      try {
        const allArtworks = await api.getPublicArtworks();
        setArtworks(allArtworks || []);
      } catch (error) {
        console.error('Error fetching artworks:', error);
      }
    };

    fetchArtworks();

    const savedCart = localStorage.getItem('cartItems');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        const validCart = {};
        for (const [key, value] of Object.entries(parsedCart)) {
          if (typeof value === 'number' && value > 0 && value <= 99) {
            validCart[key] = value;
          }
        }
        setCartItems(validCart);
        if (Object.keys(validCart).length === 0) {
          localStorage.removeItem('cartItems');
        } else {
          localStorage.setItem('cartItems', JSON.stringify(validCart));
        }
      } catch (error) {
        localStorage.removeItem('cartItems');
        setCartItems({});
      }
    } else {
      setCartItems({});
    }
  }, []);

  useEffect(() => {
    if (!Object.keys(cartItems).length || !artworks.length) {
      setCartArray([]);
      return;
    }

    const tempArray = [];
    for (const key in cartItems) {
      const artwork = artworks.find((item) => item._id === key);
      if (artwork) {
        tempArray.push({ ...artwork, quantity: cartItems[key] });
      }
    }
    setCartArray(tempArray);
  }, [artworks, cartItems]);

  useEffect(() => {
    if (profile) {
      loadAddresses();
    }
  }, [profile]);

  if (artworks.length > 0 && Object.keys(cartItems).length > 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <h1 className="text-3xl font-medium mb-6">Shopping Cart</h1>

            <div className="grid grid-cols-[2fr_1fr_1fr] text-gray-500 text-base font-medium pb-3">
              <p className="text-left">Artwork Details</p>
              <p className="text-center">Subtotal</p>
              <p className="text-center">Action</p>
            </div>

            {cartArray.map((artwork) => (
              <div key={artwork._id} className="grid grid-cols-[2fr_1fr_1fr] text-gray-500 items-center text-sm md:text-base font-medium pt-3">
                <div className="flex items-center md:gap-6 gap-3">
                  <div
                    onClick={() => {
                      navigate(`/artwork-details/${artwork._id}`);
                      window.scrollTo(0, 0);
                    }}
                    className="cursor-pointer w-24 h-24 flex items-center justify-center border border-gray-300 rounded overflow-hidden"
                  >
                    <img
                      className="max-w-full h-full object-cover"
                      src={getImageUrl(artwork.image_url)}
                      alt={artwork.title}
                      onError={(event) => {
                        event.currentTarget.src = DEFAULT_ARTWORK_IMAGE_URL;
                      }}
                    />
                  </div>
                  <div>
                    <p className="hidden md:block font-semibold">{artwork.title}</p>
                    <div className="font-normal text-gray-500/70">
                      <p>Category: <span>{artwork.category || 'N/A'}</span></p>
                      <div className="flex items-center">
                        <p>Qty:</p>
                        <select
                          onChange={(event) => updateCartItem(artwork._id, Number(event.target.value))}
                          value={cartItems[artwork._id]}
                          className="outline-none"
                        >
                          {Array((cartItems[artwork._id] > 10 ? cartItems[artwork._id] : 10)).fill('').map((_, index) => (
                            <option key={index} value={index + 1}>{index + 1}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-center">{getFormattedRupee(getBuyerPrice(artwork) * artwork.quantity)}</p>
                <button onClick={() => removeFromCart(artwork._id)} className="cursor-pointer mx-auto text-red-500">Delete</button>
              </div>
            ))}

            <button
              onClick={() => {
                navigate('/user/dashboard');
                window.scrollTo(0, 0);
              }}
              className="group cursor-pointer flex items-center mt-8 gap-2 text-purple-600 font-medium"
            >
              Continue Shopping
            </button>
          </div>

          <div className="max-w-[380px] w-full bg-gray-100/40 p-5 border border-gray-300/70 space-y-5">
            <h2 className="text-xl md:text-xl font-medium">Order Summary</h2>
            <hr className="border-gray-300" />

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium uppercase">Delivery Address</p>
                <button onClick={openAddAddress} className="text-xs text-purple-600 hover:underline">Add New Address</button>
              </div>

              {!addresses.length && (
                <p className="text-sm text-red-600 mb-2">No saved addresses found. Please add an address to continue.</p>
              )}

              {addresses.length > 0 && (
                <div className="space-y-2">
                  <select
                    className="w-full border border-gray-300 bg-white px-3 py-2 rounded"
                    value={selectedAddress?._id || ''}
                    onChange={(event) => {
                      const next = addresses.find((address) => address._id === event.target.value);
                      setSelectedAddress(next || null);
                    }}
                  >
                    {addresses.map((address) => (
                      <option key={address._id} value={address._id}>
                        {address.firstName} {address.lastName} - {address.city} {address.is_default ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>

                  {selectedAddress && (
                    <div className="text-gray-600 text-sm bg-white border border-gray-200 rounded p-3">
                      <p className="font-medium text-gray-900">{selectedAddress.firstName} {selectedAddress.lastName}</p>
                      <p>{selectedAddress.phone}</p>
                      <p>{selectedAddress.street}, {selectedAddress.city}</p>
                      <p>{selectedAddress.state}, {selectedAddress.country} - {selectedAddress.zipCode}</p>
                    </div>
                  )}

                  {selectedAddress && (
                    <div className="flex gap-2">
                      <button onClick={openEditAddress} className="text-xs px-2 py-1 border border-amber-300 text-amber-700 rounded hover:bg-amber-50">Edit</button>
                      <button onClick={deleteAddress} disabled={deletingAddress} className="text-xs px-2 py-1 border border-red-300 text-red-700 rounded hover:bg-red-50 disabled:opacity-60">
                        {deletingAddress ? 'Deleting...' : 'Delete'}
                      </button>
                      {!selectedAddress.is_default && (
                        <button onClick={setAsDefault} className="text-xs px-2 py-1 border border-green-300 text-green-700 rounded hover:bg-green-50">Set Default</button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {showAddressForm && (
                <form onSubmit={saveAddress} className="mt-3 space-y-2 bg-white border border-gray-200 rounded p-3">
                  <p className="text-sm font-semibold text-gray-900">{editingAddressId ? 'Edit Address' : 'Add New Address'}</p>

                  <input name="full_name" value={addressForm.full_name} onChange={(event) => setAddressForm((prev) => ({ ...prev, full_name: event.target.value }))} placeholder="Full name" className="w-full border border-gray-300 rounded px-2 py-2 text-sm" />
                  {addressErrors.full_name && <p className="text-xs text-red-600">{addressErrors.full_name}</p>}

                  <input name="phone" value={addressForm.phone} onChange={(event) => setAddressForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Phone number" className="w-full border border-gray-300 rounded px-2 py-2 text-sm" />
                  {addressErrors.phone && <p className="text-xs text-red-600">{addressErrors.phone}</p>}

                  <input name="street" value={addressForm.street} onChange={(event) => setAddressForm((prev) => ({ ...prev, street: event.target.value }))} placeholder="Street address" className="w-full border border-gray-300 rounded px-2 py-2 text-sm" />
                  {addressErrors.street && <p className="text-xs text-red-600">{addressErrors.street}</p>}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input name="city" value={addressForm.city} onChange={(event) => setAddressForm((prev) => ({ ...prev, city: event.target.value }))} placeholder="City" className="w-full border border-gray-300 rounded px-2 py-2 text-sm" />
                      {addressErrors.city && <p className="text-xs text-red-600">{addressErrors.city}</p>}
                    </div>
                    <div>
                      <input name="state" value={addressForm.state} onChange={(event) => setAddressForm((prev) => ({ ...prev, state: event.target.value }))} placeholder="State" className="w-full border border-gray-300 rounded px-2 py-2 text-sm" />
                      {addressErrors.state && <p className="text-xs text-red-600">{addressErrors.state}</p>}
                    </div>
                    <div>
                      <input name="pincode" value={addressForm.pincode} onChange={(event) => setAddressForm((prev) => ({ ...prev, pincode: event.target.value }))} placeholder="Pincode" className="w-full border border-gray-300 rounded px-2 py-2 text-sm" />
                      {addressErrors.pincode && <p className="text-xs text-red-600">{addressErrors.pincode}</p>}
                    </div>
                    <div>
                      <input name="country" value={addressForm.country} onChange={(event) => setAddressForm((prev) => ({ ...prev, country: event.target.value }))} placeholder="Country" className="w-full border border-gray-300 rounded px-2 py-2 text-sm" />
                      {addressErrors.country && <p className="text-xs text-red-600">{addressErrors.country}</p>}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={addressForm.is_default}
                      onChange={(event) => setAddressForm((prev) => ({ ...prev, is_default: event.target.checked }))}
                    />
                    Set as Default
                  </label>

                  <div className="flex gap-2">
                    <button type="submit" disabled={savingAddress} className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-60">
                      {savingAddress ? 'Saving...' : 'Save Address'}
                    </button>
                    <button type="button" onClick={() => { setShowAddressForm(false); resetAddressForm(); }} className="text-xs px-2 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div>
              <p className="text-sm font-medium uppercase mb-2">Payment Method</p>
              <select onChange={(event) => setPaymentOption(event.target.value)} className="w-full border border-gray-300 bg-white px-3 py-2 outline-none rounded">
                <option value="COD">Cash On Delivery</option>
                <option value="Online">Online Payment</option>
              </select>
            </div>

            <hr className="border-gray-300" />

            <div className="text-gray-500 space-y-2">
              <p className="flex justify-between"><span>Base Price</span><span>{getFormattedRupee(totals.base)}</span></p>
              <p className="flex justify-between"><span>Platform Markup (10%)</span><span>{getFormattedRupee(totals.markup)}</span></p>
              <p className="flex justify-between"><span>Shipping Fee</span><span className="text-green-600">Free</span></p>
              <p className="flex justify-between text-lg font-medium mt-3"><span>Total Amount:</span><span>{getFormattedRupee(totals.total)}</span></p>
            </div>

            {!hasValidSelectedAddress && (
              <p className="text-xs text-red-600">Please add/select a delivery address before proceeding.</p>
            )}

            <button
              onClick={placeOrder}
              disabled={processingPayment || !hasValidSelectedAddress}
              className="w-full py-3 cursor-pointer bg-purple-600 text-white font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processingPayment ? 'Processing...' : paymentOption === 'COD' ? 'Place Order' : 'Buy Now'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 text-lg">Your cart is empty</p>
        <button onClick={() => navigate('/user/dashboard')} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
          Browse Artworks
        </button>
      </div>
    </div>
  );
};

export default Cart;
