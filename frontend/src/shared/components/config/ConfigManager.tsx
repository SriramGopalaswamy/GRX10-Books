
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useConfiguration } from '../../contexts/ConfigurationContext';
import { validateForm, ValidationErrors, commonRules } from '../../utils/validation';

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
  const [errors, setErrors] = useState<ValidationErrors>({});

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
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch: ${response.statusText}`);
      }
      const data = await response.json();
      setItems(data);
    } catch (error: any) {
      console.error('Error fetching items:', error);
      alert(error.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    // Validate form
    const validationRules: Record<string, any> = {};
    fields.forEach(field => {
      if (field.required) {
        validationRules[field.key] = { required: true };
        if (field.type === 'email') {
          validationRules[field.key] = { ...validationRules[field.key], email: true };
        }
        if (field.type === 'number') {
          validationRules[field.key] = { ...validationRules[field.key], number: true, min: 0 };
        }
      }
    });

    const validationErrors = validateForm(formData, validationRules);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
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
      setErrors({});
      await refreshConfig(); // Refresh global configuration context
      onItemChange?.();
    } catch (error: any) {
      alert(error.message || 'Failed to create item');
    }
  };

  const handleUpdate = async (id: string) => {
    // Validate form
    const validationRules: Record<string, any> = {};
    fields.forEach(field => {
      if (field.required) {
        validationRules[field.key] = { required: true };
        if (field.type === 'email') {
          validationRules[field.key] = { ...validationRules[field.key], email: true };
        }
        if (field.type === 'number') {
          validationRules[field.key] = { ...validationRules[field.key], number: true, min: 0 };
        }
      }
    });

    const validationErrors = validateForm(formData, validationRules);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
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
      setErrors({});
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
    setErrors({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-grx-muted dark:text-grx-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-grx-text dark:text-white">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterActive(!filterActive)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterActive
                ? 'bg-grx-primary-100 dark:bg-grx-primary-900/30 text-grx-primary-700 dark:text-grx-primary-400'
                : 'bg-grx-primary-50 dark:bg-grx-primary-800 text-grx-text dark:text-grx-primary-200'
            }`}
          >
            {filterActive ? 'Show All' : 'Show Active Only'}
          </button>
          <button
            onClick={() => {
              setShowAddForm(true);
              setFormData({ isActive: true });
            }}
            className="bg-grx-primary-600 text-white px-4 py-2 rounded-lg hover:bg-grx-primary-700 flex items-center gap-2 transition-colors"
          >
            <Plus size={18} />
            Add New
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="grx-glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold text-grx-text dark:text-white mb-4">Add New {title.slice(0, -1)}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 grx-stagger">
            {fields.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-grx-primary dark:focus:ring-grx-primary-400 outline-none ${
                      errors[field.key] 
                        ? 'border-red-300 dark:border-red-700 bg-white dark:bg-grx-primary-800' 
                        : 'border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800'
                    } text-grx-text dark:text-white`}
                    value={formData[field.key] || ''}
                    onChange={e => {
                      setFormData({ ...formData, [field.key]: e.target.value });
                      if (errors[field.key]) {
                        const newErrors = { ...errors };
                        delete newErrors[field.key];
                        setErrors(newErrors);
                      }
                    }}
                  >
                    <option value="">Select {field.label}</option>
                    {field.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-grx-primary dark:focus:ring-grx-primary-400 outline-none ${
                      errors[field.key] 
                        ? 'border-red-300 dark:border-red-700 bg-white dark:bg-grx-primary-800' 
                        : 'border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800'
                    } text-grx-text dark:text-white`}
                    value={formData[field.key] || ''}
                    onChange={e => {
                      setFormData({ ...formData, [field.key]: e.target.value });
                      if (errors[field.key]) {
                        const newErrors = { ...errors };
                        delete newErrors[field.key];
                        setErrors(newErrors);
                      }
                    }}
                  />
                ) : (
                  <input
                    type={field.type}
                    className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-grx-primary dark:focus:ring-grx-primary-400 outline-none ${
                      errors[field.key] 
                        ? 'border-red-300 dark:border-red-700 bg-white dark:bg-grx-primary-800' 
                        : 'border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800'
                    } text-grx-text dark:text-white`}
                    value={formData[field.key] || ''}
                    onChange={e => {
                      setFormData({ ...formData, [field.key]: e.target.value });
                      if (errors[field.key]) {
                        const newErrors = { ...errors };
                        delete newErrors[field.key];
                        setErrors(newErrors);
                      }
                    }}
                    required={field.required}
                  />
                )}
                {errors[field.key] && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle size={14} />
                    <span>{errors[field.key]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => {
                setShowAddForm(false);
                setFormData({});
                setErrors({});
              }}
              className="px-4 py-2 text-grx-text dark:text-grx-primary-200 hover:bg-grx-primary-50 dark:hover:bg-grx-primary-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="bg-grx-primary-600 text-white px-4 py-2 rounded-lg hover:bg-grx-primary-700 flex items-center gap-2 transition-colors"
            >
              <Save size={18} />
              Save
            </button>
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white rounded-xl shadow-sm border border-grx-primary-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-100 dark:border-grx-primary-800">
              <tr>
                {fields.map(field => (
                  <th key={field.key} className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase tracking-wider">
                    {field.label}
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-grx-dark-surface divide-y divide-grx-primary-100 dark:divide-grx-primary-800">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={fields.length + 2} className="px-6 py-12 text-center text-grx-muted dark:text-grx-muted">
                    No items found
                  </td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800">
                    {editingId === item.id ? (
                      <>
                        {fields.map(field => (
                          <td key={field.key} className="px-6 py-4 max-w-xs">
                            {field.type === 'select' ? (
                              <select
                                className={`w-full border rounded p-2 text-sm focus:ring-2 focus:ring-grx-primary dark:focus:ring-grx-primary-400 outline-none ${
                                  errors[field.key] 
                                    ? 'border-red-300 dark:border-red-700 bg-white dark:bg-grx-primary-800' 
                                    : 'border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800'
                                } text-grx-text dark:text-white`}
                                value={formData[field.key] || ''}
                                onChange={e => {
                                  setFormData({ ...formData, [field.key]: e.target.value });
                                  if (errors[field.key]) {
                                    const newErrors = { ...errors };
                                    delete newErrors[field.key];
                                    setErrors(newErrors);
                                  }
                                }}
                              >
                                <option value="">Select {field.label}</option>
                                {field.options?.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            ) : field.type === 'textarea' ? (
                              <textarea
                                rows={2}
                                className={`w-full border rounded p-2 text-sm focus:ring-2 focus:ring-grx-primary dark:focus:ring-grx-primary-400 outline-none ${
                                  errors[field.key] 
                                    ? 'border-red-300 dark:border-red-700 bg-white dark:bg-grx-primary-800' 
                                    : 'border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800'
                                } text-grx-text dark:text-white`}
                                value={formData[field.key] || ''}
                                onChange={e => {
                                  setFormData({ ...formData, [field.key]: e.target.value });
                                  if (errors[field.key]) {
                                    const newErrors = { ...errors };
                                    delete newErrors[field.key];
                                    setErrors(newErrors);
                                  }
                                }}
                              />
                            ) : (
                              <input
                                type={field.type}
                                className={`w-full border rounded p-2 text-sm focus:ring-2 focus:ring-grx-primary dark:focus:ring-grx-primary-400 outline-none ${
                                  errors[field.key] 
                                    ? 'border-red-300 dark:border-red-700 bg-white dark:bg-grx-primary-800' 
                                    : 'border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800'
                                } text-grx-text dark:text-white`}
                                value={formData[field.key] || ''}
                                onChange={e => {
                                  setFormData({ ...formData, [field.key]: e.target.value });
                                  if (errors[field.key]) {
                                    const newErrors = { ...errors };
                                    delete newErrors[field.key];
                                    setErrors(newErrors);
                                  }
                                }}
                              />
                            )}
                            {errors[field.key] && (
                              <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                                {errors[field.key]}
                              </div>
                            )}
                          </td>
                        ))}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleActive({ ...item, ...formData })}
                            className={`p-1.5 rounded transition-colors ${
                              formData.isActive !== false
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-grx-muted hover:bg-grx-primary-50'
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
                              className="text-grx-muted hover:text-grx-text"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        {fields.map(field => (
                          <td key={field.key} className="px-6 py-4 text-sm text-grx-text dark:text-white max-w-xs">
                            <div className="truncate" title={String(item[field.key] || '-')}>
                              {item[field.key] || '-'}
                            </div>
                          </td>
                        ))}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleActive(item)}
                            className={`p-1.5 rounded transition-colors ${
                              item.isActive
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-grx-muted hover:bg-grx-primary-50'
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
                              className="text-grx-primary-600 hover:text-grx-primary-700"
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

