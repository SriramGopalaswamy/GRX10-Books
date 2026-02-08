
import React, { useState, useEffect } from 'react';
import { Plus, X, Edit2, Trash2, Save, ArrowUp, ArrowDown } from 'lucide-react';

interface WorkflowStep {
  id?: string;
  stepOrder: number;
  approverType: string;
  approverId?: string;
  isRequired: boolean;
  canDelegate: boolean;
  timeoutHours?: number;
}

interface ApprovalWorkflow {
  id: string;
  name: string;
  module: string;
  resource: string;
  workflowType: string;
  isActive: boolean;
  steps?: WorkflowStep[];
}

export const ApprovalWorkflowsPage: React.FC = () => {
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);
  const [formData, setFormData] = useState<Partial<ApprovalWorkflow>>({
    name: '',
    module: '',
    resource: '',
    workflowType: 'sequential',
    steps: []
  });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/security/approval-workflows?activeOnly=false');
      const data = await response.json();
      setWorkflows(data);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    }
  };

  const handleSave = async () => {
    try {
      const url = editingWorkflow
        ? `/api/security/approval-workflows/${editingWorkflow.id}`
        : '/api/security/approval-workflows';
      const method = editingWorkflow ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save workflow');
      await fetchWorkflows();
      setShowForm(false);
      setEditingWorkflow(null);
      setFormData({ name: '', module: '', resource: '', workflowType: 'sequential', steps: [] });
      alert('Workflow saved successfully');
    } catch (error: any) {
      alert(error.message || 'Failed to save workflow');
    }
  };

  const handleAddStep = () => {
    const steps = formData.steps || [];
    setFormData({
      ...formData,
      steps: [...steps, {
        stepOrder: steps.length + 1,
        approverType: 'role',
        isRequired: true,
        canDelegate: false
      }]
    });
  };

  const handleRemoveStep = (index: number) => {
    const steps = formData.steps || [];
    setFormData({
      ...formData,
      steps: steps.filter((_, i) => i !== index).map((step, i) => ({ ...step, stepOrder: i + 1 }))
    });
  };

  const handleUpdateStep = (index: number, field: string, value: any) => {
    const steps = formData.steps || [];
    steps[index] = { ...steps[index], [field]: value };
    setFormData({ ...formData, steps: [...steps] });
  };

  return (
    <div className="space-y-6 grx-animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-grx-text dark:text-white">Approval Workflows</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingWorkflow(null);
            setFormData({ name: '', module: '', resource: '', workflowType: 'sequential', steps: [] });
          }}
          className="bg-grx-primary-600 text-white px-4 py-2 rounded-lg hover:bg-grx-primary-700 flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          New Workflow
        </button>
      </div>

      {/* Workflow Form Modal */}
      {showForm && (
        <div className="fixed inset-0 grx-modal-backdrop flex items-center justify-center z-50">
          <div className="grx-glass-card rounded-xl shadow-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-grx-text dark:text-white">
                {editingWorkflow ? 'Edit Workflow' : 'Create Workflow'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingWorkflow(null);
                }}
                className="text-grx-muted dark:text-grx-muted hover:text-grx-text dark:hover:text-grx-primary-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Workflow Name</label>
                  <input
                    type="text"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-grx-primary dark:focus:ring-grx-primary-400 outline-none"
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Module</label>
                  <select
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-grx-primary dark:focus:ring-grx-primary-400 outline-none"
                    value={formData.module || ''}
                    onChange={e => setFormData({ ...formData, module: e.target.value })}
                  >
                    <option value="">Select module</option>
                    <option value="hrms">HRMS</option>
                    <option value="financial">Financial</option>
                    <option value="os">Performance OS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Resource</label>
                  <input
                    type="text"
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-grx-primary dark:focus:ring-grx-primary-400 outline-none"
                    value={formData.resource || ''}
                    onChange={e => setFormData({ ...formData, resource: e.target.value })}
                    placeholder="e.g. leave, expense, invoice"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-2">Workflow Type</label>
                  <select
                    className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-grx-primary dark:focus:ring-grx-primary-400 outline-none"
                    value={formData.workflowType || 'sequential'}
                    onChange={e => setFormData({ ...formData, workflowType: e.target.value })}
                  >
                    <option value="sequential">Sequential</option>
                    <option value="parallel">Parallel</option>
                    <option value="any">Any</option>
                  </select>
                </div>
              </div>

              {/* Workflow Steps */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-grx-text">Approval Steps</label>
                  <button
                    onClick={handleAddStep}
                    className="text-grx-primary-600 hover:text-grx-primary-700 text-sm font-medium"
                  >
                    + Add Step
                  </button>
                </div>
                <div className="space-y-3">
                  {(formData.steps || []).map((step, index) => (
                    <div key={index} className="border border-grx-primary-100 dark:border-grx-primary-800 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-medium text-grx-text dark:text-white">Step {step.stepOrder}</span>
                        <button
                          onClick={() => handleRemoveStep(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-grx-muted dark:text-grx-muted mb-1">Approver Type</label>
                          <select
                            className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded p-2 text-sm focus:ring-2 focus:ring-grx-primary dark:focus:ring-grx-primary-400 outline-none"
                            value={step.approverType}
                            onChange={e => handleUpdateStep(index, 'approverType', e.target.value)}
                          >
                            <option value="role">Role</option>
                            <option value="user">User</option>
                            <option value="manager">Manager</option>
                            <option value="department_head">Department Head</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-grx-muted dark:text-grx-muted mb-1">Approver ID</label>
                          <input
                            type="text"
                            className="w-full border border-grx-primary-100 dark:border-grx-primary-700 bg-white dark:bg-grx-primary-800 text-grx-text dark:text-white rounded p-2 text-sm focus:ring-2 focus:ring-grx-primary dark:focus:ring-grx-primary-400 outline-none"
                            value={step.approverId || ''}
                            onChange={e => handleUpdateStep(index, 'approverId', e.target.value)}
                            placeholder="Role ID or User ID"
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={step.isRequired}
                              onChange={e => handleUpdateStep(index, 'isRequired', e.target.checked)}
                              className="rounded border-grx-primary-100 text-grx-primary-600"
                            />
                            <span className="text-xs text-grx-text dark:text-grx-primary-200">Required</span>
                          </label>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={step.canDelegate}
                              onChange={e => handleUpdateStep(index, 'canDelegate', e.target.checked)}
                              className="rounded border-grx-primary-100 text-grx-primary-600"
                            />
                            <span className="text-xs text-grx-text dark:text-grx-primary-200">Can Delegate</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingWorkflow(null);
                }}
                className="px-4 py-2 text-grx-text dark:text-grx-primary-200 hover:bg-grx-primary-50 dark:hover:bg-grx-primary-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-grx-primary-600 text-white px-4 py-2 rounded-lg hover:bg-grx-primary-700 flex items-center gap-2 transition-colors"
              >
                <Save size={18} />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflows List */}
      <div className="grx-glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-grx-bg dark:bg-grx-dark border-b border-grx-primary-100 dark:border-grx-primary-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted dark:text-grx-muted uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted uppercase tracking-wider">Module</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted uppercase tracking-wider">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted uppercase tracking-wider">Steps</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-grx-dark-surface divide-y divide-grx-primary-100 dark:divide-grx-primary-800">
              {workflows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-grx-muted">
                    No workflows found
                  </td>
                </tr>
              ) : (
                workflows.map(workflow => (
                  <tr key={workflow.id} className="hover:bg-grx-bg">
                    <td className="px-6 py-4 font-medium text-grx-text dark:text-white">{workflow.name}</td>
                    <td className="px-6 py-4 text-grx-muted">{workflow.module}</td>
                    <td className="px-6 py-4 text-grx-muted">{workflow.resource}</td>
                    <td className="px-6 py-4 text-grx-muted">{workflow.workflowType}</td>
                    <td className="px-6 py-4 text-grx-muted">{workflow.steps?.length || 0} steps</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        workflow.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-grx-primary-50 text-grx-text'
                      }`}>
                        {workflow.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingWorkflow(workflow);
                            setFormData(workflow);
                            setShowForm(true);
                          }}
                          className="text-grx-primary-600 hover:text-grx-primary-700"
                        >
                          <Edit2 size={18} />
                        </button>
                      </div>
                    </td>
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

