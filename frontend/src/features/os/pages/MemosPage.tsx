import React from 'react';
import { StoreProvider } from '../../../shared/contexts/StoreContext';
import { MemoList } from '../components/Memos/MemoList';

export const MemosPage: React.FC = () => {
  return (
    <StoreProvider>
      <MemoList />
    </StoreProvider>
  );
};

