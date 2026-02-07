import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const toastConfig: Record<ToastType, {
  icon: React.ComponentType<{ size?: number }>;
  bgClass: string;
  borderClass: string;
  iconColor: string;
}> = {
  success: {
    icon: CheckCircle,
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  error: {
    icon: AlertCircle,
    bgClass: 'bg-red-50 dark:bg-red-900/20',
    borderClass: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-amber-50 dark:bg-amber-900/20',
    borderClass: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    icon: Info,
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    borderClass: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({
  toast,
  onRemove,
}) => {
  const [exiting, setExiting] = useState(false);
  const config = toastConfig[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    const duration = toast.duration ?? 4000;
    const exitTimer = setTimeout(() => setExiting(true), duration - 200);
    const removeTimer = setTimeout(() => onRemove(toast.id), duration);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-sm ${
        config.bgClass
      } ${config.borderClass} ${
        exiting ? 'grx-animate-toast-exit' : 'grx-animate-toast-enter'
      }`}
      role="alert"
    >
      <Icon size={18} className={`mt-0.5 flex-shrink-0 ${config.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-grx-text dark:text-white">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-xs text-grx-muted dark:text-slate-400 mt-0.5">
            {toast.message}
          </p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-grx-muted hover:text-grx-text dark:hover:text-white transition-colors p-0.5 rounded grx-focus-ring"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="grx-toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
