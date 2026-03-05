import React, { createContext, useContext, useState, ReactNode } from "react";
import { Lead, Interacao, MOCK_LEADS, MOCK_INTERACOES } from "@/data/mockData";

interface LeadContextType {
  leads: Lead[];
  interacoes: Interacao[];
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addInteracao: (interacao: Interacao) => void;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

export const LeadProvider = ({ children }: { children: ReactNode }) => {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [interacoes, setInteracoes] = useState<Interacao[]>(MOCK_INTERACOES);

  const addLead = (lead: Lead) => setLeads((prev) => [lead, ...prev]);
  const updateLead = (id: string, updates: Partial<Lead>) =>
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  const addInteracao = (interacao: Interacao) => setInteracoes((prev) => [interacao, ...prev]);

  return (
    <LeadContext.Provider value={{ leads, interacoes, addLead, updateLead, addInteracao }}>
      {children}
    </LeadContext.Provider>
  );
};

export const useLeads = () => {
  const context = useContext(LeadContext);
  if (!context) throw new Error("useLeads must be used within LeadProvider");
  return context;
};
