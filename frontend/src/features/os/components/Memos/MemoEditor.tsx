
import React, { useState, useRef } from 'react';
import { useStore } from '../../../../shared/contexts/StoreContext';
import { Memo, MemoStatus, MemoAttachment } from '../../../../shared/types';
import { AlertTriangle, Save, Wand2, Upload, X, File as FileIcon } from 'lucide-react';
import { critiqueMemo } from '../../../../shared/services/gemini/geminiService';

interface MemoEditorProps {
    onCancel: () => void;
    onSave: () => void;
}

export const MemoEditor: React.FC<MemoEditorProps> = ({ onCancel, onSave }) => {
    const { currentUser, addMemo } = useStore();
    const [critique, setCritique] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [formData, setFormData] = useState<Partial<Memo>>({
        subject: '',
        toId: 'ALL',
        summary: '',
        attachments: []
    });

    const handleCritique = async () => {
        if (!formData.summary) return;
        setIsThinking(true);
        const feedback = await critiqueMemo(formData);
        setCritique(feedback);
        setIsThinking(false);
    };

    const handleSave = () => {
        const newMemo: Memo = {
            id: Math.random().toString(36).substr(2, 9),
            fromId: currentUser.id,
            toId: formData.toId || 'ALL',
            date: new Date().toISOString().split('T')[0],
            subject: formData.subject || 'Untitled Memo',
            status: MemoStatus.PENDING_REVIEW,
            summary: formData.summary || '',
            attachments: formData.attachments || [],
            comments: []
        };
        addMemo(newMemo);
        onSave();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newAttachments: MemoAttachment[] = Array.from(e.target.files).map((file: File) => ({
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                type: file.type
            }));
            setFormData(prev => ({
                ...prev,
                attachments: [...(prev.attachments || []), ...newAttachments]
            }));
        }
    };

    const removeAttachment = (id: string) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments?.filter(a => a.id !== id)
        }));
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-grx-text">New Memo</h1>
                  <p className="text-sm text-gray-500">Subject: {formData.subject || '...'}</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-lg flex items-center gap-2">
                        <Save size={18} /> Save & Notify
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                            <input 
                                type="text" 
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500 px-3 py-2 border"
                                placeholder="Clear, specific subject..."
                                value={formData.subject}
                                onChange={e => setFormData(prev => ({...prev, subject: e.target.value}))}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-grx-text mb-1">Summary & Details</label>
                            <p className="text-xs text-gray-500 mb-2">Include Problem, Solution, ROI, Risks, and the Ask in a concise format.</p>
                            <textarea 
                                rows={12}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm px-3 py-2 border"
                                placeholder="Write your memo here..."
                                value={formData.summary}
                                onChange={e => setFormData(prev => ({...prev, summary: e.target.value}))}
                            />
                        </div>

                        {/* File Upload Section */}
                        <div>
                            <label className="block text-sm font-bold text-grx-text mb-2">Attachments</label>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-brand-500 hover:bg-gray-50 transition-colors"
                            >
                                <Upload className="text-gray-400 mb-2" size={24} />
                                <span className="text-sm text-gray-600">Click to upload documents (PDF, Excel, Word)</span>
                                <input 
                                    type="file" 
                                    multiple 
                                    ref={fileInputRef} 
                                    className="hidden" 
                                    onChange={handleFileUpload}
                                />
                            </div>

                            {formData.attachments && formData.attachments.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {formData.attachments.map(file => (
                                        <div key={file.id} className="flex items-center justify-between bg-grx-bg p-3 rounded-md border border-grx-primary-100">
                                            <div className="flex items-center gap-3">
                                                <FileIcon className="text-brand-600" size={18} />
                                                <div>
                                                    <p className="text-sm font-medium text-grx-text">{file.name}</p>
                                                    <p className="text-xs text-gray-500">{file.size}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => removeAttachment(file.id)} className="text-gray-400 hover:text-red-500">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* AI Critique Panel */}
                    <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl border border-indigo-100 shadow-sm sticky top-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Wand2 className="text-indigo-600" size={20} />
                            <h3 className="font-bold text-indigo-900">AI Editor</h3>
                        </div>
                        <p className="text-sm text-indigo-700 mb-4">
                            Get a brutal critique on brevity and clarity before sending.
                        </p>
                        <button 
                            onClick={handleCritique}
                            disabled={isThinking || !formData.summary}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium"
                        >
                            {isThinking ? 'Analyzing...' : 'Critique Memo'}
                        </button>

                        {critique && (
                            <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-200 text-sm text-gray-700 animate-in fade-in slide-in-from-bottom-2">
                                <div className="font-bold text-indigo-900 mb-2 border-b border-indigo-100 pb-2">Feedback:</div>
                                <div className="whitespace-pre-wrap">{critique}</div>
                            </div>
                        )}
                    </div>

                    <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-100">
                         <div className="flex items-center gap-2 mb-2 text-yellow-800 font-bold">
                            <AlertTriangle size={16} />
                            <span>GRX10 Style Guide</span>
                         </div>
                         <ul className="list-disc list-inside text-xs text-yellow-800 space-y-1">
                            <li>No fluff. Be direct.</li>
                            <li>Attach supporting data files.</li>
                            <li>Quantify every claim.</li>
                            <li>If there is no ROI, don't write it.</li>
                         </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
