
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
            <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-brand-600 mb-4 transition-colors">
                <ArrowLeft size={16} /> Back to List
            </button>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="bg-slate-50 border-b border-gray-200 p-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-4">{memo.subject}</h1>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                                <div className="text-gray-500">From: <span className="font-medium text-slate-900">{author?.name}</span></div>
                                <div className="text-gray-500">Date: <span className="font-medium text-slate-900">{memo.date}</span></div>
                                <div className="text-gray-500">To: <span className="font-medium text-slate-900">Leadership Team</span></div>
                                <div className="text-gray-500">Status: <span className="font-bold text-slate-900">{memo.status}</span></div>
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
                                className="px-3 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg flex items-center gap-2 justify-center text-sm shadow-sm"
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
                    <div className="prose max-w-none text-slate-800 whitespace-pre-wrap leading-relaxed mb-8">
                        {memo.summary}
                    </div>

                    {/* Attachments Section */}
                    {memo.attachments && memo.attachments.length > 0 && (
                        <div className="border-t border-gray-100 pt-6">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <FileText size={16} /> Attachments ({memo.attachments.length})
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {memo.attachments.map(file => (
                                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-brand-300 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center border border-gray-200 text-brand-600">
                                                <FileText size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                                                <p className="text-xs text-gray-500">{file.size}</p>
                                            </div>
                                        </div>
                                        <button className="text-gray-400 hover:text-brand-600 p-2">
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
