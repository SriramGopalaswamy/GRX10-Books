
import React from 'react';
import { ConfigManager } from '../../../shared/components/config/ConfigManager';

export const RolesPage: React.FC = () => {
  return (
    <ConfigManager
      title="HRMS Roles"
      apiEndpoint="hrms-roles"
      fields={[
        { key: 'name', label: 'Role Name', type: 'text', required: true },
        { key: 'code', label: 'Code', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' }
      ]}
    />
  );
};

