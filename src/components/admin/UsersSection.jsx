import React, { useMemo, useState } from 'react';
import { Eye, Edit, Trash2, X, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminApi } from '../../lib/adminApi';

const USER_TYPE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'artist', label: 'Artist' },
  { value: 'admin', label: 'Admin' },
];

const emptyForm = {
  full_name: '',
  email: '',
  user_type: 'user',
  phone: '',
  address: '',
  city: '',
  state: '',
  country: '',
};

const UsersSection = ({ users = [], onUsersUpdated }) => {
  const [activeUser, setActiveUser] = useState(null);
  const [mode, setMode] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const activeUserDisplay = useMemo(() => {
    if (!activeUser) return null;
    return {
      ...activeUser,
      joinedAt: new Date(activeUser.created_at || activeUser.createdAt || Date.now()).toLocaleString(),
    };
  }, [activeUser]);

  const openViewModal = (user) => {
    setActiveUser(user);
    setMode('view');
  };

  const openEditModal = (user) => {
    setActiveUser(user);
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      user_type: user.user_type || 'user',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      country: user.country || '',
    });
    setMode('edit');
  };

  const closeModal = () => {
    setActiveUser(null);
    setMode(null);
    setSaving(false);
    setFormData(emptyForm);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!activeUser?._id && !activeUser?.id) {
      toast.error('User details are missing');
      return;
    }

    setSaving(true);
    try {
      await adminApi.updateUser(activeUser._id || activeUser.id, formData);
      toast.success('User updated successfully');
      closeModal();
      await onUsersUpdated?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    const userId = user?._id || user?.id;
    if (!userId) {
      toast.error('User details are missing');
      return;
    }
    // Show the red confirmation modal
    setDeleteConfirm(user);
  };

  const confirmDelete = async () => {
    const user = deleteConfirm;
    const userId = user?._id || user?.id;
    
    setSaving(true);
    try {
      await adminApi.deleteUser(userId);
      toast.success('User deleted successfully');
      setDeleteConfirm(null);
      await onUsersUpdated?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete user');
    } finally {
      setSaving(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">User Management</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length ? users.map((user) => {
                const userId = user._id || user.id;
                return (
                  <tr key={userId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.full_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.user_type === 'admin' ? 'bg-red-100 text-red-800' :
                        user.user_type === 'artist' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {user.user_type || 'user'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at || user.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => openViewModal(user)}
                          className="text-blue-600 hover:text-blue-900"
                          aria-label={`View ${user.full_name || 'user'}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="text-yellow-600 hover:text-yellow-900"
                          aria-label={`Edit ${user.full_name || 'user'}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          disabled={saving}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          aria-label={`Delete ${user.full_name || 'user'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    No users available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mode && activeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {mode === 'view' ? 'User Details' : 'Edit User'}
                </h2>
                <p className="text-sm text-gray-500">{activeUserDisplay?.full_name || 'User'}</p>
              </div>
              <button type="button" onClick={closeModal} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {mode === 'view' ? (
              <div className="grid gap-4 px-6 py-6 text-sm text-gray-700 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Full Name</p>
                  <p className="mt-1 font-medium text-gray-900">{activeUserDisplay?.full_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Role</p>
                  <p className="mt-1 font-medium text-gray-900">{activeUserDisplay?.user_type || 'user'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Email</p>
                  <p className="mt-1 font-medium text-gray-900">{activeUserDisplay?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Joined</p>
                  <p className="mt-1 font-medium text-gray-900">{activeUserDisplay?.joinedAt || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Phone</p>
                  <p className="mt-1 font-medium text-gray-900">{activeUserDisplay?.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">City</p>
                  <p className="mt-1 font-medium text-gray-900">{activeUserDisplay?.city || 'N/A'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Address</p>
                  <p className="mt-1 font-medium text-gray-900">{activeUserDisplay?.address || 'N/A'}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEditSubmit} className="space-y-4 px-6 py-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Full Name</span>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(event) => setFormData((current) => ({ ...current, full_name: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Email</span>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Role</span>
                    <select
                      value={formData.user_type}
                      onChange={(event) => setFormData((current) => ({ ...current, user_type: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    >
                      {USER_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Phone</span>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Address</span>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(event) => setFormData((current) => ({ ...current, address: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">City</span>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(event) => setFormData((current) => ({ ...current, city: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">State</span>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(event) => setFormData((current) => ({ ...current, state: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Country</span>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(event) => setFormData((current) => ({ ...current, country: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border-2 border-red-500 overflow-hidden">
            <div className="bg-red-50 border-b border-red-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-red-900">Delete User</h3>
              <p className="text-sm text-red-700 mt-1">This action cannot be undone</p>
            </div>

            <div className="px-6 py-6">
              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirm.full_name || 'this user'}</span>?
              </p>
              <p className="text-sm text-gray-600 mt-3">
                All associated data including orders, transactions, and profiles will be permanently removed from the system.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-red-100 px-6 py-4 bg-red-50">
              <button
                type="button"
                onClick={cancelDelete}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                <Trash2 className="h-4 w-4" />
                {saving ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersSection;
