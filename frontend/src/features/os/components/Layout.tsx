
import React, { useState } from 'react';
import { useStore } from '../../../shared/contexts/StoreContext';
import { 
  LayoutDashboard, 
  Target, 
  FileText, 
  Sun,
  Menu,
  Bell,
  Check,
  AlertCircle
} from 'lucide-react';
import { GeminiChat } from './Chat/GeminiChat';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { currentUser, users, setCurrentUser, notifications, markNotificationRead, markAllNotificationsRead } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Filter notifications for current user
  const myNotifications = notifications.filter(n => n.userId === currentUser.id);
  const unreadCount = myNotifications.filter(n => !n.read).length;

  const NavItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button
      onClick={() => {
        onTabChange(id);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        activeTab === id 
          ? 'bg-brand-50 text-brand-700 font-medium' 
          : 'text-grx-muted hover:bg-gray-50'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-grx-bg overflow-hidden relative">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-100 flex items-center space-x-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold">
              <Sun size={18} />
            </div>
            <span className="text-xl font-bold text-grx-text tracking-tight">GRX10 <span className="text-brand-600">OS</span></span>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem id="goals" icon={Target} label="Goals System" />
            <NavItem id="memos" icon={FileText} label="Memo System" />
            <div className="pt-4 mt-4 border-t border-gray-100">
              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Debug: Switch User</div>
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => setCurrentUser(u)}
                  className={`block w-full text-left px-4 py-1 text-sm ${currentUser.id === u.id ? 'text-brand-600 font-bold' : 'text-gray-500'}`}
                >
                  {u.name} ({u.role})
                </button>
              ))}
            </div>
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center space-x-3">
              <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-10 h-10 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{currentUser.name}</p>
                <p className="text-xs text-gray-500 truncate">{currentUser.team}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-gray-200 shadow-sm z-20">
            <div className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-gray-600">
                        <Menu />
                    </button>
                    <h2 className="text-lg font-semibold text-grx-text capitalize">
                        {activeTab}
                    </h2>
                </div>

                <div className="flex items-center gap-4">
                    {/* Notifications */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsNotifOpen(!isNotifOpen)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative transition-colors"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {isNotifOpen && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setIsNotifOpen(false)}></div>
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-40 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-grx-bg">
                                        <h3 className="text-sm font-bold text-grx-text">Notifications</h3>
                                        {unreadCount > 0 && (
                                            <button onClick={markAllNotificationsRead} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {myNotifications.length === 0 ? (
                                            <div className="p-8 text-center text-gray-400 text-sm">
                                                No notifications
                                            </div>
                                        ) : (
                                            myNotifications.map(notif => (
                                                <div 
                                                    key={notif.id} 
                                                    className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer relative ${notif.read ? 'opacity-60' : 'bg-blue-50/30'}`}
                                                    onClick={() => {
                                                        markNotificationRead(notif.id);
                                                        if (notif.actionLink) onTabChange(notif.actionLink);
                                                        setIsNotifOpen(false);
                                                    }}
                                                >
                                                    {!notif.read && <div className="absolute left-2 top-5 w-2 h-2 bg-brand-500 rounded-full"></div>}
                                                    <div className="flex gap-3 pl-2">
                                                        <div className={`mt-1 ${notif.type === 'alert' ? 'text-red-500' : 'text-blue-500'}`}>
                                                            {notif.type === 'alert' ? <AlertCircle size={16} /> : <Check size={16} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-grx-text">{notif.title}</p>
                                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                                                            <p className="text-[10px] text-gray-400 mt-2">{notif.timestamp}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    
                    {/* User Avatar (Simplified for top bar) */}
                    <div className="hidden md:flex items-center gap-2 border-l border-gray-200 pl-4">
                        <img src={currentUser.avatarUrl} className="w-8 h-8 rounded-full border border-gray-200" alt="Avatar" />
                    </div>
                </div>
            </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      
      {/* Chat Component - Placed outside main content for better Z-Index handling */}
      <GeminiChat />
    </div>
  );
};
