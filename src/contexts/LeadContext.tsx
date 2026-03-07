import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import type { Lead, Evento, Unidade } from "@/data/mockData";

interface LeadContextType {
  leads: Lead[];
  eventos: Evento[];
  unidades: Unidade[];
  profiles: { id: string; nome: string; cargo: string; unidade_padrao?: string | null }[];
  loading: boolean;
  addLead: (lead: Omit<Lead, "id">) => Promise<string | null>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  addEvento: (evento: Omit<Evento, "id">) => Promise<void>;
  concluirEvento: (eventoId: string, descricao: string, userId: string) => Promise<void>;
  generateFollowups: (leadId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

export const LeadProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useRole();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; nome: string; cargo: string; unidade_padrao?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const autoGenForUserRef = useRef<string | null>(null);
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const buildLeadsQuery = useCallback(() => {
    const user = currentUserRef.current;
    let query = supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (user?.cargo === "agente") {
      query = query.eq("id_agente", user.id);
    }
    if (user?.cargo === "recepcionista" && user.unidade_padrao) {
      query = query.eq("id_unidade", user.unidade_padrao);
    }
    return query;
  }, []);

  const buildEventosQuery = useCallback(() => {
    const user = currentUserRef.current;
    let query = supabase.from("eventos").select("*").order("data_prevista", { ascending: true });
    if (user?.cargo === "agente") {
      query = query.eq("id_usuario", user.id);
    }
    return query;
  }, []);

  const fetchAll = useCallback(async () => {
    const [leadsRes, eventosRes, unidadesRes, profilesRes] = await Promise.all([
      buildLeadsQuery(),
      buildEventosQuery(),
      supabase.from("unidades").select("*").order("nome"),
      supabase.from("profiles").select("id, nome, cargo, unidade_padrao"),
    ]);

    if (leadsRes.data) setLeads(leadsRes.data.map(mapLead));
    if (eventosRes.data) setEventos(eventosRes.data.map(mapEvento));
    if (unidadesRes.data) setUnidades(unidadesRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
    setLoading(false);
  }, [buildLeadsQuery, buildEventosQuery]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthUserId(session.user.id);
      } else {
        setAuthUserId(null);
        autoGenForUserRef.current = null;
        setLeads([]);
        setEventos([]);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthUserId(session.user.id);
      } else {
        setAuthUserId(null);
        autoGenForUserRef.current = null;
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authUserId && currentUser) {
      fetchAll();
    }
  }, [authUserId, currentUser, fetchAll]);

  // Realtime only for leads and eventos (no interacoes)
  useEffect(() => {
    if (!authUserId) return;

    const channel = supabase
      .channel("lead-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, (payload) => {
        handleRealtimeEvent("leads", payload);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "eventos" }, (payload) => {
        handleRealtimeEvent("eventos", payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUserId]);

  const handleRealtimeEvent = useCallback((table: string, payload: any) => {
    const { eventType, new: newRow, old: oldRow } = payload;
    const user = currentUserRef.current;

    if (table === "leads") {
      if (eventType === "INSERT") {
        const lead = mapLead(newRow);
        if (user?.cargo === "agente" && lead.id_agente !== user.id) return;
        if (user?.cargo === "recepcionista" && user.unidade_padrao && lead.id_unidade !== user.unidade_padrao) return;
        setLeads((prev) => prev.some((l) => l.id === lead.id) ? prev : [lead, ...prev]);
      } else if (eventType === "UPDATE") {
        const lead = mapLead(newRow);
        setLeads((prev) => prev.map((l) => l.id === lead.id ? lead : l));
      } else if (eventType === "DELETE") {
        setLeads((prev) => prev.filter((l) => l.id !== oldRow.id));
      }
    } else if (table === "eventos") {
      if (eventType === "INSERT") {
        const evento = mapEvento(newRow);
        if (user?.cargo === "agente" && evento.id_usuario !== user.id) return;
        setEventos((prev) => {
          if (prev.some((e) => e.id === evento.id)) return prev;
          return [...prev, evento].sort((a, b) => a.data_prevista.localeCompare(b.data_prevista));
        });
      } else if (eventType === "UPDATE") {
        const evento = mapEvento(newRow);
        setEventos((prev) => prev.map((e) => e.id === evento.id ? evento : e));
      } else if (eventType === "DELETE") {
        setEventos((prev) => prev.filter((e) => e.id !== oldRow.id));
      }
    }
  }, []);

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

  const addEvento = async (evento: Omit<Evento, "id">) => {
    const { data, error } = await supabase.from("eventos").insert({
      id_lead: evento.id_lead,
      tipo: evento.tipo,
      numero: evento.numero,
      data_prevista: evento.data_prevista,
      concluido: evento.concluido,
      id_usuario: evento.id_usuario || null,
    }).select("*").single();
    if (error) {
      console.error("addEvento error:", error);
      return;
    }
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
  }, []);

  const generateFollowups = useCallback(async (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const leadEventos = eventos.filter((e) => e.id_lead === leadId);
    const hasPending = leadEventos.some((e) => !e.concluido);
    if (hasPending) return;

    const maxExisting = leadEventos.length > 0
      ? Math.max(...leadEventos.map((e) => e.numero))
      : 0;

    if (maxExisting >= 7) {
      if (lead.etapa === "novo") {
        await updateLead(leadId, { etapa: "desqualificado" });
      }
      return;
    }

    const nextNum = maxExisting + 1;
    const todayStr = new Date().toISOString().split("T")[0];

    if (nextNum === 1) {
      const entryDate = new Date(lead.data_entrada + "T00:00:00");
      const nextDay = new Date(entryDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const eventDateStr = nextDay.toISOString().split("T")[0];
      if (eventDateStr > todayStr) return;

      await addEvento({
        id_lead: leadId,
        tipo: "followup",
        numero: nextNum,
        data_prevista: eventDateStr,
        concluido: false,
        id_usuario: lead.id_agente,
      });
    } else {
      const lastConcluded = leadEventos
        .filter((e) => e.concluido && e.data_conclusao)
        .sort((a, b) => (b.data_conclusao || "").localeCompare(a.data_conclusao || ""))
        [0];

      if (!lastConcluded || !lastConcluded.data_conclusao) return;

      const conclusionDate = new Date(lastConcluded.data_conclusao);
      const nextDay = new Date(conclusionDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const eventDateStr = nextDay.toISOString().split("T")[0];
      if (eventDateStr > todayStr) return;

      await addEvento({
        id_lead: leadId,
        tipo: "followup",
        numero: nextNum,
        data_prevista: eventDateStr,
        concluido: false,
        id_usuario: lead.id_agente,
      });
    }
  }, [leads, eventos]);

  // Auto-generate follow-ups once per session after data loads
  const autoGenerateFollowups = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];

    const eligibleLeads = leads.filter((lead) => {
      if (lead.etapa === "novo" && lead.data_entrada < today) return true;
      if (lead.etapa === "agendado" && lead.data_agendamento && lead.data_agendamento < today && !lead.checkin) return true;
      return false;
    });

    if (eligibleLeads.length === 0) return;

    await Promise.all(eligibleLeads.map((lead) => generateFollowups(lead.id)));
  }, [leads, eventos, generateFollowups]);

  // Run auto-gen once per user session
  useEffect(() => {
    if (!loading && leads.length > 0 && authUserId && autoGenForUserRef.current !== authUserId) {
      autoGenForUserRef.current = authUserId;
      void autoGenerateFollowups();
    }
  }, [loading, leads.length, authUserId, autoGenerateFollowups]);

  return (
    <LeadContext.Provider value={{
      leads, eventos, unidades, profiles, loading,
      addLead, updateLead, addEvento, concluirEvento, generateFollowups,
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