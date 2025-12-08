
import React from 'react';
import { ConfigManager } from '../../../shared/components/config/ConfigManager';

export const PositionsPage: React.FC = () => {
  return (
    <ConfigManager
      title="Positions"
      apiEndpoint="positions"
      fields={[
        { key: 'name', label: 'Position Name', type: 'text', required: true },
        { key: 'code', label: 'Code', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' }
      ]}
    />
  );
};

