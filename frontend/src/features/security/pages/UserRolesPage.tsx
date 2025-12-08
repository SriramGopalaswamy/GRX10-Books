
import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, User, Shield } from 'lucide-react';

interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
}

interface Role {
  id: string;
  name: string;
  code: string;
}

interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  isActive: boolean;
  role: Role;
}

export const UserRolesPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningRoleId, setAssigningRoleId] = useState<string>('');

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchUserRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/auth/users'); // You may need to create this endpoint
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/security/roles?activeOnly=true');
      const data = await response.json();
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchUserRoles = async () => {
    try {
      // Fetch all user roles - you may need to create a bulk endpoint
      const response = await fetch('/api/security/user-roles'); // You may need to create this
      if (response.ok) {
        const data = await response.json();
        setUserRoles(data);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !assigningRoleId) return;
    try {
      const response = await fetch(`/api/security/users/${selectedUser}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: assigningRoleId })
      });
      if (!response.ok) throw new Error('Failed to assign role');
      await fetchUserRoles();
      setShowAssignModal(false);
      setSelectedUser('');
      setAssigningRoleId('');
      alert('Role assigned successfully');
    } catch (error: any) {
      alert(error.message || 'Failed to assign role');
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    if (!confirm('Are you sure you want to remove this role?')) return;
    try {
      const response = await fetch(`/api/security/users/${userId}/roles/${roleId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to remove role');
      await fetchUserRoles();
      alert('Role removed successfully');
    } catch (error: any) {
      alert(error.message || 'Failed to remove role');
    }
  };

  const getUserRoles = (userId: string) => {
    return userRoles.filter(ur => ur.userId === userId && ur.isActive);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">User Role Assignment</h2>
        <button
          onClick={() => setShowAssignModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Assign Role
        </button>
      </div>

      {/* Assign Role Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Assign Role to User</h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedUser('');
                  setAssigningRoleId('');
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">User</label>
                <select
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                  value={selectedUser}
                  onChange={e => setSelectedUser(e.target.value)}
                >
                  <option value="">Select user</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.displayName || user.username} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
                <select
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                  value={assigningRoleId}
                  onChange={e => setAssigningRoleId(e.target.value)}
                >
                  <option value="">Select role</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedUser('');
                  setAssigningRoleId('');
                }}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignRole}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Roles Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Roles</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map(user => {
                  const roles = getUserRoles(user.id);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User size={20} className="text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{user.displayName || user.username}</p>
                            <p className="text-sm text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {roles.length === 0 ? (
                            <span className="text-slate-400 text-sm">No roles assigned</span>
                          ) : (
                            roles.map(ur => (
                              <span
                                key={ur.id}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700"
                              >
                                <Shield size={14} />
                                {ur.role.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {roles.map(ur => (
                            <button
                              key={ur.id}
                              onClick={() => handleRemoveRole(user.id, ur.roleId)}
                              className="text-red-600 hover:text-red-700"
                              title="Remove role"
                            >
                              <Trash2 size={18} />
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

