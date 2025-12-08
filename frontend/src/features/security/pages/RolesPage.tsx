
import React, { useState, useEffect } from 'react';
import { ConfigManager, ConfigItem } from '../../../shared/components/config/ConfigManager';
import { Plus, X, CheckCircle2 } from 'lucide-react';

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<ConfigItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<ConfigItem | null>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole.id);
    }
  }, [selectedRole]);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/security/roles?activeOnly=false');
      if (!response.ok) {
        throw new Error(`Failed to fetch roles: ${response.statusText}`);
      }
      const data = await response.json();
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      alert('Failed to load roles. Please check if the backend is running and the API endpoint is correct.');
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/security/permissions?activeOnly=true');
      const data = await response.json();
      setPermissions(data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const fetchRolePermissions = async (roleId: string) => {
    try {
      const response = await fetch(`/api/security/roles/${roleId}`);
      const data = await response.json();
      setRolePermissions(data.permissions?.map((p: any) => p.id) || []);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      const response = await fetch(`/api/security/roles/${selectedRole.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds: rolePermissions })
      });
      if (!response.ok) throw new Error('Failed to save permissions');
      setShowPermissionModal(false);
      alert('Permissions updated successfully');
    } catch (error: any) {
      alert(error.message || 'Failed to update permissions');
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    const key = `${perm.module}.${perm.resource}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(perm);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <ConfigManager
        title="System Roles"
        apiEndpoint="security/roles"
        fields={[
          { key: 'name', label: 'Role Name', type: 'text', required: true },
          { key: 'code', label: 'Code', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' }
        ]}
        onItemChange={fetchRoles}
      />

      {/* Permission Assignment */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Assign Permissions to Roles</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Role</label>
            <select
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
              value={selectedRole?.id || ''}
              onChange={e => {
                const role = roles.find(r => r.id === e.target.value);
                setSelectedRole(role || null);
                setShowPermissionModal(true);
              }}
            >
              <option value="">Select a role</option>
              {roles.filter(r => r.isActive).map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          {showPermissionModal && selectedRole && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Permissions for {selectedRole.name}
                  </h3>
                  <button
                    onClick={() => {
                      setShowPermissionModal(false);
                      setSelectedRole(null);
                    }}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([key, perms]) => (
                    <div key={key} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">{key}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {perms.map(perm => (
                          <label
                            key={perm.id}
                            className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={rolePermissions.includes(perm.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setRolePermissions([...rolePermissions, perm.id]);
                                } else {
                                  setRolePermissions(rolePermissions.filter(id => id !== perm.id));
                                }
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">{perm.action}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => {
                      setShowPermissionModal(false);
                      setSelectedRole(null);
                    }}
                    className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePermissions}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
                  >
                    <CheckCircle2 size={18} />
                    Save Permissions
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

