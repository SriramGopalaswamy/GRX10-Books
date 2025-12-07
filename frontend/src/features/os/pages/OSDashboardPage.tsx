import React from 'react';
import { StoreProvider } from '../../../shared/contexts/StoreContext';
import { Dashboard } from '../components/Dashboard';

export const OSDashboardPage: React.FC = () => {
  return (
    <StoreProvider>
      <Dashboard />
    </StoreProvider>
  );
};

