
import React from 'react';
import { ConfigManager } from '../../../shared/components/config/ConfigManager';

export const DepartmentsPage: React.FC = () => {
  return (
    <ConfigManager
      title="Departments"
      apiEndpoint="departments"
      fields={[
        { key: 'name', label: 'Department Name', type: 'text', required: true },
        { key: 'code', label: 'Code', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' }
      ]}
    />
  );
};

