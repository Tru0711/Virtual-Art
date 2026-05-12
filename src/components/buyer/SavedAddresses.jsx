import React, { useEffect, useMemo, useState } from 'react';
import { Plus, MapPin, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
};

const SavedAddresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);

  const isEditing = useMemo(() => Boolean(editingAddressId), [editingAddressId]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const response = await api.getAddresses();
      if (response.success) {
        setAddresses(response.addresses || []);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingAddressId('');
    setIsFormOpen(false);
  };

  const onChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openCreateForm = () => {
    setEditingAddressId('');
    setFormData(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEditForm = (address) => {
    setEditingAddressId(address._id);
    setFormData({
      firstName: address.firstName || '',
      lastName: address.lastName || '',
      email: address.email || '',
      phone: address.phone || '',
      street: address.street || '',
      city: address.city || '',
      state: address.state || '',
      zipCode: address.zipCode || '',
      country: address.country || '',
    });
    setIsFormOpen(true);
  };

  const validate = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('Full name is required');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return false;
    }
    if (!/^\d{10,15}$/.test(formData.phone.trim())) {
      toast.error('Phone number must be 10-15 digits');
      return false;
    }
    if (!formData.street.trim() || !formData.city.trim() || !formData.state.trim() || !formData.country.trim()) {
      toast.error('Street, city, state, and country are required');
      return false;
    }
    if (!/^\d{4,10}$/.test(formData.zipCode.trim())) {
      toast.error('Pincode must be 4-10 digits');
      return false;
    }
    return true;
  };

  const saveAddress = async (event) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await api.updateAddress(editingAddressId, formData);
        toast.success('Address updated');
      } else {
        await api.createAddress(formData);
        toast.success('Address added');
      }
      resetForm();
      await loadAddresses();
    } catch (error) {
      toast.error(error.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const removeAddress = async (addressId) => {
    try {
      await api.deleteAddress(addressId);
      toast.success('Address deleted');
      await loadAddresses();
    } catch (error) {
      toast.error(error.message || 'Failed to delete address');
    }
  };

  const markDefault = async (addressId) => {
    try {
      await api.setDefaultAddress(addressId);
      toast.success('Default address updated');
      await loadAddresses();
    } catch (error) {
      toast.error(error.message || 'Failed to set default address');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Saved Addresses</h1>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add New Address
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={saveAddress} className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="firstName" value={formData.firstName} onChange={onChange} placeholder="First name" className="border rounded-lg px-3 py-2" required />
          <input name="lastName" value={formData.lastName} onChange={onChange} placeholder="Last name" className="border rounded-lg px-3 py-2" required />
          <input type="email" name="email" value={formData.email} onChange={onChange} placeholder="Email" className="border rounded-lg px-3 py-2" required />
          <input name="phone" value={formData.phone} onChange={onChange} placeholder="Phone number" className="border rounded-lg px-3 py-2" required />
          <input name="street" value={formData.street} onChange={onChange} placeholder="Street address" className="md:col-span-2 border rounded-lg px-3 py-2" required />
          <input name="city" value={formData.city} onChange={onChange} placeholder="City" className="border rounded-lg px-3 py-2" required />
          <input name="state" value={formData.state} onChange={onChange} placeholder="State" className="border rounded-lg px-3 py-2" required />
          <input name="zipCode" value={formData.zipCode} onChange={onChange} placeholder="Pincode" className="border rounded-lg px-3 py-2" required />
          <input name="country" value={formData.country} onChange={onChange} placeholder="Country" className="border rounded-lg px-3 py-2" required />

          <div className="md:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700">Cancel</button>
            <button disabled={saving} type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
              {saving ? 'Saving...' : isEditing ? 'Update Address' : 'Save Address'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {loading && <p className="text-gray-500">Loading addresses...</p>}

        {!loading && addresses.length === 0 && (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
            No saved addresses yet. Add your first delivery address.
          </div>
        )}

        {addresses.map((address) => (
          <div key={address._id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-blue-600 mt-1" />
              <div>
                <p className="font-semibold text-gray-900">
                  {address.firstName} {address.lastName}
                  {address.is_default && <span className="ml-2 text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Default</span>}
                </p>
                <p className="text-sm text-gray-600">{address.phone} | {address.email}</p>
                <p className="text-sm text-gray-600 mt-1">{address.street}, {address.city}, {address.state}, {address.country} - {address.zipCode}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!address.is_default && (
                <button onClick={() => markDefault(address._id)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-green-200 text-green-700 hover:bg-green-50">
                  <CheckCircle className="h-4 w-4" />
                  Set Default
                </button>
              )}
              <button onClick={() => openEditForm(address)} className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => removeAddress(address._id)} className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SavedAddresses;
