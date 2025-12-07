import React from 'react';
import { EmployeeProvider } from '../../../shared/contexts/EmployeeContext';
import { AuthProvider } from '../../../shared/contexts/AuthContext';
import { RegularizationProvider } from '../../../shared/contexts/RegularizationContext';

interface HRMSProviderProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that provides all necessary contexts for HRMS pages
 * This ensures AuthContext, EmployeeContext, and RegularizationContext are available to all HRMS components
 */
export const HRMSProvider: React.FC<HRMSProviderProps> = ({ children }) => {
  return (
    <EmployeeProvider>
      <RegularizationProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </RegularizationProvider>
    </EmployeeProvider>
  );
};

