
import React from 'react';
import { ConfigManager } from '../../../shared/components/config/ConfigManager';

export const HolidaysPage: React.FC = () => {
  return (
    <ConfigManager
      title="Holidays"
      apiEndpoint="holidays"
      fields={[
        { key: 'name', label: 'Holiday Name', type: 'text', required: true },
        { key: 'date', label: 'Date', type: 'date', required: true },
        { 
          key: 'type', 
          label: 'Type', 
          type: 'select', 
          options: [
            { value: 'National', label: 'National' },
            { value: 'Regional', label: 'Regional' },
            { value: 'Company', label: 'Company' },
            { value: 'Optional', label: 'Optional' }
          ]
        },
        { key: 'description', label: 'Description', type: 'textarea' }
      ]}
    />
  );
};

