
import React from 'react';
import { ConfigManager } from '../../../shared/components/config/ConfigManager';

export const LanguagesPage: React.FC = () => {
  return (
    <ConfigManager
      title="Languages"
      apiEndpoint="languages"
      fields={[
        { key: 'name', label: 'Language Name', type: 'text', required: true },
        { key: 'code', label: 'ISO Code', type: 'text' }
      ]}
    />
  );
};

