import React, { useState } from 'react';
import { useStore } from '../../../../shared/contexts/StoreContext';
import { Goal, GoalStatus, GoalComment } from '../../../../shared/types';
import { Plus, CheckCircle, AlertCircle, XCircle, TrendingUp, Edit2, MessageSquare, Send } from 'lucide-react';
import { optimizeGoal } from '../../../../shared/services/gemini/geminiService';

export const GoalList: React.FC = () => {
  const { goals, currentUser, addGoal, updateGoal, users } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Partial<Goal>>({});
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [isThinking, setIsThinking] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Filter goals based on role
  const visibleGoals = currentUser.role === 'Admin' 
    ? goals 
    : goals.filter(g => g.ownerId === currentUser.id);

  const getStatusColor = (status: GoalStatus) => {
    switch (status) {
      case GoalStatus.ON_TRACK: return 'bg-green-100 text-green-700 border-green-200';
      case GoalStatus.AT_RISK: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case GoalStatus.OFF_TRACK: return 'bg-red-100 text-red-700 border-red-200';
      case GoalStatus.COMPLETED: return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700';
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
        // Check if existing
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Goals & OKRs</h1>
          <p className="text-slate-500 dark:text-slate-400">Quantifiable performance tracking for {currentUser.team}</p>
        </div>
        <button 
          onClick={handleCreate}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={18} />
          Create Goal
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead className="bg-gray-50 dark:bg-slate-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Goal Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {visibleGoals.map((goal) => {
                const progress = ((goal.current - goal.baseline) / (goal.target - goal.baseline)) * 100;
                const clampedProgress = Math.min(Math.max(progress, 0), 100);
                
                return (
              <tr key={goal.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{goal.title}</div>
                  <div className="text-xs text-gray-500">{goal.type} • Due {goal.timeline}</div>
                  {goal.comments && goal.comments.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <MessageSquare size={12} /> {goal.comments.length}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{goal.target} {goal.metric}</div>
                  <div className="text-xs text-gray-500">Current: {goal.current}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap w-48">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                    <div className="bg-brand-600 h-2.5 rounded-full" style={{ width: `${clampedProgress}%` }}></div>
                  </div>
                  <span className="text-xs text-gray-500">{Math.round(clampedProgress)}% Completed</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(goal.status)}`}>
                    {goal.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => { setEditingGoal(goal); setAiSuggestion(''); setNewComment(''); setIsModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900">
                    <Edit2 size={16} />
                  </button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{editingGoal.id && goals.find(g => g.id === editingGoal.id) ? 'Edit Goal' : 'New Goal'}</h2>
              <button onClick={() => setIsModalOpen(false)}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Gemini Integration */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                            <TrendingUp size={16} /> AI Goal Coach
                        </h3>
                        <p className="text-xs text-blue-600 mt-1">
                            Type a rough goal title and click "Optimize" to make it SMART.
                        </p>
                    </div>
                    <button 
                        onClick={handleOptimize}
                        disabled={isThinking || !editingGoal.title}
                        className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isThinking ? 'Thinking...' : 'Optimize'}
                    </button>
                </div>
                {aiSuggestion && (
                    <div className="mt-3 p-3 bg-white rounded border border-blue-200 text-sm text-gray-700 font-mono whitespace-pre-wrap">
                        {aiSuggestion}
                    </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Goal Title</label>
                <input 
                  type="text" 
                  value={editingGoal.title || ''} 
                  onChange={e => setEditingGoal({...editingGoal, title: e.target.value})}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="e.g. Increase qualified leads by 20%"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Metric Unit</label>
                    <input 
                      type="text" 
                      value={editingGoal.metric || ''} 
                      onChange={e => setEditingGoal({...editingGoal, metric: e.target.value})}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      placeholder="e.g. Leads, Revenue ($)"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Timeline (Date)</label>
                    <input 
                      type="date" 
                      value={editingGoal.timeline || ''} 
                      onChange={e => setEditingGoal({...editingGoal, timeline: e.target.value})}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Baseline</label>
                    <input 
                      type="number" 
                      value={editingGoal.baseline || 0} 
                      onChange={e => setEditingGoal({...editingGoal, baseline: Number(e.target.value)})}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Target</label>
                    <input 
                      type="number" 
                      value={editingGoal.target || 0} 
                      onChange={e => setEditingGoal({...editingGoal, target: Number(e.target.value)})}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Current Actuals</label>
                    <input 
                      type="number" 
                      value={editingGoal.current || 0} 
                      onChange={e => setEditingGoal({...editingGoal, current: Number(e.target.value)})}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                 </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select 
                    value={editingGoal.status} 
                    onChange={e => setEditingGoal({...editingGoal, status: e.target.value as GoalStatus})}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                    {Object.values(GoalStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Comments Section */}
              {editingGoal.id && goals.find(g => g.id === editingGoal.id) && (
                <div className="mt-6 border-t border-gray-100 pt-6">
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <MessageSquare size={16} /> Discussion & Feedback
                    </h3>
                    
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4 max-h-60 overflow-y-auto mb-4">
                        {(!editingGoal.comments || editingGoal.comments.length === 0) && (
                            <p className="text-sm text-gray-400 italic">No comments yet. Be the first to ask a question.</p>
                        )}
                        {editingGoal.comments?.map(comment => {
                            const author = users.find(u => u.id === comment.authorId);
                            return (
                                <div key={comment.id} className="flex gap-3">
                                    <img src={author?.avatarUrl || 'https://via.placeholder.com/32'} className="w-8 h-8 rounded-full flex-shrink-0" alt="avatar" />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-sm font-bold text-slate-700">{author?.name || 'Unknown'}</span>
                                            <span className="text-xs text-gray-400">{comment.timestamp}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1 bg-white p-2 rounded-md border border-gray-100 shadow-sm">{comment.text}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="flex gap-2">
                        <input 
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Ask a question or leave feedback..."
                            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 outline-none shadow-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                        />
                        <button 
                            onClick={handleAddComment}
                            disabled={!newComment.trim()}
                            className="bg-slate-800 text-white p-2 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-right">Comments are saved when you click "Save Goal"</p>
                </div>
              )}

            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-lg">Save Goal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};