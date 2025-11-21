
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, ScanLine, Trash2, CheckCircle, AlertCircle, Loader2, 
  FileImage, Info, LayoutTemplate, PenTool, BookOpen, Send, 
  MoreHorizontal, Check, Clock, Eye
} from 'lucide-react';
import { DocumentItem, Agreement, InvoiceTemplate } from '../types';
import { GeminiService } from '../services/geminiService';

type Tab = 'uploads' | 'templates' | 'agreements' | 'msa';

const MOCK_TEMPLATES: InvoiceTemplate[] = [
  { id: 't1', name: 'Professional GST Standard', thumbnailColor: 'bg-slate-200', tags: ['Professional', 'GST Compliant'] },
  { id: 't2', name: 'Creative Digital', thumbnailColor: 'bg-indigo-100', tags: ['Modern', 'Freelancer'] },
  { id: 't3', name: 'Corporate Blue', thumbnailColor: 'bg-blue-100', tags: ['Corporate', 'Clean'] },
  { id: 't4', name: 'Minimalist Mono', thumbnailColor: 'bg-gray-100', tags: ['Simple', 'B&W'] },
];

const MOCK_AGREEMENTS: Agreement[] = [
  { id: 'a1', customerName: 'TechFlow India Pvt Ltd', type: 'MSA', sentDate: '2024-05-10', status: 'Signed', lastActivity: 'Signed on 12 May' },
  { id: 'a2', customerName: 'Reddy Enterprises', type: 'Service Contract', sentDate: '2024-05-14', status: 'Viewed', lastActivity: 'Viewed 2 hours ago' },
  { id: 'a3', customerName: 'Global Exports Ltd', type: 'NDA', sentDate: '2024-05-15', status: 'Sent', lastActivity: 'Sent yesterday' },
];

const Documents: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('uploads');
  
  // --- OCR Logic ---
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
        base64: base64,
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

  // --- Render Functions ---

  const renderUploads = () => (
    <div className="space-y-6 animate-fade-in">
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

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 font-semibold text-slate-700 bg-slate-50/50 flex justify-between items-center">
           <span>Recent Uploads ({documents.length})</span>
           {documents.length > 0 && (
             <button onClick={() => setDocuments([])} className="text-xs text-red-500 hover:text-red-600 font-medium">Clear All</button>
           )}
        </div>
        
        <div className="overflow-y-auto p-4 space-y-3 max-h-[500px]">
          {documents.length === 0 ? (
             <div className="py-12 flex flex-col items-center justify-center text-slate-400">
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
                          <p className="text-xs text-slate-500 mt-0.5">{formatBytes(doc.size)} • Uploaded {doc.uploadDate}</p>
                       </div>
                       <button onClick={() => setDocuments(prev => prev.filter(d => d.id !== doc.id))} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100">
                       {doc.ocrStatus === 'idle' && (
                          <div className="flex items-center justify-between">
                             <span className="text-xs text-slate-500">Analysis pending</span>
                             <button onClick={() => runOCR(doc.id)} className="flex items-center gap-2 text-xs font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors">
                                <ScanLine size={14} /> Run Auto-OCR
                             </button>
                          </div>
                       )}

                       {doc.ocrStatus === 'processing' && (
                          <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium">
                             <Loader2 size={14} className="animate-spin" /> Extracting financial data with Gemini...
                          </div>
                       )}

                       {doc.ocrStatus === 'completed' && doc.extractedData && (
                          <div className="bg-emerald-50/50 rounded-md p-3 border border-emerald-100">
                             <div className="flex items-center gap-2 mb-2 text-emerald-700 font-medium text-xs">
                                <CheckCircle size={14} /> Data Extracted
                             </div>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div><span className="block text-slate-400 mb-1">Vendor</span><span className="font-semibold text-slate-700">{doc.extractedData.vendor_name || 'N/A'}</span></div>
                                <div><span className="block text-slate-400 mb-1">Date</span><span className="font-semibold text-slate-700">{doc.extractedData.invoice_date || 'N/A'}</span></div>
                                <div><span className="block text-slate-400 mb-1">Total</span><span className="font-semibold text-slate-700">{formatCurrency(doc.extractedData.total_amount)}</span></div>
                                <div><span className="block text-slate-400 mb-1">GST</span><span className="font-semibold text-slate-700">{formatCurrency(doc.extractedData.gst_amount)}</span></div>
                             </div>
                             {doc.extractedData.summary && (
                               <div className="mt-3 text-xs bg-white p-3 rounded border border-emerald-100/50 shadow-sm">
                                  <div className="flex items-center gap-1.5 mb-1 text-slate-500 font-medium"><Info size={14} className="text-emerald-600"/><span>Document Summary</span></div>
                                  <p className="text-slate-700 leading-relaxed pl-5 border-l-2 border-emerald-200">{doc.extractedData.summary}</p>
                               </div>
                             )}
                          </div>
                       )}
                       {doc.ocrStatus === 'failed' && <div className="flex items-center gap-2 text-xs text-red-600 font-medium"><AlertCircle size={14} /> Failed to extract data.</div>}
                    </div>
                 </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderTemplates = () => (
    <div className="space-y-6 animate-fade-in">
      <p className="text-sm text-slate-600">Select a pre-made, GST-compliant template for your next invoice.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {MOCK_TEMPLATES.map(template => (
          <div key={template.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-md transition-shadow cursor-pointer">
             <div className={`h-48 ${template.thumbnailColor} w-full flex items-center justify-center relative`}>
                <LayoutTemplate className="text-slate-400 opacity-50" size={48} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                   <button className="bg-white text-slate-800 px-4 py-2 rounded-full text-sm font-medium shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">Use Template</button>
                </div>
             </div>
             <div className="p-4">
                <h3 className="font-semibold text-slate-800">{template.name}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {template.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] rounded-full uppercase tracking-wide font-medium">{tag}</span>
                  ))}
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAgreements = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
         <p className="text-sm text-slate-600">Manage e-signatures and contracts sent to customers.</p>
         <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 transition-colors">
           <Send size={16} /> Send New Agreement
         </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
            <tr>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Agreement Type</th>
              <th className="px-6 py-4">Sent Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Activity</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MOCK_AGREEMENTS.map((agreement) => (
              <tr key={agreement.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">{agreement.customerName}</td>
                <td className="px-6 py-4 text-slate-600">{agreement.type}</td>
                <td className="px-6 py-4 text-slate-500">{agreement.sentDate}</td>
                <td className="px-6 py-4">
                   <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 w-fit
                     ${agreement.status === 'Signed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                       agreement.status === 'Viewed' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                       'bg-slate-100 text-slate-600 border-slate-200'}`}>
                     {agreement.status === 'Signed' && <Check size={12}/>}
                     {agreement.status === 'Viewed' && <Eye size={12}/>}
                     {agreement.status === 'Sent' && <Clock size={12}/>}
                     {agreement.status}
                   </span>
                </td>
                <td className="px-6 py-4 text-slate-500 text-xs">{agreement.lastActivity}</td>
                <td className="px-6 py-4">
                   <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMSA = () => (
    <div className="animate-fade-in bg-white rounded-xl shadow-sm border border-slate-200 p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-8 pb-8 border-b border-slate-100">
         <div>
           <h1 className="text-2xl font-bold text-slate-900">Master Services Agreement</h1>
           <p className="text-slate-500 text-sm mt-1">Reference Version 1.4 • Updated Jan 2024</p>
         </div>
         <button className="text-indigo-600 text-sm font-medium border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-50">
            Download PDF
         </button>
      </div>
      
      <div className="prose prose-slate prose-sm max-w-none text-justify text-slate-700 space-y-4">
        <p><strong>1. PARTIES.</strong> This Master Services Agreement (hereinafter referred to as "Agreement") is entered into by and between GRX10 Solutions Pvt Ltd (the "Service Provider") and the Client (the "Customer").</p>
        
        <p><strong>2. SERVICES.</strong> Service Provider agrees to perform for Customer the services listed in the applicable Statement of Work (SOW). All Services shall be performed in a professional manner.</p>
        
        <p><strong>3. PAYMENT TERMS.</strong> Invoices will be issued upon completion of milestones. Payment shall be made within 30 days of invoice date. Late payments shall accrue interest at the rate of 1.5% per month.</p>
        
        <p><strong>4. CONFIDENTIALITY.</strong> Each party acknowledges that it will have access to certain confidential information of the other party concerning the other party's business, plans, customers, technology, and products.</p>
        
        <p><strong>5. INTELLECTUAL PROPERTY.</strong> All deliverables created by Service Provider under this Agreement shall be the property of the Customer upon full payment of all fees.</p>
        
        <p className="text-slate-400 italic pt-4">[... This is a truncated view of the standard agreement for reference purposes ...]</p>
      </div>
      
      <div className="mt-12 p-6 bg-slate-50 rounded-lg border border-slate-200">
         <h4 className="font-semibold text-slate-800 text-sm mb-2">Usage Note</h4>
         <p className="text-xs text-slate-500">This is your standard organizational MSA. To send this to a customer for signature, please go to the "Agreements & E-Sign" tab.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Document Hub</h2>
          <p className="text-slate-500">Central repository for receipts, templates, and legal agreements.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
         <button 
           onClick={() => setActiveTab('uploads')} 
           className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'uploads' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
         >
           <Upload size={16}/> Uploads & OCR
         </button>
         <button 
           onClick={() => setActiveTab('templates')} 
           className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'templates' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
         >
           <LayoutTemplate size={16}/> Invoice Templates
         </button>
         <button 
           onClick={() => setActiveTab('agreements')} 
           className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'agreements' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
         >
           <PenTool size={16}/> Agreements & E-Sign
         </button>
         <button 
           onClick={() => setActiveTab('msa')} 
           className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'msa' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
         >
           <BookOpen size={16}/> MSA Reference
         </button>
      </div>

      {/* Content Area */}
      <div className="flex-1">
         {activeTab === 'uploads' && renderUploads()}
         {activeTab === 'templates' && renderTemplates()}
         {activeTab === 'agreements' && renderAgreements()}
         {activeTab === 'msa' && renderMSA()}
      </div>
    </div>
  );
};

export default Documents;
