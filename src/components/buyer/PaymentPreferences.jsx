import React, { useEffect, useState } from 'react';
import { ShieldCheck, CreditCard } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

const methods = ['UPI', 'Card', 'Net Banking', 'Wallet'];

const PaymentPreferences = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferredMethod, setPreferredMethod] = useState('UPI');
  const [maskedIdentifier, setMaskedIdentifier] = useState('');

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        const response = await api.getBuyerPaymentPreferences();
        const prefs = response?.payment_preferences || {};
        setPreferredMethod(prefs.preferred_method || 'UPI');
        setMaskedIdentifier(prefs.masked_identifier || '');
      } catch (error) {
        toast.error(error.message || 'Failed to load payment preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const onSave = async () => {
    if (!preferredMethod) {
      toast.error('Please choose a preferred payment method');
      return;
    }

    if (maskedIdentifier && !/^[A-Za-z0-9*\s-]{4,40}$/.test(maskedIdentifier)) {
      toast.error('Masked identifier must be 4-40 safe characters');
      return;
    }

    try {
      setSaving(true);
      await api.updateBuyerPaymentPreferences({
        preferred_method: preferredMethod,
        masked_identifier: maskedIdentifier,
      });
      toast.success('Payment preferences saved');
    } catch (error) {
      toast.error(error.message || 'Failed to save payment preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Payment Preferences</h1>
        <p className="text-sm text-gray-500 mt-1">Save only safe preferences. Sensitive payment credentials are never stored here.</p>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading preferences...</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Payment Method</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {methods.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPreferredMethod(method)}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    preferredMethod === method
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Optional Masked Last Used Identifier</label>
            <input
              type="text"
              value={maskedIdentifier}
              onChange={(event) => setMaskedIdentifier(event.target.value)}
              placeholder="Example: UPI ending ****1234"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5" />
            Do not enter full card number, CVV, UPI PIN, OTP, or banking passwords.
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <CreditCard className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentPreferences;
