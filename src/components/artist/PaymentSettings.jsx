import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { toastError, toastSuccess } from '../../lib/toast';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';

const PaymentSettings = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    account_number: '',
    ifsc: '',
    bank_name: '',
    account_type: 'Savings',
    pan_tax_id: '',
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user || profile?.user_type !== 'artist') {
      navigate('/login');
      return;
    }

    fetchPaymentInfo();
  }, [user, profile, navigate]);

  const fetchPaymentInfo = async () => {
    try {
      setLoading(true);
      const data = await api.getPaymentInfo();
      if (data?.data) {
        setFormData(data.data);
        if (data.data.is_completed) {
          setSuccess(true);
        }
      }
    } catch (error) {
      console.error('Error fetching payment info:', error);
      // Not an error if payment info doesn't exist yet
      if (error?.status !== 404) {
        toastError('Failed to load payment information');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.account_number.trim()) {
      newErrors.account_number = 'Account number is required';
    } else if (!/^\d{10,20}$/.test(formData.account_number.trim())) {
      newErrors.account_number = 'Account number must be 10-20 digits';
    }

    if (!formData.ifsc.trim()) {
      newErrors.ifsc = 'IFSC code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifsc.trim().toUpperCase())) {
      newErrors.ifsc = 'Invalid IFSC format (e.g., SBIN0001234)';
    }

    if (!formData.bank_name.trim()) {
      newErrors.bank_name = 'Bank name is required';
    }

    if (!formData.account_type) {
      newErrors.account_type = 'Account type is required';
    }

    if (formData.pan_tax_id.trim()) {
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(formData.pan_tax_id.trim().toUpperCase())) {
        newErrors.pan_tax_id = 'Invalid PAN format (e.g., AAAAA1234A)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toastError('Please fix the errors in the form');
      return;
    }

    setSaving(true);
    try {
      const response = await api.updatePaymentInfo(formData);
      setSuccess(true);
      toastSuccess(response?.message || 'Payment information saved successfully');
      window.dispatchEvent(new CustomEvent('paymentUpdated'));
    } catch (error) {
      toastError(error?.message || 'Failed to save payment information');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/artist/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            <span className="ml-3 text-gray-600">Loading payment information...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={handleCancel}
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Payment Settings</h1>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Payment Information Required</p>
              <p className="text-sm text-blue-800 mt-1">
                You need to complete your payment settings before you can upload artwork. This helps us process payments and maintain platform trust.
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-900">Payment Information Saved</p>
                <p className="text-sm text-green-800 mt-1">
                  Your payment details are secure and ready. You can now upload artwork.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name (As per bank account)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="John Doe"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.full_name
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-amber-500'
                }`}
              />
              {errors.full_name && (
                <p className="text-sm text-red-600 mt-1">{errors.full_name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@example.com"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-amber-500'
                }`}
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone (Optional)
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 XXXXX XXXXX"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="border-t border-gray-200 pt-5">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Bank Account Details</h3>

              {/* Account Number */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Account Number
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="account_number"
                  value={formData.account_number}
                  onChange={handleChange}
                  placeholder="Your bank account number"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.account_number
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-amber-500'
                  }`}
                />
                {errors.account_number && (
                  <p className="text-sm text-red-600 mt-1">{errors.account_number}</p>
                )}
              </div>

              {/* IFSC Code */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  IFSC Code
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="ifsc"
                  value={formData.ifsc}
                  onChange={(e) => handleChange({ target: { name: 'ifsc', value: e.target.value.toUpperCase() } })}
                  placeholder="SBIN0001234"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.ifsc
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-amber-500'
                  }`}
                />
                {errors.ifsc && (
                  <p className="text-sm text-red-600 mt-1">{errors.ifsc}</p>
                )}
              </div>

              {/* Bank Name */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bank Name
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  placeholder="State Bank of India"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.bank_name
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-amber-500'
                  }`}
                />
                {errors.bank_name && (
                  <p className="text-sm text-red-600 mt-1">{errors.bank_name}</p>
                )}
              </div>

              {/* Account Type */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Account Type
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  name="account_type"
                  value={formData.account_type}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.account_type
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-amber-500'
                  }`}
                >
                  <option value="">Select Account Type</option>
                  <option value="Savings">Savings</option>
                  <option value="Current">Current</option>
                </select>
                {errors.account_type && (
                  <p className="text-sm text-red-600 mt-1">{errors.account_type}</p>
                )}
              </div>
            </div>

            {/* PAN / Tax ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                PAN / Tax ID (Optional)
              </label>
              <input
                type="text"
                name="pan_tax_id"
                value={formData.pan_tax_id}
                onChange={(e) => handleChange({ target: { name: 'pan_tax_id', value: e.target.value.toUpperCase() } })}
                placeholder="AAAAA1234A"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.pan_tax_id
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-amber-500'
                }`}
              />
              {errors.pan_tax_id && (
                <p className="text-sm text-red-600 mt-1">{errors.pan_tax_id}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-5 border-t border-gray-200">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <DollarSign className="h-5 w-5" />
                {saving ? 'Saving...' : 'Save Payment Information'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Security Note */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-900">
            <strong>🔒 Security Note:</strong> Your payment information is encrypted and stored securely. We never share your bank details with third parties.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PaymentSettings;
