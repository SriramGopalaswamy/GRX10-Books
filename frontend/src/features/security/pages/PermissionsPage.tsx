
import React from 'react';
import { ConfigManager } from '../../../shared/components/config/ConfigManager';

export const PermissionsPage: React.FC = () => {
  return (
    <ConfigManager
      title="Permissions"
      apiEndpoint="security/permissions"
      fields={[
        { key: 'name', label: 'Permission Name', type: 'text', required: true },
        { key: 'code', label: 'Code', type: 'text', required: true },
        { 
          key: 'module', 
          label: 'Module', 
          type: 'select',
          required: true,
          options: [
            { value: 'hrms', label: 'HRMS' },
            { value: 'financial', label: 'Financial' },
            { value: 'os', label: 'Performance OS' },
            { value: 'config', label: 'Configuration' },
            { value: 'admin', label: 'Admin' }
          ]
        },
        { 
          key: 'resource', 
          label: 'Resource', 
          type: 'text',
          required: true
        },
        { 
          key: 'action', 
          label: 'Action', 
          type: 'select',
          required: true,
          options: [
            { value: 'create', label: 'Create' },
            { value: 'read', label: 'Read' },
            { value: 'update', label: 'Update' },
            { value: 'delete', label: 'Delete' },
            { value: 'approve', label: 'Approve' }
          ]
        },
        { key: 'description', label: 'Description', type: 'textarea' }
      ]}
    />
  );
};

