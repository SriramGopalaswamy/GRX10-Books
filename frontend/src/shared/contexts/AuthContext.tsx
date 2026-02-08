
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Employee, HRMSRole as Role } from '../types';
import { MOCK_EMPLOYEES } from '../constants/app.constants';
import { useEmployees } from './EmployeeContext';
import { ROLE_PERMISSION_FALLBACK } from '../security/permissions';

interface AuthContextType {
  user: Employee | null;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  activateAccount: (email: string, password: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Employee | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const { employees, updateEmployee } = useEmployees();

  useEffect(() => {
    // Check backend session first, then local storage
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        if (data.isAuthenticated && data.user) {
          // Convert backend user to Employee format
          const backendUser = data.user;
          const backendPermissions: string[] = Array.isArray(backendUser.permissions) ? backendUser.permissions : [];
          // Try to find matching employee in the employees list
          const employee = employees.find(e => e.id === backendUser.id || e.email === backendUser.email);
          if (employee) {
            const enrichedEmployee = { ...employee, permissions: backendPermissions };
            setUser(enrichedEmployee);
            setPermissions(backendPermissions);
            localStorage.setItem('grx10_user', JSON.stringify(enrichedEmployee));
            localStorage.setItem('grx10_permissions', JSON.stringify(backendPermissions));
          } else {
            // If employee not found in list yet, create a temporary user object
            const tempUser: Employee = {
              id: backendUser.id,
              name: backendUser.name || backendUser.displayName || 'User',
              email: backendUser.email,
              role: backendUser.role || 'Employee',
              department: '',
              designation: '',
              joinDate: '',
              status: 'Active',
              avatar: '',
              password: '',
              permissions: backendPermissions
            };
            setUser(tempUser);
            setPermissions(backendPermissions);
            localStorage.setItem('grx10_user', JSON.stringify(tempUser));
            localStorage.setItem('grx10_permissions', JSON.stringify(backendPermissions));
          }
        } else {
          // Check local storage as fallback
          const savedUser = localStorage.getItem('grx10_user');
          if (savedUser) {
            setUser(JSON.parse(savedUser));
            const savedPermissions = localStorage.getItem('grx10_permissions');
            if (savedPermissions) {
              setPermissions(JSON.parse(savedPermissions));
            }
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
        // Fallback to local storage
        const savedUser = localStorage.getItem('grx10_user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
          const savedPermissions = localStorage.getItem('grx10_permissions');
          if (savedPermissions) {
            setPermissions(JSON.parse(savedPermissions));
          }
        }
      }
    };

    checkSession();
  }, [employees.length]);

  const login = async (email: string, password?: string) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // For Direct Login
    const foundUser = employees.find(u => u.email === email);
    
    if (!foundUser) {
      throw new Error("User not found");
    }

    if (foundUser.status === 'Exited') {
      throw new Error("Access revoked. Please contact HR.");
    }

    // If password is provided (Direct Login), check it. 
    // If not (SSO Mock), skip check.
    if (password && foundUser.password !== password) {
      throw new Error("Invalid credentials");
    }

    const fallbackPermissions = ROLE_PERMISSION_FALLBACK[foundUser.role] || [];
    const enrichedUser = { ...foundUser, permissions: fallbackPermissions };
    setUser(enrichedUser);
    setPermissions(fallbackPermissions);
    localStorage.setItem('grx10_user', JSON.stringify(enrichedUser));
    localStorage.setItem('grx10_permissions', JSON.stringify(fallbackPermissions));
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint to clear session
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      // Clear local state regardless of API call result
      setUser(null);
      setPermissions([]);
      localStorage.removeItem('grx10_user');
      localStorage.removeItem('grx10_permissions');
    }
  };

  const resetPassword = async (email: string) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const foundUser = employees.find(u => u.email === email);
    if (!foundUser) throw new Error("Email not found");
    // In a real app, this sends an email. Here we just succeed.
    return; 
  };

  const activateAccount = async (email: string, password: string) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const foundUser = employees.find(u => u.email === email);
    
    if (!foundUser) throw new Error("Email not found");
    // Only allow activation if marked as new user or if no password set
    // For this mock, we just update the password.
    
    updateEmployee(foundUser.id, { password, isNewUser: false });
    return;
  };

  const hasPermission = (permission: string) => permissions.includes(permission);

  return (
    <AuthContext.Provider value={{ user, permissions, hasPermission, login, logout, resetPassword, activateAccount, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
