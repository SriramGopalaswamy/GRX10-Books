import React from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { HRMSRole as Role } from '../../../shared/types';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  Banknote, 
  FileText, 
  LogOut, 
  Bot, 
  Menu,
  Briefcase
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  active: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, to, active }) => (
  <Link 
    to={to} 
    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      active 
        ? 'bg-indigo-600 text-white' 
        : 'text-grx-muted hover:bg-grx-dark-surface hover:text-white'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </Link>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', to: '/dashboard', roles: [Role.EMPLOYEE, Role.MANAGER, Role.HR, Role.FINANCE, Role.ADMIN] },
    { icon: <CalendarCheck size={20} />, label: 'Attendance', to: '/attendance', roles: [Role.EMPLOYEE, Role.MANAGER, Role.HR] },
    { icon: <Briefcase size={20} />, label: 'Leaves', to: '/leaves', roles: [Role.EMPLOYEE, Role.MANAGER, Role.HR] },
    { icon: <Users size={20} />, label: 'Employees', to: '/employees', roles: [Role.HR, Role.MANAGER, Role.ADMIN] },
    { icon: <Banknote size={20} />, label: 'Payroll', to: '/payroll', roles: [Role.FINANCE, Role.HR, Role.EMPLOYEE] },
    { icon: <Bot size={20} />, label: 'HR Assistant', to: '/assistant', roles: [Role.EMPLOYEE, Role.MANAGER, Role.HR, Role.FINANCE, Role.ADMIN] },
  ];

  const filteredNav = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-grx-bg overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-grx-dark text-white transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center gap-3 border-b border-grx-primary-800">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white">
            G
          </div>
          <h1 className="text-xl font-bold tracking-tight">GRX10 HRMS</h1>
        </div>

        <nav className="p-4 space-y-2 mt-4">
          {filteredNav.map((item) => (
            <SidebarItem 
              key={item.to}
              {...item}
              active={location.pathname === item.to}
            />
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-grx-primary-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-grx-muted hover:bg-rose-900/20 hover:text-rose-400 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white h-16 border-b border-grx-primary-100 flex items-center justify-between px-4 lg:px-8">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-grx-muted hover:bg-grx-primary-50 rounded-lg"
          >
            <Menu size={24} />
          </button>

          <div className="flex-1"></div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-grx-text">{user?.name}</p>
              <p className="text-xs text-grx-muted">{user?.designation}</p>
            </div>
            <img 
              src={user?.avatar || "https://picsum.photos/200"} 
              alt="Avatar" 
              className="w-10 h-10 rounded-full border-2 border-grx-primary-100"
            />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};