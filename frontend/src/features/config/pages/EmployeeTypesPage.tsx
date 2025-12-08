
import React from 'react';
import { ConfigManager } from '../../../shared/components/config/ConfigManager';

export const EmployeeTypesPage: React.FC = () => {
  return (
    <ConfigManager
      title="Employee Types"
      apiEndpoint="employee-types"
      fields={[
        { key: 'name', label: 'Employee Type', type: 'text', required: true },
        { key: 'code', label: 'Code', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' }
      ]}
    />
  );
};

