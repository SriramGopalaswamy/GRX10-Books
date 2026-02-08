import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Check, X, Clock, FileText, CalendarDays, AlertCircle } from 'lucide-react';

interface HRMSNotification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedModule?: string;
  relatedId?: string;
  createdAt: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  leave_applied: <CalendarDays size={14} className="text-blue-500" />,
  leave_approved: <Check size={14} className="text-emerald-500" />,
  leave_rejected: <X size={14} className="text-red-500" />,
  payslip_generated: <FileText size={14} className="text-grx-primary-500" />,
  attendance_anomaly: <AlertCircle size={14} className="text-amber-500" />,
  regularization_update: <Clock size={14} className="text-purple-500" />,
  pt_slab_change: <AlertCircle size={14} className="text-orange-500" />,
};

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<HRMSNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/hrms/notifications?limit=30');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      // Silently fail - notifications are non-critical
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/hrms/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/hrms/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      // ignore
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-grx-muted hover:bg-grx-primary-50 dark:hover:bg-grx-primary-800 rounded-full relative transition-colors"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 border-2 border-white dark:border-grx-dark-surface rounded-full flex items-center justify-center text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 grx-glass-card rounded-xl shadow-xl border border-grx-primary-50 dark:border-grx-primary-800 z-40 overflow-hidden grx-dropdown-enter">
            <div className="p-3 border-b border-grx-primary-50 dark:border-grx-primary-800 flex justify-between items-center bg-grx-bg dark:bg-grx-dark-surface">
              <h3 className="text-sm font-bold text-grx-text dark:text-grx-primary-200">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-grx-primary-600 hover:text-grx-primary-700 dark:text-grx-primary-400 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-grx-muted">
                  No notifications
                </div>
              ) : (
                notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`p-3 border-b border-grx-primary-50 dark:border-grx-primary-800 hover:bg-grx-bg dark:hover:bg-grx-primary-800/50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-grx-primary-50/40 dark:bg-grx-primary-900/20' : 'opacity-70'}`}
                    onClick={() => !notif.isRead && markAsRead(notif.id)}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        {ICON_MAP[notif.type] || <Bell size={14} className="text-grx-muted" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-grx-text dark:text-grx-primary-200">{notif.title}</p>
                        <p className="text-xs text-grx-muted dark:text-grx-muted mt-0.5 line-clamp-2">{notif.message}</p>
                        <p className="text-[10px] text-grx-muted mt-1">{timeAgo(notif.createdAt)}</p>
                      </div>
                      {!notif.isRead && (
                        <div className="w-2 h-2 bg-grx-primary-500 rounded-full mt-1 shrink-0" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
