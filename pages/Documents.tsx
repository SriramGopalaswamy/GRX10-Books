import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, ScanLine, Trash2, CheckCircle, AlertCircle, Loader2, FileImage, Download, Info } from 'lucide-react';
import { DocumentItem } from '../types';
import { GeminiService } from '../services/geminiService';

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const geminiRef = useRef<GeminiService | null>(null);

  useEffect(() => {
    if (!geminiRef.current) {
      geminiRef.current = new GeminiService();
    }
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await handleFiles(Array.from(e.target.files));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data url prefix (e.g. "data:image/png;base64," or "data:application/pdf;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFiles = async (files: File[]) => {
    const newDocs: DocumentItem[] = await Promise.all(files.map(async (file) => {
      const base64 = await fileToBase64(file);
      return {
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadDate: new Date().toISOString().split('T')[0],
        base64: base64, // Store base64 for demo OCR
        ocrStatus: 'idle'
      };
    }));
    setDocuments(prev => [...newDocs, ...prev]);
  };

  const runOCR = async (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc || !doc.base64) return;

    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, ocrStatus: 'processing' } : d));

    try {
      const extractedData = await geminiRef.current!.parseDocument(doc.base64, doc.type);
      
      setDocuments(prev => prev.map(d => d.id === docId ? { 
        ...d, 
        ocrStatus: 'completed',
        extractedData: extractedData
      } : d));
    } catch (error) {
      console.error("OCR error", error);
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, ocrStatus: 'failed' } : d));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null) return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Documents & Attachments</h2>
          <p className="text-slate-500">Manage receipts, bills, and enable Auto-OCR for PDF & Images</p>
        </div>
        <div className="flex gap-3">
             <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100 flex items-center gap-1">
                <ScanLine size={14} />
                Auto-OCR Enabled
             </span>
        </div>
      </div>

      {/* Upload Area */}
      <div 
        className={`p-8 border-2 border-dashed rounded-xl transition-colors text-center cursor-pointer
          ${dragActive ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('doc-upload')?.click()}
      >
        <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-3 text-emerald-600">
            <Upload size={24} />
        </div>
        <p className="font-medium text-slate-700">Click to upload or drag and drop</p>
        <p className="text-sm text-slate-500 mt-1">Supported: JPEG, PNG, PDF</p>
        <input id="doc-upload" type="file" className="hidden" multiple onChange={handleFileInput} accept="image/jpeg,image/png,image/webp,application/pdf" />
      </div>

      {/* Documents List */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 font-semibold text-slate-700 bg-slate-50/50 flex justify-between items-center">
           <span>Recent Uploads ({documents.length})</span>
           {documents.length > 0 && (
             <button 
               onClick={() => setDocuments([])} 
               className="text-xs text-red-500 hover:text-red-600 font-medium"
             >
               Clear All
             </button>
           )}
        </div>
        
        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {documents.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400 pb-10">
                <FileText size={48} className="mb-3 opacity-50"/>
                <p>No documents uploaded yet.</p>
             </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="border border-slate-200 rounded-lg p-4 flex gap-4 items-start hover:shadow-sm transition-shadow bg-white">
                 <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 text-slate-500">
                    {doc.type === 'application/pdf' ? <FileText size={24} /> : <FileImage size={24} />}
                 </div>
                 
                 <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                       <div>
                          <h4 className="font-medium text-slate-800 truncate pr-4" title={doc.name}>{doc.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatBytes(doc.size)} • Uploaded {doc.uploadDate}
                          </p>
                       </div>
                       <button 
                          onClick={() => setDocuments(prev => prev.filter(d => d.id !== doc.id))}
                          className="text-slate-400 hover:text-red-500"
                       >
                          <Trash2 size={16} />
                       </button>
                    </div>

                    {/* OCR Section */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                       {doc.ocrStatus === 'idle' && (
                          <div className="flex items-center justify-between">
                             <span className="text-xs text-slate-500">Analysis pending</span>
                             <button 
                               onClick={() => runOCR(doc.id)}
                               className="flex items-center gap-2 text-xs font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors"
                             >
                                <ScanLine size={14} /> Run Auto-OCR
                             </button>
                          </div>
                       )}

                       {doc.ocrStatus === 'processing' && (
                          <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium">
                             <Loader2 size={14} className="animate-spin" />
                             Extracting financial data with Gemini...
                          </div>
                       )}

                       {doc.ocrStatus === 'completed' && doc.extractedData && (
                          <div className="bg-emerald-50/50 rounded-md p-3 border border-emerald-100">
                             <div className="flex items-center gap-2 mb-2 text-emerald-700 font-medium text-xs">
                                <CheckCircle size={14} />
                                Data Extracted
                             </div>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div>
                                   <span className="block text-slate-400 mb-1">Vendor</span>
                                   <span className="font-semibold text-slate-700">{doc.extractedData.vendor_name || 'N/A'}</span>
                                </div>
                                <div>
                                   <span className="block text-slate-400 mb-1">Date</span>
                                   <span className="font-semibold text-slate-700">{doc.extractedData.invoice_date || 'N/A'}</span>
                                </div>
                                <div>
                                   <span className="block text-slate-400 mb-1">Total Amount</span>
                                   <span className="font-semibold text-slate-700">{formatCurrency(doc.extractedData.total_amount)}</span>
                                </div>
                                <div>
                                   <span className="block text-slate-400 mb-1">GST</span>
                                   <span className="font-semibold text-slate-700">{formatCurrency(doc.extractedData.gst_amount)}</span>
                                </div>
                             </div>
                             
                             {doc.extractedData.summary && (
                               <div className="mt-3 text-xs bg-white p-2 rounded border border-emerald-100/50">
                                  <span className="block text-slate-400 mb-1">Content Summary</span>
                                  <span className="text-slate-700">{doc.extractedData.summary}</span>
                               </div>
                             )}

                             <div className="mt-2 pt-2 border-t border-emerald-100 flex justify-end">
                                <button className="text-xs text-indigo-600 font-medium hover:underline">Create Bill from Data</button>
                             </div>
                          </div>
                       )}

                       {doc.ocrStatus === 'failed' && (
                          <div className="flex items-center gap-2 text-xs text-red-600 font-medium">
                             <AlertCircle size={14} />
                             Failed to extract data. Please try again.
                          </div>
                       )}
                    </div>
                 </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Documents;