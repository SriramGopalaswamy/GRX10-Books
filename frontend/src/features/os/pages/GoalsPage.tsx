import React from 'react';
import { StoreProvider } from '../../../shared/contexts/StoreContext';
import { GoalList } from '../components/Goals/GoalList';

export const GoalsPage: React.FC = () => {
  return (
    <StoreProvider>
      <GoalList />
    </StoreProvider>
  );
};

