import React, { useState, useMemo } from 'react';
import { useStore } from '../../../../shared/contexts/StoreContext';
import { useAuth } from '../../../../shared/contexts/AuthContext';
import { Goal, GoalStatus, GoalComment, HRMSRole } from '../../../../shared/types';
import { Plus, CheckCircle, AlertCircle, XCircle, TrendingUp, Edit2, MessageSquare, Send, X } from 'lucide-react';
import { optimizeGoal } from '../../../../shared/services/gemini/geminiService';

export const GoalList: React.FC = () => {
  const { goals, currentUser, addGoal, updateGoal, users } = useStore();
  const { user: authUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Partial<Goal>>({});
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [isThinking, setIsThinking] = useState(false);
  const [newComment, setNewComment] = useState('');

  const visibleGoals = useMemo(() => {
    if (!authUser) return goals;

    if (authUser.role === HRMSRole.HR || authUser.role === HRMSRole.ADMIN) {
      return goals;
    }

    if (authUser.role === HRMSRole.MANAGER) {
      const reporteeIds = users
        .filter(u => u.id !== authUser.id)
        .map(u => u.id);
      const allVisibleIds = [authUser.id, ...reporteeIds];
      return goals.filter(g => allVisibleIds.includes(g.ownerId));
    }

    return goals.filter(g => g.ownerId === authUser.id);
  }, [goals, authUser, users]);

  const getStatusColor = (status: GoalStatus) => {
    switch (status) {
      case GoalStatus.ON_TRACK: return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
      case GoalStatus.AT_RISK: return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
      case GoalStatus.OFF_TRACK: return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case GoalStatus.COMPLETED: return 'bg-grx-primary-50 text-grx-primary border-grx-primary-200 dark:bg-grx-primary-800 dark:text-grx-primary-300 dark:border-grx-primary-700';
      default: return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getProgressBarColor = (status: GoalStatus) => {
    switch (status) {
      case GoalStatus.ON_TRACK: return 'bg-emerald-500';
      case GoalStatus.AT_RISK: return 'bg-amber-500';
      case GoalStatus.OFF_TRACK: return 'bg-red-500';
      case GoalStatus.COMPLETED: return 'bg-grx-primary';
      default: return 'bg-slate-400';
    }
  };

  const handleCreate = () => {
    setEditingGoal({
      id: Math.random().toString(36).substr(2, 9),
      ownerId: currentUser.id,
      status: GoalStatus.ON_TRACK,
      current: 0,
      comments: []
    });
    setAiSuggestion('');
    setNewComment('');
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingGoal.id && editingGoal.title) {
      const exists = goals.find(g => g.id === editingGoal.id);
      if (exists) {
        updateGoal(editingGoal as Goal);
      } else {
        addGoal(editingGoal as Goal);
      }
      setIsModalOpen(false);
    }
  };

  const handleOptimize = async () => {
    if (!editingGoal.title) return;
    setIsThinking(true);
    const suggestion = await optimizeGoal(editingGoal.title);
    setAiSuggestion(suggestion);
    setIsThinking(false);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: GoalComment = {
      id: Math.random().toString(36).substr(2, 9),
      authorId: currentUser.id,
      text: newComment,
      timestamp: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    setEditingGoal(prev => ({
      ...prev,
      comments: [...(prev.comments || []), comment]
    }));
    setNewComment('');
  };

  return (
    <div className="grx-animate-fade-in-up">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-grx-text dark:text-white">Goals & OKRs</h1>
          <p className="text-grx-muted mt-1">Quantifiable performance tracking for {currentUser.team}</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-grx-primary hover:bg-grx-primary-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all duration-200 grx-btn-press grx-focus-ring font-medium"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <Plus size={18} />
          Create Goal
        </button>
      </div>

      <div className="bg-white dark:bg-grx-dark-surface rounded-xl border border-slate-100 dark:border-grx-primary-800 overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
        <table className="min-w-full divide-y divide-slate-100 dark:divide-grx-primary-800">
          <thead className="bg-grx-primary-50 dark:bg-grx-primary-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted uppercase tracking-wider">Goal Title</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted uppercase tracking-wider">Metric</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted uppercase tracking-wider">Progress</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-grx-muted uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-grx-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-grx-dark-surface divide-y divide-slate-50 dark:divide-grx-primary-800">
            {visibleGoals.map((goal) => {
              const progress = ((goal.current - goal.baseline) / (goal.target - goal.baseline)) * 100;
              const clampedProgress = Math.min(Math.max(progress, 0), 100);

              return (
                <tr key={goal.id} className="hover:bg-grx-bg dark:hover:bg-grx-primary-800/30 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-grx-text dark:text-white">{goal.title}</div>
                    <div className="text-xs text-grx-muted mt-0.5">{goal.type} &middot; Due {goal.timeline}</div>
                    {goal.comments && goal.comments.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-grx-muted">
                        <MessageSquare size={12} /> {goal.comments.length}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-grx-text dark:text-white">{goal.target} {goal.metric}</div>
                    <div className="text-xs text-grx-muted">Current: {goal.current}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap w-48">
                    <div className="w-full bg-slate-100 dark:bg-grx-primary-800 rounded-full h-2 mb-1.5">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getProgressBarColor(goal.status)}`}
                        style={{ width: `${clampedProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-grx-muted">{Math.round(clampedProgress)}% Completed</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(goal.status)}`}>
                      {goal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => { setEditingGoal(goal); setAiSuggestion(''); setNewComment(''); setIsModalOpen(true); }}
                      className="text-grx-primary hover:text-grx-accent transition-colors duration-150 p-1.5 rounded-lg hover:bg-grx-primary-50 dark:hover:bg-grx-primary-800 grx-focus-ring"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 grx-animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <div
            className="bg-white dark:bg-grx-dark-surface rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto grx-animate-scale-in"
            style={{ boxShadow: 'var(--shadow-xl)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 dark:border-grx-primary-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-grx-text dark:text-white">
                {editingGoal.id && goals.find(g => g.id === editingGoal.id) ? 'Edit Goal' : 'New Goal'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-grx-muted hover:text-grx-text dark:hover:text-white transition-colors p-1.5 rounded-lg hover:bg-grx-bg dark:hover:bg-grx-primary-800 grx-focus-ring"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* AI Goal Coach */}
              <div className="bg-grx-primary-50 dark:bg-grx-primary-800/50 p-4 rounded-xl border border-grx-primary-100 dark:border-grx-primary-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-grx-primary dark:text-grx-primary-300 flex items-center gap-2">
                      <TrendingUp size={16} /> AI Goal Coach
                    </h3>
                    <p className="text-xs text-grx-muted mt-1">
                      Type a rough goal title and click "Optimize" to make it SMART.
                    </p>
                  </div>
                  <button
                    onClick={handleOptimize}
                    disabled={isThinking || !editingGoal.title}
                    className="bg-grx-primary text-white text-xs px-3 py-1.5 rounded-lg hover:bg-grx-primary-600 disabled:opacity-50 transition-colors grx-btn-press grx-focus-ring font-medium"
                  >
                    {isThinking ? 'Thinking...' : 'Optimize'}
                  </button>
                </div>
                {aiSuggestion && (
                  <div className="mt-3 p-3 bg-white dark:bg-grx-dark-surface rounded-lg border border-grx-primary-200 dark:border-grx-primary-700 text-sm text-grx-text dark:text-slate-300 font-mono whitespace-pre-wrap grx-animate-fade-in-up">
                    {aiSuggestion}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-slate-200 mb-1.5">Goal Title</label>
                <input
                  type="text"
                  value={editingGoal.title || ''}
                  onChange={e => setEditingGoal({...editingGoal, title: e.target.value})}
                  className="w-full rounded-lg border border-slate-200 dark:border-grx-primary-700 bg-grx-bg dark:bg-grx-primary-800 px-3 py-2.5 text-grx-text dark:text-white placeholder-grx-muted outline-none transition-all duration-200 grx-focus-ring focus:border-grx-primary dark:focus:border-grx-primary-400"
                  placeholder="e.g. Increase qualified leads by 20%"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-slate-200 mb-1.5">Metric Unit</label>
                  <input
                    type="text"
                    value={editingGoal.metric || ''}
                    onChange={e => setEditingGoal({...editingGoal, metric: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 dark:border-grx-primary-700 bg-grx-bg dark:bg-grx-primary-800 px-3 py-2.5 text-grx-text dark:text-white placeholder-grx-muted outline-none transition-all duration-200 grx-focus-ring focus:border-grx-primary dark:focus:border-grx-primary-400"
                    placeholder="e.g. Leads, Revenue ($)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-slate-200 mb-1.5">Timeline (Date)</label>
                  <input
                    type="date"
                    value={editingGoal.timeline || ''}
                    onChange={e => setEditingGoal({...editingGoal, timeline: e.target.value})}
                    className="w-full rounded-lg border border-slate-200 dark:border-grx-primary-700 bg-grx-bg dark:bg-grx-primary-800 px-3 py-2.5 text-grx-text dark:text-white outline-none transition-all duration-200 grx-focus-ring focus:border-grx-primary dark:focus:border-grx-primary-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-slate-200 mb-1.5">Baseline</label>
                  <input
                    type="number"
                    value={editingGoal.baseline || 0}
                    onChange={e => setEditingGoal({...editingGoal, baseline: Number(e.target.value)})}
                    className="w-full rounded-lg border border-slate-200 dark:border-grx-primary-700 bg-grx-bg dark:bg-grx-primary-800 px-3 py-2.5 text-grx-text dark:text-white outline-none transition-all duration-200 grx-focus-ring focus:border-grx-primary dark:focus:border-grx-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-slate-200 mb-1.5">Target</label>
                  <input
                    type="number"
                    value={editingGoal.target || 0}
                    onChange={e => setEditingGoal({...editingGoal, target: Number(e.target.value)})}
                    className="w-full rounded-lg border border-slate-200 dark:border-grx-primary-700 bg-grx-bg dark:bg-grx-primary-800 px-3 py-2.5 text-grx-text dark:text-white outline-none transition-all duration-200 grx-focus-ring focus:border-grx-primary dark:focus:border-grx-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text dark:text-slate-200 mb-1.5">Current Actuals</label>
                  <input
                    type="number"
                    value={editingGoal.current || 0}
                    onChange={e => setEditingGoal({...editingGoal, current: Number(e.target.value)})}
                    className="w-full rounded-lg border border-slate-200 dark:border-grx-primary-700 bg-grx-bg dark:bg-grx-primary-800 px-3 py-2.5 text-grx-text dark:text-white outline-none transition-all duration-200 grx-focus-ring focus:border-grx-primary dark:focus:border-grx-primary-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-grx-text dark:text-slate-200 mb-1.5">Status</label>
                <select
                  value={editingGoal.status}
                  onChange={e => setEditingGoal({...editingGoal, status: e.target.value as GoalStatus})}
                  className="w-full rounded-lg border border-slate-200 dark:border-grx-primary-700 bg-grx-bg dark:bg-grx-primary-800 px-3 py-2.5 text-grx-text dark:text-white outline-none transition-all duration-200 grx-focus-ring focus:border-grx-primary dark:focus:border-grx-primary-400"
                >
                  {Object.values(GoalStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Comments Section */}
              {editingGoal.id && goals.find(g => g.id === editingGoal.id) && (
                <div className="border-t border-slate-100 dark:border-grx-primary-800 pt-5">
                  <h3 className="text-sm font-bold text-grx-text dark:text-white mb-4 flex items-center gap-2">
                    <MessageSquare size={16} className="text-grx-primary" /> Discussion & Feedback
                  </h3>

                  <div className="bg-grx-bg dark:bg-grx-primary-800/30 rounded-xl p-4 space-y-4 max-h-60 overflow-y-auto mb-4">
                    {(!editingGoal.comments || editingGoal.comments.length === 0) && (
                      <p className="text-sm text-grx-muted italic">No comments yet. Be the first to ask a question.</p>
                    )}
                    {editingGoal.comments?.map(comment => {
                      const author = users.find(u => u.id === comment.authorId);
                      return (
                        <div key={comment.id} className="flex gap-3 grx-animate-fade-in">
                          <img src={author?.avatarUrl || 'https://via.placeholder.com/32'} className="w-8 h-8 rounded-full flex-shrink-0" alt="avatar" />
                          <div className="flex-1">
                            <div className="flex justify-between items-baseline">
                              <span className="text-sm font-semibold text-grx-text dark:text-white">{author?.name || 'Unknown'}</span>
                              <span className="text-xs text-grx-muted">{comment.timestamp}</span>
                            </div>
                            <p className="text-sm text-grx-muted mt-1 bg-white dark:bg-grx-dark-surface p-2.5 rounded-lg border border-slate-100 dark:border-grx-primary-800">
                              {comment.text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Ask a question or leave feedback..."
                      className="flex-1 rounded-lg border border-slate-200 dark:border-grx-primary-700 bg-grx-bg dark:bg-grx-primary-800 px-3 py-2 text-sm text-grx-text dark:text-white placeholder-grx-muted outline-none grx-focus-ring focus:border-grx-primary dark:focus:border-grx-primary-400 transition-all duration-200"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="bg-grx-primary text-white p-2.5 rounded-lg hover:bg-grx-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed grx-btn-press grx-focus-ring"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                  <p className="text-xs text-grx-muted mt-2 text-right">Comments are saved when you click "Save Goal"</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-grx-bg dark:bg-grx-primary-900/50 border-t border-slate-100 dark:border-grx-primary-800 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 text-grx-text dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-grx-primary-800 rounded-lg transition-colors grx-btn-press grx-focus-ring font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-grx-primary text-white hover:bg-grx-primary-600 rounded-lg transition-colors grx-btn-press grx-focus-ring font-medium"
                style={{ boxShadow: 'var(--shadow-sm)' }}
              >
                Save Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
