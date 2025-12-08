
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Employee, HRMSRole as Role } from '../types';
import { MOCK_EMPLOYEES } from '../constants/app.constants';

interface EmployeeContextType {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  addEmployee: (employee: Employee) => Promise<void>;
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>;
  removeEmployee: (id: string) => Promise<void>;
  getEmployee: (id: string) => Employee | undefined;
  refreshEmployees: () => Promise<void>;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const EmployeeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/hrms/employees');
      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }
      const data = await response.json();
      setEmployees(data);
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      setError(err.message || 'Failed to load employees');
      // Fallback to mock data if API fails
      setEmployees(MOCK_EMPLOYEES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const addEmployee = async (employee: Employee) => {
    try {
      setError(null);
      const response = await fetch('/api/hrms/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: employee.name,
          email: employee.email,
          role: employee.role,
          department: employee.department,
          designation: employee.designation,
          joinDate: employee.joinDate,
          avatar: employee.avatar,
          managerId: employee.managerId || null,
          salary: employee.salary || 0,
          status: employee.status || 'Active',
          password: employee.password,
          isNewUser: employee.isNewUser || false
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create employee');
      }

      const newEmployee = await response.json();
      setEmployees(prev => [...prev, newEmployee]);
    } catch (err: any) {
      console.error('Error creating employee:', err);
      setError(err.message || 'Failed to create employee');
      throw err; // Re-throw so caller can handle it
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      setError(null);
      const response = await fetch(`/api/hrms/employees/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update employee');
      }

      const updatedEmployee = await response.json();
      setEmployees(prev => prev.map(emp => emp.id === id ? updatedEmployee : emp));
    } catch (err: any) {
      console.error('Error updating employee:', err);
      setError(err.message || 'Failed to update employee');
      throw err; // Re-throw so caller can handle it
    }
  };

  const removeEmployee = async (id: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/hrms/employees/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete employee');
      }

      // Soft delete - update status to 'Exited'
      setEmployees(prev => prev.map(emp => emp.id === id ? { ...emp, status: 'Exited' } : emp));
    } catch (err: any) {
      console.error('Error deleting employee:', err);
      setError(err.message || 'Failed to delete employee');
      throw err; // Re-throw so caller can handle it
    }
  };

  const getEmployee = (id: string) => employees.find(e => e.id === id);

  const refreshEmployees = async () => {
    await fetchEmployees();
  };

  return (
    <EmployeeContext.Provider value={{ 
      employees, 
      loading, 
      error,
      addEmployee, 
      updateEmployee, 
      removeEmployee, 
      getEmployee,
      refreshEmployees
    }}>
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
