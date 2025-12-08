
import React from 'react';
import { ConfigManager } from '../../../shared/components/config/ConfigManager';

export const WorkLocationsPage: React.FC = () => {
  return (
    <ConfigManager
      title="Work Locations"
      apiEndpoint="work-locations"
      fields={[
        { key: 'name', label: 'Location Name', type: 'text', required: true },
        { key: 'code', label: 'Code', type: 'text' },
        { key: 'address', label: 'Address', type: 'textarea' },
        { key: 'city', label: 'City', type: 'text' },
        { key: 'state', label: 'State', type: 'text' },
        { key: 'country', label: 'Country', type: 'text' }
      ]}
    />
  );
};

