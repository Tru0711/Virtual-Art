import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { DEFAULT_ARTWORK_IMAGE_URL, getImageUrl } from '../../lib/imageUtils';
import { getSplitAmounts, getFormattedRupee } from '../../lib/pricing';

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const [artworks, setArtworks] = useState([]);
  const [cartItems, setCartItems] = useState({});
  const [lineItems, setLineItems] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [preferredMethod, setPreferredMethod] = useState('UPI');
  const [maskedIdentifier, setMaskedIdentifier] = useState('');
  const [currentMethod, setCurrentMethod] = useState('UPI');

  const totals = useMemo(() => {
    return lineItems.reduce(
      (acc, item) => {
        acc.base += item.split.baseAmount;
        acc.markup += item.split.markupAmount;
        acc.total += item.split.buyerAmount;
        return acc;
      },
      { base: 0, markup: 0, total: 0 }
    );
  }, [lineItems]);

  const hasUnavailableArtwork = useMemo(
    () => lineItems.some((item) => item.artwork.status !== 'published'),
    [lineItems]
  );

  useEffect(() => {
    const loadCheckoutData = async () => {
      try {
        setLoading(true);

        const selectedAddressId = location.state?.selectedAddressId || sessionStorage.getItem('checkoutAddressId') || '';

        const [artworksRes, addressesRes, prefsRes] = await Promise.all([
          api.getPublicArtworks(),
          api.getAddresses(),
          api.getBuyerPaymentPreferences().catch(() => ({ payment_preferences: {} })),
        ]);

        const localCart = JSON.parse(localStorage.getItem('cartItems') || '{}');
        const allArtworks = Array.isArray(artworksRes) ? artworksRes : [];

        setArtworks(allArtworks);
        setCartItems(localCart);

        const computed = [];
        Object.keys(localCart).forEach((artworkId) => {
          const artwork = allArtworks.find((item) => item._id === artworkId);
          if (!artwork) return;
          const quantity = Number(localCart[artworkId] || 0);
          if (quantity < 1) return;
          computed.push({ artwork, quantity, split: getSplitAmounts(artwork, quantity) });
        });
        setLineItems(computed);

        const addressList = addressesRes?.addresses || [];
        const resolvedAddress = addressList.find((item) => item._id === selectedAddressId)
          || addressList.find((item) => item.is_default)
          || null;

        if (!resolvedAddress) {
          toast.error('Please add/select a delivery address before proceeding.');
          navigate('/cart');
          return;
        }

        setSelectedAddress(resolvedAddress);

        const prefs = prefsRes?.payment_preferences || {};
        setPreferredMethod(prefs.preferred_method || 'UPI');
        setCurrentMethod(prefs.preferred_method || 'UPI');
        setMaskedIdentifier(prefs.masked_identifier || '');
      } catch (error) {
        toast.error(error.message || 'Failed to load checkout');
        navigate('/cart');
      } finally {
        setLoading(false);
      }
    };

    loadCheckoutData();
  }, [location.state?.selectedAddressId, navigate]);

  const startPayment = async () => {
    if (!selectedAddress?._id) {
      toast.error('Please add/select a delivery address before proceeding.');
      navigate('/cart');
      return;
    }

    if (!lineItems.length) {
      toast.error('Cart is empty');
      navigate('/cart');
      return;
    }

    if (hasUnavailableArtwork) {
      toast.error('One or more artworks are unavailable. Please update your cart.');
      navigate('/cart');
      return;
    }

    try {
      setProcessingPayment(true);

      const scriptLoaded = await new Promise((resolve) => {
        if (window.Razorpay) {
          resolve(true);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

      if (!scriptLoaded) {
        toast.error('Unable to load Razorpay checkout');
        return;
      }

      const checkout = await api.createRazorpayCheckout({
        items: lineItems.map((item) => ({ product: item.artwork._id, quantity: item.quantity })),
        address: selectedAddress._id,
      });

      console.info('[PAYMENT_INITIATED]', {
        order_id: checkout.gatewayOrder.id,
        checkout_reference: checkout.checkout_reference,
        total_amount: checkout.amount_paid,
        method: currentMethod,
      });

      const options = {
        key: checkout.keyId,
        amount: checkout.gatewayOrder.amount,
        currency: checkout.gatewayOrder.currency,
        name: 'Virtual Art',
        description: 'Razorpay Test Mode Checkout',
        order_id: checkout.gatewayOrder.id,
        prefill: {
          name: profile?.full_name || '',
          email: profile?.email || selectedAddress.email || '',
          contact: profile?.phone || selectedAddress.phone || '',
        },
        notes: {
          checkout_reference: checkout.checkout_reference,
          preferred_method: currentMethod,
        },
        handler: async (response) => {
          try {
            const verification = await api.verifyRazorpayPayment(response);
            localStorage.removeItem('cartItems');
            window.dispatchEvent(new CustomEvent('cartUpdated'));
            sessionStorage.removeItem('checkoutAddressId');
            navigate('/payment-success', {
              state: {
                summary: {
                  amount_paid: verification.amount_paid,
                  payment_id: verification.payment_id,
                  order_date: verification.order_date || new Date().toISOString(),
                  items: verification.items || [],
                },
              },
            });
          } catch (error) {
            toast.error(error.message || 'Payment verification failed');
          } finally {
            setProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: async () => {
            try {
              await api.markRazorpayCheckoutFailed({
                razorpay_order_id: checkout.gatewayOrder.id,
                status: 'cancelled',
                reason: 'Buyer cancelled checkout',
              });
            } catch (error) {
              console.error('Failed to store cancel status:', error);
            }
            navigate('/payment-failed', {
              state: {
                status: 'cancelled',
                reason: 'Payment was cancelled by buyer before completion.',
              },
            });
            setProcessingPayment(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', async (response) => {
        try {
          await api.markRazorpayCheckoutFailed({
            razorpay_order_id: checkout.gatewayOrder.id,
            status: 'failed',
            reason: response.error?.description || 'Razorpay payment failed',
          });
        } catch (error) {
          console.error('Failed to store failed status:', error);
        }
        navigate('/payment-failed', {
          state: {
            status: 'failed',
            reason: response.error?.description || 'Payment failed. Please try again.',
          },
        });
        setProcessingPayment(false);
      });

      razorpay.open();
    } catch (error) {
      toast.error(error.message || 'Failed to start payment');
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-10 text-gray-500">Loading checkout...</div>;
  }

  if (!lineItems.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-600">No items in checkout.</p>
        <button onClick={() => navigate('/cart')} className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white">Back to Cart</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Checkout</h1>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Delivery Address</h2>
          {selectedAddress ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <p className="font-semibold text-gray-900 mb-1">{selectedAddress.firstName} {selectedAddress.lastName}</p>
              <p>{selectedAddress.phone}</p>
              <p>{selectedAddress.street}</p>
              <p>{selectedAddress.city}, {selectedAddress.state} - {selectedAddress.zipCode}</p>
              <p>{selectedAddress.country}</p>
            </div>
          ) : (
            <p className="text-sm text-red-600">Please add/select a delivery address before proceeding.</p>
          )}
        </div>

        <div className="space-y-3">
          {lineItems.map((item) => (
            <div key={item.artwork._id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 flex gap-3">
              <img
                src={getImageUrl(item.artwork.image_url)}
                alt={item.artwork.title}
                className="w-16 h-16 rounded-md object-cover"
                onError={(event) => {
                  event.currentTarget.src = DEFAULT_ARTWORK_IMAGE_URL;
                }}
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{item.artwork.title}</p>
                <p className="text-sm text-gray-600">Artist: {item.artwork.artist_id?.artist_name || item.artwork.artist_id?.full_name || 'Artist'}</p>
                <p className="text-sm text-gray-600">Base: {getFormattedRupee(item.split.baseAmount)} | Markup: {getFormattedRupee(item.split.markupAmount)}</p>
              </div>
              <p className="font-semibold text-gray-900">{getFormattedRupee(item.split.buyerAmount)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 h-fit">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>

        <div className="space-y-2 text-sm text-gray-700">
          <p className="flex justify-between"><span>Artist Base Price</span><span>{getFormattedRupee(totals.base)}</span></p>
          <p className="flex justify-between"><span>Platform Markup (10%)</span><span>{getFormattedRupee(totals.markup)}</span></p>
          <p className="flex justify-between font-semibold text-base pt-2 border-t border-gray-200"><span>Final Total</span><span>{getFormattedRupee(totals.total)}</span></p>
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium text-gray-700">Payment Preference</p>
          <p className="text-sm text-gray-500">Preferred: {preferredMethod}{maskedIdentifier ? ` (${maskedIdentifier})` : ''}</p>
          <select className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2" value={currentMethod} onChange={(event) => setCurrentMethod(event.target.value)}>
            <option>UPI</option>
            <option>Card</option>
            <option>Net Banking</option>
            <option>Wallet</option>
          </select>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            disabled={processingPayment || !selectedAddress || hasUnavailableArtwork}
            onClick={startPayment}
            className="w-full py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {processingPayment ? 'Processing...' : 'Proceed to Payment'}
          </button>
          <button onClick={() => navigate('/cart')} className="w-full py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
