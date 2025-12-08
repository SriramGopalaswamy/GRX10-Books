
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ConfigItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  [key: string]: any;
}

interface ConfigurationContextType {
  // HR Configurations
  departments: ConfigItem[];
  positions: ConfigItem[];
  roles: ConfigItem[];
  employeeTypes: ConfigItem[];
  holidays: ConfigItem[];
  leaveTypes: ConfigItem[];
  workLocations: ConfigItem[];
  skills: ConfigItem[];
  languages: ConfigItem[];
  organizations: ConfigItem[];
  // Finance Configurations
  chartOfAccounts: ConfigItem[];
  // Loading states
  loading: boolean;
  // Refresh function
  refreshConfig: () => Promise<void>;
  // Get active items only
  getActiveDepartments: () => ConfigItem[];
  getActivePositions: () => ConfigItem[];
  getActiveRoles: () => ConfigItem[];
  getActiveEmployeeTypes: () => ConfigItem[];
  getActiveHolidays: () => ConfigItem[];
  getActiveLeaveTypes: () => ConfigItem[];
  getActiveWorkLocations: () => ConfigItem[];
  getActiveSkills: () => ConfigItem[];
  getActiveLanguages: () => ConfigItem[];
  getActiveOrganizations: () => ConfigItem[];
  getActiveChartOfAccounts: () => ConfigItem[];
}

const ConfigurationContext = createContext<ConfigurationContextType | undefined>(undefined);

export const ConfigurationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [departments, setDepartments] = useState<ConfigItem[]>([]);
  const [positions, setPositions] = useState<ConfigItem[]>([]);
  const [roles, setRoles] = useState<ConfigItem[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<ConfigItem[]>([]);
  const [holidays, setHolidays] = useState<ConfigItem[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<ConfigItem[]>([]);
  const [workLocations, setWorkLocations] = useState<ConfigItem[]>([]);
  const [skills, setSkills] = useState<ConfigItem[]>([]);
  const [languages, setLanguages] = useState<ConfigItem[]>([]);
  const [organizations, setOrganizations] = useState<ConfigItem[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const [depts, pos, rols, empTypes, hols, leaveTypesData, locs, skls, langs, orgs, coa] = await Promise.all([
        fetch('/api/config/departments?activeOnly=true').then(r => r.json()),
        fetch('/api/config/positions?activeOnly=true').then(r => r.json()),
        fetch('/api/config/hrms-roles?activeOnly=true').then(r => r.json()),
        fetch('/api/config/employee-types?activeOnly=true').then(r => r.json()),
        fetch('/api/config/holidays?activeOnly=true').then(r => r.json()),
        fetch('/api/config/leave-types?activeOnly=true').then(r => r.json()),
        fetch('/api/config/work-locations?activeOnly=true').then(r => r.json()),
        fetch('/api/config/skills?activeOnly=true').then(r => r.json()),
        fetch('/api/config/languages?activeOnly=true').then(r => r.json()),
        fetch('/api/config/organizations?activeOnly=true').then(r => r.json()),
        fetch('/api/config/chart-of-accounts?activeOnly=true').then(r => r.json())
      ]);

      setDepartments(depts);
      setPositions(pos);
      setRoles(rols);
      setEmployeeTypes(empTypes);
      setHolidays(hols);
      setLeaveTypes(leaveTypesData);
      setWorkLocations(locs);
      setSkills(skls);
      setLanguages(langs);
      setOrganizations(orgs);
      setChartOfAccounts(coa);
    } catch (error) {
      console.error('Error fetching configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const refreshConfig = async () => {
    await fetchConfig();
  };

  const getActiveDepartments = () => departments.filter(d => d.isActive);
  const getActivePositions = () => positions.filter(p => p.isActive);
  const getActiveRoles = () => roles.filter(r => r.isActive);
  const getActiveEmployeeTypes = () => employeeTypes.filter(e => e.isActive);
  const getActiveHolidays = () => holidays.filter(h => h.isActive);
  const getActiveLeaveTypes = () => leaveTypes.filter(l => l.isActive);
  const getActiveWorkLocations = () => workLocations.filter(w => w.isActive);
  const getActiveSkills = () => skills.filter(s => s.isActive);
  const getActiveLanguages = () => languages.filter(l => l.isActive);
  const getActiveOrganizations = () => organizations.filter(o => o.isActive);
  const getActiveChartOfAccounts = () => chartOfAccounts.filter(c => c.isActive);

  return (
    <ConfigurationContext.Provider
      value={{
        departments,
        positions,
        roles,
        employeeTypes,
        holidays,
        leaveTypes,
        workLocations,
        skills,
        languages,
        organizations,
        chartOfAccounts,
        loading,
        refreshConfig,
        getActiveDepartments,
        getActivePositions,
        getActiveRoles,
        getActiveEmployeeTypes,
        getActiveHolidays,
        getActiveLeaveTypes,
        getActiveWorkLocations,
        getActiveSkills,
        getActiveLanguages,
        getActiveOrganizations,
        getActiveChartOfAccounts
      }}
    >
      {children}
    </ConfigurationContext.Provider>
  );
};

export const useConfiguration = () => {
  const context = useContext(ConfigurationContext);
  if (!context) {
    throw new Error('useConfiguration must be used within a ConfigurationProvider');
  }
  return context;
};

