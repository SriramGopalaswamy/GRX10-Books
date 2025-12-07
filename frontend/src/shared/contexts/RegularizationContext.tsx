
import React, { createContext, useContext, useState, useEffect } from 'react';
import { RegularizationRequest, LeaveStatus } from '../types';
import { MOCK_REGULARIZATIONS } from '../constants/app.constants';

interface RegularizationContextType {
  requests: RegularizationRequest[];
  addRequest: (req: RegularizationRequest) => void;
  updateRequestStatus: (id: string, status: LeaveStatus) => void;
}

const RegularizationContext = createContext<RegularizationContextType | undefined>(undefined);

export const RegularizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<RegularizationRequest[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('grx10_regularizations');
    if (saved) {
      setRequests(JSON.parse(saved));
    } else {
      setRequests(MOCK_REGULARIZATIONS);
    }
  }, []);

  useEffect(() => {
    if (requests.length > 0) {
      localStorage.setItem('grx10_regularizations', JSON.stringify(requests));
    }
  }, [requests]);

  const addRequest = (req: RegularizationRequest) => {
    setRequests(prev => [req, ...prev]);
  };

  const updateRequestStatus = (id: string, status: LeaveStatus) => {
    setRequests(prev => prev.map(req => req.id === id ? { ...req, status } : req));
  };

  return (
    <RegularizationContext.Provider value={{ requests, addRequest, updateRequestStatus }}>
      {children}
    </RegularizationContext.Provider>
  );
};

export const useRegularization = () => {
  const context = useContext(RegularizationContext);
  if (!context) {
    throw new Error("useRegularization must be used within a RegularizationProvider");
  }
  return context;
};
