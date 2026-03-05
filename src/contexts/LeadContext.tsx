import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Lead, Interacao, Evento, MOCK_LEADS, MOCK_INTERACOES, MOCK_EVENTOS } from "@/data/mockData";

interface LeadContextType {
  leads: Lead[];
  interacoes: Interacao[];
  eventos: Evento[];
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  addInteracao: (interacao: Interacao) => void;
  addEvento: (evento: Evento) => void;
  concluirEvento: (eventoId: string, descricao: string, userId: string) => void;
  generateFollowups: (leadId: string) => void;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

export const LeadProvider = ({ children }: { children: ReactNode }) => {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [interacoes, setInteracoes] = useState<Interacao[]>(MOCK_INTERACOES);
  const [eventos, setEventos] = useState<Evento[]>(MOCK_EVENTOS);

  const addLead = (lead: Lead) => setLeads((prev) => [lead, ...prev]);
  const updateLead = (id: string, updates: Partial<Lead>) =>
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  const addInteracao = (interacao: Interacao) => setInteracoes((prev) => [interacao, ...prev]);
  const addEvento = (evento: Evento) => setEventos((prev) => [...prev, evento]);

  const concluirEvento = useCallback((eventoId: string, descricao: string, userId: string) => {
    const now = new Date().toISOString();
    setEventos((prev) =>
      prev.map((e) =>
        e.id === eventoId
          ? { ...e, concluido: true, data_conclusao: now, descricao_conclusao: descricao, id_usuario: userId }
          : e
      )
    );
    // Find the event to add interaction
    const evento = eventos.find((e) => e.id === eventoId);
    if (evento) {
      addInteracao({
        id: `i${Date.now()}`,
        id_lead: evento.id_lead,
        tipo: "evento_concluido",
        descricao: `Follow-up ${evento.numero} concluído: ${descricao}`,
        data: now,
        id_usuario: userId,
      });
    }
  }, [eventos]);

  const generateFollowups = useCallback((leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const entryDate = new Date(lead.data_entrada);
    entryDate.setHours(0, 0, 0, 0);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((todayDate.getTime() - entryDate.getTime()) / 86400000);

    const existingEventNums = eventos.filter((e) => e.id_lead === leadId).map((e) => e.numero);

    for (let i = 1; i <= Math.min(daysDiff, 7); i++) {
      if (!existingEventNums.includes(i)) {
        const eventDate = new Date(entryDate);
        eventDate.setDate(eventDate.getDate() + i);
        addEvento({
          id: `ev-${leadId}-${i}`,
          id_lead: leadId,
          tipo: "followup",
          numero: i,
          data_prevista: eventDate.toISOString().split("T")[0],
          concluido: false,
          id_usuario: lead.id_agente,
        });
      }
    }

    // Auto-disqualify after 7 followups all concluded and still "novo"
    if (daysDiff > 7 && lead.etapa === "novo") {
      const leadEvents = eventos.filter((e) => e.id_lead === leadId);
      const allDone = leadEvents.length >= 7 && leadEvents.every((e) => e.concluido);
      if (allDone) {
        updateLead(leadId, { etapa: "desqualificado" });
        addInteracao({
          id: `i${Date.now()}`,
          id_lead: leadId,
          tipo: "mudanca_etapa",
          descricao: "Lead desqualificado automaticamente após 7 follow-ups sem resposta",
          data: new Date().toISOString(),
          id_usuario: "system",
        });
      }
    }
  }, [leads, eventos]);

  return (
    <LeadContext.Provider value={{ leads, interacoes, eventos, addLead, updateLead, addInteracao, addEvento, concluirEvento, generateFollowups }}>
      {children}
    </LeadContext.Provider>
  );
};

export const useLeads = () => {
  const context = useContext(LeadContext);
  if (!context) throw new Error("useLeads must be used within LeadProvider");
  return context;
};
