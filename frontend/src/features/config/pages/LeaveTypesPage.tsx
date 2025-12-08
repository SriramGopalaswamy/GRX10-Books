
import React from 'react';
import { ConfigManager } from '../../../shared/components/config/ConfigManager';

export const LeaveTypesPage: React.FC = () => {
  return (
    <ConfigManager
      title="Leave Types"
      apiEndpoint="leave-types"
      fields={[
        { key: 'name', label: 'Leave Type', type: 'text', required: true },
        { key: 'code', label: 'Code', type: 'text' },
        { key: 'maxDays', label: 'Max Days', type: 'number' },
        { key: 'description', label: 'Description', type: 'textarea' }
      ]}
    />
  );
};

