
import React, { useState } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MOCK_EMPLOYEES } from '../../../shared/constants/app.constants';
import { Lock, Mail, ArrowRight, CheckCircle, X } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, resetPassword, activateAccount } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'forgot' | 'activate'>('login');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Demo Dropdown State
  const [selectedDemoEmail, setSelectedDemoEmail] = useState(MOCK_EMPLOYEES[2].email);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Demo login bypasses password check in our mock context logic for convenience
      // by passing undefined password to a user that expects one, BUT we can just look up the mock password
      const mockUser = MOCK_EMPLOYEES.find(u => u.email === selectedDemoEmail);
      await login(selectedDemoEmail, mockUser?.password); 
      navigate('/dashboard');
    } catch (error) {
      alert("Demo Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await resetPassword(email);
      setSuccessMsg(`Reset link sent to ${email}`);
      setTimeout(() => { setView('login'); setSuccessMsg(''); }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await activateAccount(email, password);
      setSuccessMsg("Account activated successfully! Logging you in...");
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || "Activation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-grx-primary-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-grx-primary-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg shadow-grx-primary-200">
              G
            </div>
            <h1 className="text-2xl font-bold text-grx-text">GRX10 HRMS</h1>
            <p className="text-grx-muted mt-2">
              {view === 'login' && 'Sign in to your employee portal'}
              {view === 'forgot' && 'Reset your password'}
              {view === 'activate' && 'Activate your new account'}
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-rose-50 text-rose-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-rose-100">
              <X size={16} /> {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-emerald-100">
              <CheckCircle size={16} /> {successMsg}
            </div>
          )}

          {view === 'login' && (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-grx-text mb-1">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-grx-muted" size={18} />
                    <input 
                      type="email" 
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-grx-primary-100 focus:ring-2 focus:ring-grx-primary focus:border-grx-primary-500 outline-none"
                      placeholder="name@grx10.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-grx-text mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-grx-muted" size={18} />
                    <input 
                      type="password" 
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-grx-primary-100 focus:ring-2 focus:ring-grx-primary focus:border-grx-primary-500 outline-none"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button type="button" onClick={() => setView('forgot')} className="text-sm text-grx-primary-600 hover:text-grx-primary-800">
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-grx-primary-600 hover:bg-grx-primary-700 text-white grx-btn-press font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              <div className="my-6 relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-grx-primary-100"></div>
                </div>
                <span className="relative bg-white px-4 text-sm text-grx-muted">OR</span>
              </div>

              <div className="space-y-4">
                <button className="w-full bg-white border border-grx-primary-100 text-grx-text font-medium py-2.5 rounded-lg hover:bg-grx-bg transition-colors flex items-center justify-center gap-2">
                   <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                  </svg>
                  Sign in with Google (SSO)
                </button>

                <div className="bg-grx-bg p-4 rounded-lg border border-grx-primary-100">
                  <p className="text-xs font-semibold text-grx-muted uppercase mb-2">Quick Demo Access</p>
                  <select 
                    value={selectedDemoEmail}
                    onChange={(e) => setSelectedDemoEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-grx-primary-100 text-sm mb-2"
                  >
                    {MOCK_EMPLOYEES.filter(e => e.status === 'Active').map(emp => (
                      <option key={emp.id} value={emp.email}>
                        {emp.name} - {emp.role}
                      </option>
                    ))}
                  </select>
                  <button 
                    onClick={handleDemoLogin}
                    className="w-full bg-grx-dark-surface text-white text-xs font-medium py-2 rounded hover:bg-grx-dark"
                  >
                    Enter as Demo User
                  </button>
                </div>

                 <div className="text-center">
                  <button type="button" onClick={() => setView('activate')} className="text-sm font-medium text-grx-primary-600 hover:text-grx-primary-800 flex items-center justify-center gap-1 mx-auto">
                    First time user? Activate account <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <p className="text-sm text-grx-muted mb-4">Enter your email address and we'll send you a link to reset your password.</p>
              <div>
                <label className="block text-sm font-medium text-grx-text mb-1">Work Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2.5 rounded-lg border border-grx-primary-100 focus:ring-2 focus:ring-grx-primary outline-none"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-grx-primary-600 hover:bg-grx-primary-700 text-white grx-btn-press font-semibold py-2.5 rounded-lg"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button type="button" onClick={() => setView('login')} className="w-full text-sm text-grx-muted hover:text-grx-text py-2">
                Back to Login
              </button>
            </form>
          )}

          {view === 'activate' && (
            <form onSubmit={handleActivation} className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <p className="text-sm text-grx-muted mb-4">Welcome to GRX10! Enter your work email and create a new password to activate your account.</p>
              <div>
                <label className="block text-sm font-medium text-grx-text mb-1">Work Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2.5 rounded-lg border border-grx-primary-100 focus:ring-2 focus:ring-grx-primary outline-none"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-grx-text mb-1">New Password</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-2.5 rounded-lg border border-grx-primary-100 focus:ring-2 focus:ring-grx-primary outline-none"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg"
              >
                {loading ? 'Activating...' : 'Activate Account'}
              </button>
              <button type="button" onClick={() => setView('login')} className="w-full text-sm text-grx-muted hover:text-grx-text py-2">
                Back to Login
              </button>
            </form>
          )}
        </div>
        
        <div className="px-8 py-4 bg-grx-bg border-t border-grx-primary-50 text-center text-xs text-grx-muted">
          &copy; 2024 GRX10 Systems. Secure Employee Portal.
        </div>
      </div>
    </div>
  );
};
