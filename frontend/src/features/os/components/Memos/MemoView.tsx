
import React, { useState } from 'react';
import { Memo, MemoStatus } from '../../../../shared/types';
import { useStore } from '../../../../shared/contexts/StoreContext';
import { ArrowLeft, CheckCircle, XCircle, FileText, Download, Mail, Share2 } from 'lucide-react';

interface MemoViewProps {
    memo: Memo;
    onBack: () => void;
}

export const MemoView: React.FC<MemoViewProps> = ({ memo, onBack }) => {
    const { users, currentUser, updateMemo } = useStore();
    const [isEmailing, setIsEmailing] = useState(false);
    const author = users.find(u => u.id === memo.fromId);

    const handleStatusChange = (status: MemoStatus) => {
        updateMemo({ ...memo, status });
        onBack();
    };

    const handleConvertToPdfAndEmail = () => {
        setIsEmailing(true);
        // Simulate API latency
        setTimeout(() => {
            setIsEmailing(false);
            alert(`Success! Memo "${memo.subject}" and ${memo.attachments.length} attachments have been converted to a combined PDF and emailed to the Leadership Team.`);
        }, 1500);
    };

    const isManager = currentUser.role === 'Manager' || currentUser.role === 'Admin';

    return (
        <div className="max-w-4xl mx-auto">
            <button onClick={onBack} className="flex items-center gap-2 text-grx-muted hover:text-brand-600 mb-4 transition-colors">
                <ArrowLeft size={16} /> Back to List
            </button>

            <div className="grx-glass-card rounded-xl shadow-lg border border-grx-primary-100 dark:border-grx-primary-800 overflow-hidden">
                {/* Header */}
                <div className="bg-grx-bg border-b border-grx-primary-100 p-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-grx-text dark:text-white mb-4">{memo.subject}</h1>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                <div className="text-grx-muted dark:text-grx-muted">From: <span className="font-medium text-grx-text dark:text-white">{author?.name}</span></div>
                                <div className="text-grx-muted dark:text-grx-muted">Date: <span className="font-medium text-grx-text dark:text-white">{memo.date}</span></div>
                                <div className="text-grx-muted dark:text-grx-muted">To: <span className="font-medium text-grx-text dark:text-white">Leadership Team</span></div>
                                <div className="text-grx-muted dark:text-grx-muted">Status: <span className="font-bold text-grx-text dark:text-white">{memo.status}</span></div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {isManager && memo.status === MemoStatus.PENDING_REVIEW && (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleStatusChange(MemoStatus.REVISION_REQUESTED)}
                                        className="px-3 py-2 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-2 text-sm"
                                    >
                                        <XCircle size={16} /> Request Changes
                                    </button>
                                    <button 
                                        onClick={() => handleStatusChange(MemoStatus.APPROVED)}
                                        className="px-3 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-lg flex items-center gap-2 text-sm"
                                    >
                                        <CheckCircle size={16} /> Approve
                                    </button>
                                </div>
                            )}
                            <button 
                                onClick={handleConvertToPdfAndEmail}
                                disabled={isEmailing}
                                className="px-3 py-2 bg-grx-dark-surface text-white hover:bg-grx-dark rounded-lg flex items-center gap-2 justify-center text-sm shadow-sm"
                            >
                                {isEmailing ? (
                                    <>
                                        <span className="animate-spin">⏳</span> Sending...
                                    </>
                                ) : (
                                    <>
                                        <Mail size={16} /> Email as PDF
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="prose max-w-none text-grx-text dark:text-grx-primary-200 whitespace-pre-wrap leading-relaxed mb-8">
                        {memo.summary}
                    </div>

                    {/* Attachments Section */}
                    {memo.attachments && memo.attachments.length > 0 && (
                        <div className="border-t border-grx-primary-50 pt-6">
                            <h3 className="text-sm font-bold text-grx-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                                <FileText size={16} /> Attachments ({memo.attachments.length})
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {memo.attachments.map(file => (
                                    <div key={file.id} className="flex items-center justify-between p-3 bg-grx-bg rounded-lg border border-grx-primary-100 hover:border-brand-300 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-10 h-10 bg-white dark:bg-grx-dark-surface rounded-md flex items-center justify-center border border-grx-primary-100 dark:border-grx-primary-800 text-brand-600 dark:text-brand-500">
                                                <FileText size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-grx-text truncate">{file.name}</p>
                                                <p className="text-xs text-grx-muted">{file.size}</p>
                                            </div>
                                        </div>
                                        <button className="text-grx-muted hover:text-brand-600 p-2">
                                            <Download size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
