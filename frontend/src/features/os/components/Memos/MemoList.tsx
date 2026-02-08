import React, { useState } from 'react';
import { useStore } from '../../../../shared/contexts/StoreContext';
import { MemoStatus, Memo } from '../../../../shared/types';
import { FilePlus, Search, User as UserIcon } from 'lucide-react';
import { MemoEditor } from './MemoEditor';
import { MemoView } from './MemoView';

export const MemoList: React.FC = () => {
  const { memos, users, currentUser } = useStore();
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'view'>('list');
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);

  const handleOpenMemo = (memo: Memo) => {
    setSelectedMemo(memo);
    setViewMode('view');
  };

  const getAuthorName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';
  const getStatusColor = (status: MemoStatus) => {
      switch(status) {
          case MemoStatus.APPROVED: return 'text-green-600 bg-green-50';
          case MemoStatus.REVISION_REQUESTED: return 'text-red-600 bg-red-50';
          case MemoStatus.DRAFT: return 'text-grx-muted bg-grx-bg';
          default: return 'text-yellow-600 bg-yellow-50';
      }
  }

  if (viewMode === 'create') {
    return <MemoEditor onCancel={() => setViewMode('list')} onSave={() => setViewMode('list')} />;
  }

  if (viewMode === 'view' && selectedMemo) {
    return <MemoView memo={selectedMemo} onBack={() => setViewMode('list')} />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-grx-text dark:text-white">Internal Memos</h1>
          <p className="text-grx-muted dark:text-grx-muted">Structured decision making documents.</p>
        </div>
        <button 
          onClick={() => setViewMode('create')}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
        >
          <FilePlus size={18} />
          Write Memo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {memos.map(memo => (
            <div 
                key={memo.id} 
                onClick={() => handleOpenMemo(memo)}
                className="grx-glass-card p-5 rounded-xl border border-grx-primary-100 dark:border-grx-primary-800 hover:border-brand-400 dark:hover:border-brand-500 hover:shadow-md transition-all cursor-pointer group"
            >
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-grx-text dark:text-white group-hover:text-brand-700 dark:group-hover:text-brand-500">{memo.subject}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-grx-muted dark:text-grx-muted">
                            <span className="flex items-center gap-1"><UserIcon size={14}/> {getAuthorName(memo.fromId)}</span>
                            <span>•</span>
                            <span>{memo.date}</span>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(memo.status)}`}>
                        {memo.status}
                    </span>
                </div>
                <p className="mt-3 text-grx-muted dark:text-grx-primary-200 text-sm line-clamp-2">
                    {memo.summary || 'No summary available'}
                </p>
            </div>
        ))}
      </div>
    </div>
  );
};