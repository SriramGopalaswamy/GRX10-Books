
import React from 'react';
import { ConfigManager } from '../../../shared/components/config/ConfigManager';

export const SkillsPage: React.FC = () => {
  return (
    <ConfigManager
      title="Skills"
      apiEndpoint="skills"
      fields={[
        { key: 'name', label: 'Skill Name', type: 'text', required: true },
        { 
          key: 'category', 
          label: 'Category', 
          type: 'select',
          options: [
            { value: 'Technical', label: 'Technical' },
            { value: 'Soft', label: 'Soft Skills' },
            { value: 'Domain', label: 'Domain' },
            { value: 'Other', label: 'Other' }
          ]
        },
        { key: 'description', label: 'Description', type: 'textarea' }
      ]}
    />
  );
};

