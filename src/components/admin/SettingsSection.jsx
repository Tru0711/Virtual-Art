import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Save, Shield, UserCheck, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminApi } from '../../lib/adminApi';

const USER_TYPE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'artist', label: 'Artist' },
  { value: 'admin', label: 'Admin' },
];

const SUB_ADMIN_OPTIONS = [
  { value: 'admin', label: 'Make Admin' },
  { value: 'artist', label: 'Convert to Artist' },
  { value: 'user', label: 'Convert to User' },
];

const SettingsSection = ({ onUsersUpdated }) => {
  const [panel, setPanel] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');
  const [selectedSubAdminAction, setSelectedSubAdminAction] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isSubAdminPanel = panel === 'subAdmins';
  const panelTitle = isSubAdminPanel ? 'Sub-Admin Management' : 'Role-Based Access';
  const panelDescription = isSubAdminPanel
    ? 'Promote users to admin or demote admins back to a lower role.'
    : 'Assign platform roles with a dedicated save flow.';

  const selectedUser = useMemo(
    () => users.find((user) => String(user._id || user.id) === String(selectedUserId)) || null,
    [users, selectedUserId]
  );

  const adminUsers = useMemo(
    () => users.filter((user) => user.user_type === 'admin'),
    [users]
  );

  const nonAdminUsers = useMemo(
    () => users.filter((user) => user.user_type !== 'admin'),
    [users]
  );

  useEffect(() => {
    if (!panel) {
      return undefined;
    }

    let mounted = true;
    const loadUsers = async () => {
      setLoading(true);
      try {
        const response = await adminApi.getUsers();
        if (mounted) {
          setUsers(Array.isArray(response) ? response : []);
        }
      } catch (error) {
        toast.error(error?.response?.data?.message || error?.message || 'Failed to load users');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadUsers();

    return () => {
      mounted = false;
    };
  }, [panel]);

  useEffect(() => {
    if (!selectedUserId && users.length) {
      const fallback = isSubAdminPanel
        ? (users.find((user) => user.user_type === 'admin') || users.find((user) => user.user_type !== 'admin') || users[0])
        : (users[0]);
      setSelectedUserId(String(fallback?._id || fallback?.id || ''));
      setSelectedRole(fallback?.user_type || 'admin');
      setSelectedSubAdminAction(fallback?.user_type === 'admin' ? 'user' : 'admin');
    }
  }, [isSubAdminPanel, users, selectedUserId]);

  const openPanel = (nextPanel) => {
    setPanel(nextPanel);
    setSelectedUserId('');
    setSelectedRole('admin');
    setSelectedSubAdminAction('admin');
  };

  const closePanel = () => {
    setPanel(null);
    setUsers([]);
    setSelectedUserId('');
    setSelectedRole('admin');
    setSelectedSubAdminAction('admin');
    setLoading(false);
    setSaving(false);
  };

  const applyRoleUpdate = async (userId, role) => {
    await adminApi.updateUser(userId, { user_type: role });
    await onUsersUpdated?.();
    const refreshedUsers = await adminApi.getUsers();
    setUsers(Array.isArray(refreshedUsers) ? refreshedUsers : []);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) {
      toast.error('Select a user first');
      return;
    }

    setSaving(true);
    try {
      await applyRoleUpdate(selectedUser._id || selectedUser.id, selectedRole);
      toast.success('Role updated successfully');
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const handleSubAdminAction = async () => {
    if (!selectedUser) {
      toast.error('Select a user first');
      return;
    }

    const nextRole = selectedSubAdminAction;
    if (selectedUser.user_type === 'admin' && nextRole === 'admin') {
      toast.error('This user is already an admin');
      return;
    }

    setSaving(true);
    try {
      await applyRoleUpdate(selectedUser._id || selectedUser.id, nextRole);
      toast.success(
        nextRole === 'admin'
          ? 'User promoted to admin successfully'
          : 'Admin role updated successfully'
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update sub-admin');
    } finally {
      setSaving(false);
    }
  };

  const panelUsers = isSubAdminPanel ? users : users;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Settings & Permissions</h1>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-blue-50 p-2 text-blue-600">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Sub-Admin Management</h3>
            </div>
            <p className="text-gray-600 mb-4">Promote users to admin or demote current admins safely.</p>
            <button
              type="button"
              onClick={() => openPanel('subAdmins')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Manage Sub-Admins
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-green-50 p-2 text-green-600">
                <UserCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Role-Based Access</h3>
            </div>
            <p className="text-gray-600 mb-4">Assign user, artist, or admin roles with a single save.</p>
            <button
              type="button"
              onClick={() => openPanel('roles')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Configure Roles
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">System Configuration</h3>
          <p className="text-gray-600">Change admin credentials, update themes, limits, and API keys</p>
        </div>
      </div>

      {panel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{panelTitle}</h2>
                <p className="text-sm text-gray-500">{panelDescription}</p>
              </div>
              <button type="button" onClick={closePanel} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                {loading
                  ? 'Loading users...'
                  : isSubAdminPanel
                    ? `${adminUsers.length} admins and ${nonAdminUsers.length} non-admin users available for promotion or demotion.`
                    : 'Select any user and save a new role.'}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">User</span>
                  <select
                    value={selectedUserId}
                    onChange={(event) => {
                      const nextUserId = event.target.value;
                      setSelectedUserId(nextUserId);
                      const nextUser = users.find((user) => String(user._id || user.id) === String(nextUserId));
                      setSelectedRole(nextUser?.user_type || 'user');
                      setSelectedSubAdminAction(nextUser?.user_type === 'admin' ? 'user' : 'admin');
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                  >
                    <option value="">Select a user</option>
                    {panelUsers.map((user) => (
                      <option key={user._id || user.id} value={user._id || user.id}>
                        {user.full_name || user.email || 'Unknown user'} ({user.user_type || 'user'})
                      </option>
                    ))}
                  </select>
                </label>

                {isSubAdminPanel ? (
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Action</span>
                    <select
                      value={selectedSubAdminAction}
                      onChange={(event) => setSelectedSubAdminAction(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    >
                      {selectedUser?.user_type === 'admin'
                        ? SUB_ADMIN_OPTIONS.filter((option) => option.value !== 'admin').map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))
                        : SUB_ADMIN_OPTIONS.filter((option) => option.value === 'admin').map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                  </label>
                ) : (
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Role</span>
                    <select
                      value={selectedRole}
                      onChange={(event) => setSelectedRole(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    >
                      {USER_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="max-h-72 overflow-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      {isSubAdminPanel && <th className="px-4 py-3">Flow</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {panelUsers.map((user) => (
                      <tr key={user._id || user.id} className={String(user._id || user.id) === String(selectedUserId) ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-3 font-medium text-gray-900">{user.full_name || 'Unknown'}</td>
                        <td className="px-4 py-3 text-gray-600">{user.email || 'N/A'}</td>
                        <td className="px-4 py-3 text-gray-600">{user.user_type || 'user'}</td>
                        {isSubAdminPanel && (
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {user.user_type === 'admin' ? 'Can be demoted' : 'Can be promoted to admin'}
                          </td>
                        )}
                      </tr>
                    ))}
                    {!panelUsers.length && !loading && (
                      <tr>
                        <td colSpan={isSubAdminPanel ? 4 : 3} className="px-4 py-6 text-center text-gray-500">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closePanel}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={isSubAdminPanel ? handleSubAdminAction : handleSaveRole}
                  disabled={saving || loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : (isSubAdminPanel ? 'Apply Sub-Admin Change' : 'Save Role')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsSection;
