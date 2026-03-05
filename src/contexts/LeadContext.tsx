import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Lead, Interacao, Evento, Unidade } from "@/data/mockData";

interface LeadContextType {
  leads: Lead[];
  interacoes: Interacao[];
  eventos: Evento[];
  unidades: Unidade[];
  profiles: { id: string; nome: string; cargo: string; unidade_padrao?: string | null }[];
  loading: boolean;
  addLead: (lead: Omit<Lead, "id">) => Promise<string | null>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  addInteracao: (interacao: Omit<Interacao, "id">) => Promise<void>;
  addEvento: (evento: Omit<Evento, "id">) => Promise<void>;
  concluirEvento: (eventoId: string, descricao: string, userId: string) => Promise<void>;
  generateFollowups: (leadId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

export const LeadProvider = ({ children }: { children: ReactNode }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; nome: string; cargo: string; unidade_padrao?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [leadsRes, eventosRes, interacoesRes, unidadesRes, profilesRes] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase.from("eventos").select("*").order("data_prevista", { ascending: true }),
      supabase.from("interacoes").select("*").order("data", { ascending: false }),
      supabase.from("unidades").select("*").order("nome"),
      supabase.from("profiles").select("id, nome, cargo, unidade_padrao"),
    ]);

    if (leadsRes.data) setLeads(leadsRes.data.map(mapLead));
    if (eventosRes.data) setEventos(eventosRes.data.map(mapEvento));
    if (interacoesRes.data) setInteracoes(interacoesRes.data.map(mapInteracao));
    if (unidadesRes.data) setUnidades(unidadesRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();

    // Realtime subscriptions
    const channel = supabase
      .channel("lead-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "eventos" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "interacoes" }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const addLead = async (lead: Omit<Lead, "id">): Promise<string | null> => {
    const { data, error } = await supabase.from("leads").insert({
      nome: lead.nome,
      telefone: lead.telefone,
      origem: lead.origem,
      etapa: lead.etapa,
      data_entrada: lead.data_entrada,
      id_agente: lead.id_agente,
      id_unidade: lead.id_unidade || null,
      data_agendamento: lead.data_agendamento || null,
      numero_os: lead.numero_os || null,
      valor_servico: lead.valor_servico || null,
      tags_servico: lead.tags_servico || null,
      checkin: lead.checkin || null,
      checkout: lead.checkout || null,
      is_porta: lead.is_porta || false,
    }).select("id").single();
    if (error) { console.error("addLead error:", error); return null; }
    return data?.id || null;
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const { error } = await supabase.from("leads").update(updates).eq("id", id);
    if (error) console.error("updateLead error:", error);
  };

  const addInteracao = async (interacao: Omit<Interacao, "id">) => {
    const { error } = await supabase.from("interacoes").insert({
      id_lead: interacao.id_lead,
      tipo: interacao.tipo,
      descricao: interacao.descricao,
      data: interacao.data,
      id_usuario: interacao.id_usuario,
    });
    if (error) console.error("addInteracao error:", error);
  };

  const addEvento = async (evento: Omit<Evento, "id">) => {
    const { error } = await supabase.from("eventos").insert({
      id_lead: evento.id_lead,
      tipo: evento.tipo,
      numero: evento.numero,
      data_prevista: evento.data_prevista,
      concluido: evento.concluido,
      id_usuario: evento.id_usuario || null,
    });
    if (error) console.error("addEvento error:", error);
  };

  const concluirEvento = useCallback(async (eventoId: string, descricao: string, userId: string) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from("eventos").update({
      concluido: true,
      data_conclusao: now,
      descricao_conclusao: descricao,
      id_usuario: userId,
    }).eq("id", eventoId);
    if (error) { console.error("concluirEvento error:", error); return; }

    const evento = eventos.find((e) => e.id === eventoId);
    if (evento) {
      await addInteracao({
        id_lead: evento.id_lead,
        tipo: "evento_concluido",
        descricao: `Follow-up ${evento.numero} concluído: ${descricao}`,
        data: now,
        id_usuario: userId,
      });
    }
  }, [eventos]);

  const generateFollowups = useCallback(async (leadId: string) => {
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
        await addEvento({
          id_lead: leadId,
          tipo: "followup",
          numero: i,
          data_prevista: eventDate.toISOString().split("T")[0],
          concluido: false,
          id_usuario: lead.id_agente,
        });
      }
    }

    if (daysDiff > 7 && lead.etapa === "novo") {
      const leadEvents = eventos.filter((e) => e.id_lead === leadId);
      const allDone = leadEvents.length >= 7 && leadEvents.every((e) => e.concluido);
      if (allDone) {
        await updateLead(leadId, { etapa: "desqualificado" });
        await addInteracao({
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
    <LeadContext.Provider value={{
      leads, interacoes, eventos, unidades, profiles, loading,
      addLead, updateLead, addInteracao, addEvento, concluirEvento, generateFollowups,
      refreshAll: fetchAll,
    }}>
      {children}
    </LeadContext.Provider>
  );
};

export const useLeads = () => {
  const context = useContext(LeadContext);
  if (!context) throw new Error("useLeads must be used within LeadProvider");
  return context;
};

// Mappers from DB row to app types
function mapLead(row: any): Lead {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone,
    origem: row.origem,
    etapa: row.etapa,
    data_entrada: row.data_entrada,
    id_agente: row.id_agente,
    id_unidade: row.id_unidade,
    data_agendamento: row.data_agendamento,
    numero_os: row.numero_os,
    valor_servico: row.valor_servico ? Number(row.valor_servico) : null,
    tags_servico: row.tags_servico,
    checkin: row.checkin,
    checkout: row.checkout,
    is_porta: row.is_porta,
  };
}

function mapEvento(row: any): Evento {
  return {
    id: row.id,
    id_lead: row.id_lead,
    tipo: row.tipo as "followup",
    numero: row.numero,
    data_prevista: row.data_prevista,
    concluido: row.concluido,
    data_conclusao: row.data_conclusao,
    descricao_conclusao: row.descricao_conclusao,
    id_usuario: row.id_usuario,
  };
}

function mapInteracao(row: any): Interacao {
  return {
    id: row.id,
    id_lead: row.id_lead,
    tipo: row.tipo,
    descricao: row.descricao,
    data: row.data,
    id_usuario: row.id_usuario,
  };
}
