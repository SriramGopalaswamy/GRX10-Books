
import React from 'react';
import { ConfigManager } from '../../../shared/components/config/ConfigManager';

export const ChartOfAccountsPage: React.FC = () => {
  return (
    <ConfigManager
      title="Chart of Accounts"
      apiEndpoint="chart-of-accounts"
      fields={[
        { key: 'code', label: 'Account Code', type: 'text', required: true },
        { key: 'name', label: 'Account Name', type: 'text', required: true },
        { 
          key: 'type', 
          label: 'Account Type', 
          type: 'select',
          required: true,
          options: [
            { value: 'Asset', label: 'Asset' },
            { value: 'Liability', label: 'Liability' },
            { value: 'Income', label: 'Income' },
            { value: 'Expense', label: 'Expense' },
            { value: 'Equity', label: 'Equity' }
          ]
        },
        { key: 'description', label: 'Description', type: 'textarea' }
      ]}
    />
  );
};

