import React, { useState } from 'react';
import { Bell, Search, Sun, Moon, Menu, X } from 'lucide-react';
import { GRX10Logo } from './GRX10Logo';
import { useTheme } from '../contexts/ThemeContext';
import { View } from '../types';

interface HeaderProps {
  onNavigateHome: () => void;
  user?: { name?: string; displayName?: string; email?: string } | null;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateHome,
  user,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [searchFocused, setSearchFocused] = useState(false);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-grx-primary dark:bg-grx-primary-900 text-white"
      style={{ boxShadow: 'var(--shadow-header)' }}
    >
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left: Sidebar toggle + Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors duration-150 grx-btn-press grx-focus-ring"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity duration-150 grx-focus-ring rounded-lg px-1"
            aria-label="Go to dashboard"
          >
            <GRX10Logo size="sm" variant="full" />
          </button>
        </div>

        {/* Center: Search (hidden on small screens) */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div
            className={`flex items-center w-full rounded-lg transition-all duration-200 ${
              searchFocused
                ? 'bg-white/20 ring-2 ring-grx-accent/50'
                : 'bg-white/10 hover:bg-white/15'
            }`}
          >
            <Search size={16} className="ml-3 text-white/60" />
            <input
              type="text"
              placeholder="Search pages, features..."
              className="w-full bg-transparent px-3 py-2 text-sm text-white placeholder-white/50 outline-none"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors duration-150 grx-btn-press grx-focus-ring"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            className="relative p-2 rounded-lg hover:bg-white/10 transition-colors duration-150 grx-btn-press grx-focus-ring"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-grx-accent rounded-full" />
          </button>

          {/* User Avatar */}
          <div className="ml-2 flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold grx-gradient"
              title={user?.name || 'User'}
            >
              {initials}
            </div>
            <span className="hidden lg:block text-sm font-medium truncate max-w-[120px]">
              {user?.name?.split(' ')[0] || 'User'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
