
import React, { useState, useRef, useEffect } from 'react';
import { generateHRResponse } from '../../../shared/services/gemini/geminiService';
import { COMPANY_POLICIES } from '../../../shared/constants/app.constants';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useRegularization } from '../../../shared/contexts/RegularizationContext';
import { Send, Bot, User, FileText, Download, CheckCircle, XCircle, Clock, UserPlus, UserMinus } from 'lucide-react';
import { RegularizationRequest, RegularizationType, LeaveStatus } from '../../../shared/types';
import { OnboardingModal } from '../components/OnboardingModal';
import { OffboardingModal } from '../components/OffboardingModal';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  payslip?: { month: string; year: string; netPay: number };
  showRegularizationForm?: boolean;
  regularizationList?: RegularizationRequest[];
  isApprovalList?: boolean;
  showOnboardingForm?: boolean;
  showOffboardingForm?: boolean;
}

export const PolicyChat: React.FC = () => {
  const { user } = useAuth();
  const { requests, addRequest, updateRequestStatus } = useRegularization();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your GRX10 HR Assistant. Ask me about policies, payslips, or attendance regularization.",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showOffboardingModal, setShowOffboardingModal] = useState(false);

  // Regularization Form State
  const [regForm, setRegForm] = useState({
    date: '',
    type: RegularizationType.MISSING_PUNCH,
    reason: ''
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleDownload = (payslip: { month: string; year: string; netPay: number }) => {
    const htmlContent = `
      <html>
        <head>
          <title>Payslip - ${payslip.month} ${payslip.year}</title>
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; background: #fff; }
            .header { border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .company { font-size: 28px; font-weight: bold; color: #4f46e5; }
            .title { font-size: 18px; color: #666; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .box { background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
            .box strong { display: block; margin-bottom: 10px; color: #111; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
            td { padding: 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
            .amount { text-align: right; font-family: monospace; font-size: 15px; }
            .deduction { color: #dc2626; }
            .total-row td { border-top: 2px solid #374151; font-weight: bold; font-size: 18px; color: #111; padding-top: 15px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company">GRX10 Systems</div>
            <div class="title">Payslip for ${payslip.month} ${payslip.year}</div>
          </div>
          
          <div class="grid">
            <div class="box">
              <strong>Employee Details</strong>
              Name: ${user?.name}<br/>
              ID: ${user?.id}<br/>
              Dept: ${user?.department}<br/>
              Designation: ${user?.designation}
            </div>
            <div class="box">
              <strong>Payment Details</strong>
              Bank: HDFC Bank<br/>
              Acct: XXXXXX1234<br/>
              Date: 30 ${payslip.month} ${payslip.year}<br/>
              Days Payable: 30
            </div>
          </div>

          <table>
            <tr><th>Description</th><th style="text-align:right">Amount (USD)</th></tr>
            <tr><td>Basic Salary</td><td class="amount">50,000.00</td></tr>
            <tr><td>House Rent Allowance (HRA)</td><td class="amount">20,000.00</td></tr>
            <tr><td>Special Allowances</td><td class="amount">15,000.00</td></tr>
            <tr><td><i>Less: Income Tax</i></td><td class="amount deduction">-2,500.00</td></tr>
            <tr><td><i>Less: Provident Fund</i></td><td class="amount deduction">-1,800.00</td></tr>
            <tr class="total-row">
              <td>NET PAYABLE</td>
              <td class="amount">$${payslip.netPay.toLocaleString()}.00</td>
            </tr>
          </table>
          
          <div class="footer">
            This is a computer-generated document. No signature is required.<br/>
            GRX10 Systems Pvt Ltd. | 123 Tech Park, Silicon Valley
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payslip_${payslip.month}_${payslip.year}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const processMessage = async (text: string) => {
    if (!user) return;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      // Pass current requests context to AI
      const aiResponse = await generateHRResponse(text, COMPANY_POLICIES, user, requests);

      if (aiResponse.regularizationUpdate) {
        updateRequestStatus(aiResponse.regularizationUpdate.id, aiResponse.regularizationUpdate.status);
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse.text,
        sender: 'ai',
        timestamp: new Date(),
        payslip: aiResponse.payslip,
        showRegularizationForm: aiResponse.showRegularizationForm,
        regularizationList: aiResponse.regularizationList,
        isApprovalList: aiResponse.isApprovalList,
        showOnboardingForm: aiResponse.showOnboardingForm,
        showOffboardingForm: aiResponse.showOffboardingForm
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: Message = {
         id: (Date.now() + 1).toString(),
         text: "Sorry, something went wrong. Please try again.",
         sender: 'ai',
         timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    processMessage(input);
    setInput('');
  };

  const submitRegularizationForm = () => {
    if (!regForm.date || !regForm.reason || !user) return;
    
    // Add to context immediately for better UX, then tell AI
    const newReq: RegularizationRequest = {
      id: `REG${Date.now()}`,
      employeeId: user.id,
      employeeName: user.name,
      date: regForm.date,
      type: regForm.type,
      reason: regForm.reason,
      status: LeaveStatus.PENDING,
      appliedOn: new Date().toISOString().split('T')[0],
      newCheckIn: regForm.type === RegularizationType.MISSING_PUNCH ? '09:00' : undefined,
      newCheckOut: regForm.type === RegularizationType.MISSING_PUNCH ? '18:00' : undefined,
    };
    addRequest(newReq);

    const command = `I have submitted a regularization request for ${regForm.date}. Type: ${regForm.type}. Reason: ${regForm.reason}`;
    processMessage(command);
    setRegForm({ date: '', type: RegularizationType.MISSING_PUNCH, reason: '' });
  };

  const handleApprovalDecision = (requestId: string, decision: 'Approved' | 'Rejected') => {
    // Send command to AI to trigger the tool execution which returns the update instruction
    processMessage(`${decision} request ${requestId}`);
  };

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-indigo-50 flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">HR Assistant (Powered by Gemini)</h3>
            <p className="text-xs text-slate-500">Instant answers & actions</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[90%] md:max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.sender === 'user' ? 'bg-slate-200' : 'bg-indigo-100 text-indigo-600'
                }`}>
                  {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className="flex flex-col gap-2">
                  <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-slate-100 text-slate-800 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  
                  {/* Action Bubbles */}
                  {msg.payslip && (
                    <div className="max-w-xs bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mt-1">
                      <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                            <FileText size={16} />
                          </div>
                          <span className="text-sm font-medium text-slate-700">Payslip Ready</span>
                        </div>
                      </div>
                      <div className="p-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs text-slate-500">Net Pay</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">${msg.payslip.netPay.toLocaleString()}</p>
                        </div>
                        <button 
                          onClick={() => msg.payslip && handleDownload(msg.payslip)}
                          className="flex items-center gap-2 bg-indigo-600 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          <Download size={14} />
                          PDF
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.showOnboardingForm && (
                    <button 
                      onClick={() => setShowOnboardingModal(true)}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 shadow-sm transition-all text-sm font-medium self-start w-fit mt-1"
                    >
                      <UserPlus size={18} />
                      Open Onboarding Wizard
                    </button>
                  )}

                  {msg.showOffboardingForm && (
                    <button 
                      onClick={() => setShowOffboardingModal(true)}
                      className="flex items-center gap-2 bg-rose-600 text-white px-4 py-3 rounded-xl hover:bg-rose-700 shadow-sm transition-all text-sm font-medium self-start w-fit mt-1"
                    >
                      <UserMinus size={18} />
                      Open Offboarding Form
                    </button>
                  )}

                  {msg.showRegularizationForm && (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 shadow-sm mt-1 w-full min-w-[280px]">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">New Regularization Request</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                          <input 
                            type="date" 
                            className="w-full border border-slate-300 rounded-md p-2 text-sm"
                            value={regForm.date}
                            onChange={e => setRegForm({...regForm, date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                          <select 
                            className="w-full border border-slate-300 rounded-md p-2 text-sm"
                            value={regForm.type}
                            onChange={e => setRegForm({...regForm, type: e.target.value as RegularizationType})}
                          >
                            {Object.values(RegularizationType).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Reason</label>
                          <textarea 
                            className="w-full border border-slate-300 rounded-md p-2 text-sm h-16 resize-none"
                            placeholder="Brief reason..."
                            value={regForm.reason}
                            onChange={e => setRegForm({...regForm, reason: e.target.value})}
                          />
                        </div>
                        <button 
                          onClick={submitRegularizationForm}
                          disabled={!regForm.date || !regForm.reason}
                          className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          Submit Request
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.regularizationList && msg.regularizationList.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-sm mt-1 overflow-hidden w-full">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-4 py-2 font-medium">Date</th>
                              <th className="px-4 py-2 font-medium">Type</th>
                              {msg.isApprovalList && <th className="px-4 py-2 font-medium">Employee</th>}
                              <th className="px-4 py-2 font-medium">Status</th>
                              {msg.isApprovalList && <th className="px-4 py-2 font-medium text-right">Actions</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {msg.regularizationList.map(req => (
                              <tr key={req.id}>
                                <td className="px-4 py-3 text-slate-900 dark:text-slate-100 whitespace-nowrap">{req.date}</td>
                                <td className="px-4 py-3 text-slate-600">
                                  <span className="text-xs bg-slate-100 px-2 py-1 rounded">{req.type}</span>
                                </td>
                                {msg.isApprovalList && (
                                  <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{req.employeeName}</td>
                                )}
                                <td className="px-4 py-3">
                                  <span className={`flex items-center gap-1 text-xs font-medium ${
                                    req.status === LeaveStatus.APPROVED ? 'text-emerald-600' :
                                    req.status === LeaveStatus.REJECTED ? 'text-rose-600' : 'text-amber-600'
                                  }`}>
                                    {req.status === LeaveStatus.APPROVED ? <CheckCircle size={12}/> :
                                     req.status === LeaveStatus.REJECTED ? <XCircle size={12}/> : <Clock size={12}/>}
                                    {req.status}
                                  </span>
                                </td>
                                {msg.isApprovalList && req.status === LeaveStatus.PENDING && (
                                  <td className="px-4 py-3 text-right whitespace-nowrap">
                                    <div className="flex justify-end gap-2">
                                      <button 
                                        onClick={() => handleApprovalDecision(req.id, 'Approved')}
                                        className="p-1 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200"
                                      >
                                        <CheckCircle size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleApprovalDecision(req.id, 'Rejected')}
                                        className="p-1 bg-rose-100 text-rose-600 rounded hover:bg-rose-200"
                                      >
                                        <XCircle size={16} />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-slate-100 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message HR Assistant... (e.g. 'Offboard employee')"
            className="flex-1 border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isTyping}
            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Send size={20} />
          </button>
        </form>
      </div>

      {/* Onboarding Modal triggered from Chat */}
      <OnboardingModal 
        isOpen={showOnboardingModal} 
        onClose={() => setShowOnboardingModal(false)} 
      />
      
      {/* Offboarding Modal triggered from Chat */}
      <OffboardingModal
        isOpen={showOffboardingModal}
        onClose={() => setShowOffboardingModal(false)}
      />
    </>
  );
};
