
import React from 'react';
import { ConfigManager } from '../../../shared/components/config/ConfigManager';

export const OrganizationsPage: React.FC = () => {
  return (
    <ConfigManager
      title="Organizations"
      apiEndpoint="organizations"
      fields={[
        { key: 'name', label: 'Organization Name', type: 'text', required: true },
        { key: 'code', label: 'Code', type: 'text' },
        { key: 'address', label: 'Address', type: 'textarea' },
        { key: 'phone', label: 'Phone', type: 'text' },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'website', label: 'Website', type: 'text' },
        { key: 'taxId', label: 'Tax ID', type: 'text' }
      ]}
    />
  );
};

