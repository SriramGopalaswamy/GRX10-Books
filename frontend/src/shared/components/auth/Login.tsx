import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, User, Eye, EyeOff } from 'lucide-react';
import { GRX10Logo } from '../../design-system/GRX10Logo';

const Login: React.FC = () => {
    const [error, setError] = useState<string | null>(null);
    const [loginMethod, setLoginMethod] = useState<'sso' | 'email'>('sso');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get('error');
        const messageParam = params.get('message');
        if (errorParam) {
            const fallbackMessages: Record<string, string> = {
                access_denied: 'Access denied. Your account is not authorized.',
                server_error: 'SSO failed due to a server error. Please try again.',
                session_error: 'Unable to create a session. Please try again.'
            };
            setError(messageParam || fallbackMessages[errorParam] || 'Login failed. Please try again.');
        }
    }, []);

    const validate = (): boolean => {
        const errors: { username?: string; password?: string } = {};
        if (!username.trim()) errors.username = 'Email or Employee ID is required';
        if (!password.trim()) errors.password = 'Password is required';
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleMicrosoftLogin = () => {
        window.location.href = '/api/auth/microsoft';
    };

    const handleGoogleLogin = () => {
        window.location.href = '/api/auth/google';
    };

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!validate()) return;
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                window.location.reload();
            } else {
                setError(data.error || 'Invalid credentials');
            }
        } catch (err) {
            setError('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen grx-mesh-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Animated decorative orbs */}
            <div
                className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(58,47,120,0.15) 0%, transparent 70%)', filter: 'blur(60px)', transform: 'translate(-30%, -30%)', animation: 'grx-fade-in 2s ease both' }}
            />
            <div
                className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(230,0,126,0.1) 0%, transparent 70%)', filter: 'blur(60px)', transform: 'translate(30%, 30%)', animation: 'grx-fade-in 2s ease 0.3s both' }}
            />
            <div
                className="absolute top-1/2 left-1/2 w-[400px] h-[400px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(97,82,203,0.08) 0%, transparent 70%)', filter: 'blur(80px)', transform: 'translate(-50%, -50%)', animation: 'grx-fade-in 2s ease 0.6s both' }}
            />

            <div className="grx-animate-scale-in w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8 grx-animate-fade-in-down">
                    <GRX10Logo size="xl" variant="text" className="mb-2" />
                    <p className="text-grx-muted text-sm">Financial Suite</p>
                </div>

                {/* Card */}
                <div className="grx-glass-strong p-8 rounded-2xl"
                     style={{ boxShadow: '0 8px 32px rgba(58, 47, 120, 0.08), inset 0 1px 0 rgba(255,255,255,0.6)' }}>
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 grx-gradient">
                            <ShieldCheck size={28} className="text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-grx-text dark:text-white">Welcome Back</h1>
                        <p className="text-grx-muted text-sm mt-1">Secure Access for Authorized Personnel</p>
                    </div>

                    {/* Login Method Toggle */}
                    <div className="flex gap-1 mb-6 bg-grx-primary-50 dark:bg-grx-primary-800 p-1 rounded-lg">
                        <button
                            onClick={() => { setLoginMethod('sso'); setError(null); setFieldErrors({}); }}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 grx-btn-press grx-focus-ring ${
                                loginMethod === 'sso'
                                    ? 'bg-grx-primary text-white grx-btn-press shadow-sm'
                                    : 'text-grx-muted hover:text-grx-text dark:hover:text-white'
                            }`}
                        >
                            SSO
                        </button>
                        <button
                            onClick={() => { setLoginMethod('email'); setError(null); setFieldErrors({}); }}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 grx-btn-press grx-focus-ring ${
                                loginMethod === 'email'
                                    ? 'bg-grx-primary text-white grx-btn-press shadow-sm'
                                    : 'text-grx-muted hover:text-grx-text dark:hover:text-white'
                            }`}
                        >
                            EMAIL
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm mb-5 border border-red-200 dark:border-red-800 flex items-center gap-2 grx-animate-fade-in-down" role="alert">
                            <Lock size={16} className="flex-shrink-0" /> {error}
                        </div>
                    )}

                    {loginMethod === 'sso' ? (
                        <div className="grx-animate-fade-in space-y-3">
                            <button
                                onClick={handleMicrosoftLogin}
                                className="w-full bg-grx-text dark:bg-white text-white dark:text-grx-text py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-all duration-200 flex items-center justify-center gap-3 grx-btn-press grx-focus-ring"
                                style={{ boxShadow: 'var(--shadow-md)' }}
                            >
                                <img src="https://learn.microsoft.com/en-us/entra/identity-platform/media/howto-add-branding-in-apps/ms-symbollockup_mssymbol_19.png" alt="Microsoft" className="w-5 h-5" />
                                Sign in with Microsoft 365
                            </button>
                            <button
                                onClick={handleGoogleLogin}
                                className="w-full bg-white dark:bg-grx-dark-surface text-grx-text dark:text-white py-3 px-4 rounded-lg font-semibold border border-grx-primary-100 dark:border-grx-primary-700 hover:bg-grx-bg dark:hover:bg-grx-primary-800 transition-all duration-200 flex items-center justify-center gap-3 grx-btn-press grx-focus-ring"
                                style={{ boxShadow: 'var(--shadow-md)' }}
                            >
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                                Sign in with Google
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleAdminLogin} className="space-y-4 grx-animate-fade-in">
                            <div>
                                <label className="block text-left text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1.5">
                                    Email / Employee ID
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-grx-muted" size={18} />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => { setUsername(e.target.value); setFieldErrors(prev => ({ ...prev, username: undefined })); }}
                                        className={`grx-input w-full pl-10 pr-4 py-2.5 bg-grx-bg dark:bg-grx-primary-800 border rounded-lg text-grx-text dark:text-white placeholder-grx-muted outline-none transition-all duration-200 grx-focus-ring ${
                                            fieldErrors.username
                                                ? 'border-red-400 dark:border-red-600'
                                                : 'border-grx-primary-100 dark:border-grx-primary-700 focus:border-grx-primary dark:focus:border-grx-primary-400'
                                        }`}
                                        placeholder="Enter email or employee ID"
                                        autoComplete="username"
                                    />
                                </div>
                                {fieldErrors.username && (
                                    <p className="text-red-500 text-xs mt-1 grx-animate-fade-in-down">{fieldErrors.username}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-left text-sm font-medium text-grx-text dark:text-grx-primary-200 mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-grx-muted" size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: undefined })); }}
                                        className={`grx-input w-full pl-10 pr-10 py-2.5 bg-grx-bg dark:bg-grx-primary-800 border rounded-lg text-grx-text dark:text-white placeholder-grx-muted outline-none transition-all duration-200 grx-focus-ring ${
                                            fieldErrors.password
                                                ? 'border-red-400 dark:border-red-600'
                                                : 'border-grx-primary-100 dark:border-grx-primary-700 focus:border-grx-primary dark:focus:border-grx-primary-400'
                                        }`}
                                        placeholder="Enter password"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-grx-muted hover:text-grx-text dark:hover:text-white transition-colors"
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {fieldErrors.password && (
                                    <p className="text-red-500 text-xs mt-1 grx-animate-fade-in-down">{fieldErrors.password}</p>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-grx-primary hover:bg-grx-primary-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed grx-btn-press grx-focus-ring"
                                style={{ boxShadow: 'var(--shadow-md)' }}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="grx-spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck size={18} />
                                        Sign in
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    <p className="text-xs text-grx-muted text-center mt-6 leading-relaxed">
                        By signing in, you agree to the GRX10 security policy.
                        <br />Only authorized accounts can access this system.
                    </p>
                </div>

                {/* Footer branding */}
                <div className="text-center mt-6">
                    <p className="text-xs text-grx-muted">
                        Powered by <span className="font-semibold" style={{ color: 'var(--grx10-primary)' }}>GRX10</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
