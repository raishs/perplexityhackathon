import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CompanyContextType {
  company: string;
  setCompany: (c: string) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompany] = useState('Perplexity');
  return (
    <CompanyContext.Provider value={{ company, setCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used within a CompanyProvider');
  return ctx;
} 