
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, CheckCircle, XCircle } from 'lucide-react';
import { useConfiguration } from '../../contexts/ConfigurationContext';

export interface ConfigItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  [key: string]: any;
}

interface ConfigManagerProps {
  title: string;
  apiEndpoint: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'textarea' | 'date';
    options?: Array<{ value: string; label: string }>;
    required?: boolean;
  }>;
  onItemChange?: () => void;
}

export const ConfigManager: React.FC<ConfigManagerProps> = ({
  title,
  apiEndpoint,
  fields,
  onItemChange
}) => {
  const { refreshConfig } = useConfiguration();
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ConfigItem>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterActive, setFilterActive] = useState(true);

  useEffect(() => {
    fetchItems();
  }, [apiEndpoint, filterActive]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const url = filterActive 
        ? `/api/config/${apiEndpoint}?activeOnly=true`
        : `/api/config/${apiEndpoint}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
      alert('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      const response = await fetch(`/api/config/${apiEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create');
      }
      await fetchItems();
      setShowAddForm(false);
      setFormData({});
      await refreshConfig(); // Refresh global configuration context
      onItemChange?.();
    } catch (error: any) {
      alert(error.message || 'Failed to create item');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const response = await fetch(`/api/config/${apiEndpoint}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update');
      }
      await fetchItems();
      setEditingId(null);
      setFormData({});
      await refreshConfig(); // Refresh global configuration context
      onItemChange?.();
    } catch (error: any) {
      alert(error.message || 'Failed to update item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this item?')) return;
    try {
      const response = await fetch(`/api/config/${apiEndpoint}/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete');
      await fetchItems();
      await refreshConfig(); // Refresh global configuration context
      onItemChange?.();
    } catch (error) {
      alert('Failed to delete item');
    }
  };

  const handleToggleActive = async (item: ConfigItem) => {
    try {
      const response = await fetch(`/api/config/${apiEndpoint}/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive })
      });
      if (!response.ok) throw new Error('Failed to update');
      await fetchItems();
      await refreshConfig(); // Refresh global configuration context
      onItemChange?.();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const startEdit = (item: ConfigItem) => {
    setEditingId(item.id);
    setFormData(item);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterActive(!filterActive)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterActive
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {filterActive ? 'Show All' : 'Show Active Only'}
          </button>
          <button
            onClick={() => {
              setShowAddForm(true);
              setFormData({ isActive: true });
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Add New
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Add New {title.slice(0, -1)}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData[field.key] || ''}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                  >
                    <option value="">Select {field.label}</option>
                    {field.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData[field.key] || ''}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                  />
                ) : (
                  <input
                    type={field.type}
                    className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                    value={formData[field.key] || ''}
                    onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormData({});
              }}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 transition-colors"
            >
              <Save size={18} />
              Save
            </button>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <tr>
                {fields.map(field => (
                  <th key={field.key} className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    {field.label}
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={fields.length + 2} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    No items found
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    {editingId === item.id ? (
                      <>
                        {fields.map(field => (
                          <td key={field.key} className="px-6 py-4">
                            {field.type === 'select' ? (
                              <select
                                className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                                value={formData[field.key] || ''}
                                onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                              >
                                <option value="">Select {field.label}</option>
                                {field.options?.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            ) : field.type === 'textarea' ? (
                              <textarea
                                rows={2}
                                className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                                value={formData[field.key] || ''}
                                onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                              />
                            ) : (
                              <input
                                type={field.type}
                                className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none"
                                value={formData[field.key] || ''}
                                onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                              />
                            )}
                          </td>
                        ))}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleActive({ ...item, ...formData })}
                            className={`p-1.5 rounded transition-colors ${
                              formData.isActive !== false
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {formData.isActive !== false ? <CheckCircle size={18} /> : <XCircle size={18} />}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(item.id)}
                              className="text-emerald-600 hover:text-emerald-700"
                            >
                              <Save size={18} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-slate-600 hover:text-slate-700"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        {fields.map(field => (
                          <td key={field.key} className="px-6 py-4 text-sm text-slate-900 dark:text-slate-100">
                            {item[field.key] || '-'}
                          </td>
                        ))}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleActive(item)}
                            className={`p-1.5 rounded transition-colors ${
                              item.isActive
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-400 hover:bg-slate-100'
                            }`}
                            title={item.isActive ? 'Active' : 'Inactive'}
                          >
                            {item.isActive ? <CheckCircle size={18} /> : <XCircle size={18} />}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(item)}
                              className="text-indigo-600 hover:text-indigo-700"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Deactivate"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

