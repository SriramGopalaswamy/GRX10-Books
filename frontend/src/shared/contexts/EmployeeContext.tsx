
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Employee, HRMSRole as Role } from '../types';
import { MOCK_EMPLOYEES } from '../constants/app.constants';

interface EmployeeContextType {
  employees: Employee[];
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  getEmployee: (id: string) => Employee | undefined;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const EmployeeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    // Initialize with mock data or load from local storage
    const saved = localStorage.getItem('grx10_employees');
    if (saved) {
      setEmployees(JSON.parse(saved));
    } else {
      setEmployees(MOCK_EMPLOYEES);
    }
  }, []);

  useEffect(() => {
    if (employees.length > 0) {
      localStorage.setItem('grx10_employees', JSON.stringify(employees));
    }
  }, [employees]);

  const addEmployee = (employee: Employee) => {
    setEmployees(prev => [...prev, employee]);
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, ...updates } : emp));
  };

  const removeEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  const getEmployee = (id: string) => employees.find(e => e.id === id);

  return (
    <EmployeeContext.Provider value={{ employees, addEmployee, updateEmployee, removeEmployee, getEmployee }}>
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployees = () => {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error("useEmployees must be used within an EmployeeProvider");
  }
  return context;
};
