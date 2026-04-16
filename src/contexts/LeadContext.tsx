import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/contexts/RoleContext";
import type { Lead, Evento, Unidade } from "@/data/mockData";

interface AgentUnidade {
  id: string;
  id_agente: string;
  id_unidade: string;
}

interface LeadContextType {
  leads: Lead[];
  eventos: Evento[];
  unidades: Unidade[];
  profiles: { id: string; nome: string; cargo: string; unidade_padrao?: string | null }[];
  agentUnidades: AgentUnidade[];
  loading: boolean;
  addLead: (lead: Omit<Lead, "id">) => Promise<string | null>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  addEvento: (evento: Omit<Evento, "id">) => Promise<void>;
  concluirEvento: (eventoId: string, descricao: string, userId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const LeadContext = createContext<LeadContextType | undefined>(undefined);

/** Fetch all rows from a query using .range() pagination to bypass the 1000-row PostgREST limit */
async function fetchAllRows<T>(queryBuilder: any, maxRows = 10000): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;
  const PAGE = 1000;
  while (from < maxRows) {
    const { data, error } = await queryBuilder.range(from, from + PAGE - 1);
    if (error) { console.error("fetchAllRows error:", error); break; }
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return allRows;
}

export const LeadProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useRole();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [profiles, setProfiles] = useState<{ id: string; nome: string; cargo: string; unidade_padrao?: string | null }[]>([]);
  const [agentUnidades, setAgentUnidades] = useState<AgentUnidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const CACHE_TTL = 30_000;
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
    // For gestor/supervisor — no date filter, pagination handles the limit
    return query;
  }, []);

  const buildEventosQuery = useCallback(() => {
    const user = currentUserRef.current;
    let query = supabase.from("eventos").select("*").order("data_prevista", { ascending: true });
    if (user?.cargo === "agente") {
      query = query.eq("id_usuario", user.id);
    }
    if (user?.cargo === "recepcionista") {
      query = query.eq("concluido", false);
    }
    return query;
  }, []);

  const fetchAll = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && lastFetchRef.current && now - lastFetchRef.current < CACHE_TTL) {
      return;
    }

    const user = currentUserRef.current;
    const needsPagination =
      user?.cargo === "gestor" ||
      user?.cargo === "supervisor" ||
      user?.cargo === "agente";

    const [leadsData, eventosData, unidadesRes, profilesRes, agentUnidadesRes] = await Promise.all([
      needsPagination
        ? fetchAllRows<any>(buildLeadsQuery())
        : buildLeadsQuery().then((r: any) => r.data || []),
      needsPagination
        ? fetchAllRows<any>(buildEventosQuery())
        : buildEventosQuery().then((r: any) => r.data || []),
      supabase.from("unidades").select("*").order("nome"),
      supabase.from("profiles").select("id, nome, cargo, unidade_padrao"),
      supabase.from("agente_unidades").select("*"),
    ]);

    setLeads(leadsData.map(mapLead));
    setEventos(eventosData.map(mapEvento));
    if (unidadesRes.data) setUnidades(unidadesRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (agentUnidadesRes.data) setAgentUnidades(agentUnidadesRes.data as AgentUnidade[]);
    lastFetchRef.current = Date.now();
    setLoading(false);
  }, [buildLeadsQuery, buildEventosQuery]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setAuthUserId(session.user.id);
      } else {
        setAuthUserId(null);
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

  // Realtime ONLY for agents
  useEffect(() => {
    if (!authUserId) return;
    const user = currentUserRef.current;
    if (user?.cargo !== "agente" && user?.cargo !== "recepcionista") return;

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
  }, [authUserId, currentUser?.cargo]);

  const handleRealtimeEvent = useCallback((table: string, payload: any) => {
    const { eventType, new: newRow, old: oldRow } = payload;
    const user = currentUserRef.current;

    if (table === "leads") {
      if (eventType === "INSERT") {
        const lead = mapLead(newRow);
        if (user?.cargo === "agente" && lead.id_agente !== user.id) return;
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
      notas: (lead as any).notas || null,
      id_recepcionista: (lead as any).id_recepcionista || null,
    }).select("*").single();
    if (error) { console.error("addLead error:", error); return null; }
    if (data) {
      const newLead = mapLead(data);
      setLeads((prev) => [newLead, ...prev]);
      lastFetchRef.current = 0;
    }
    return data?.id || null;
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...updates } : l));
    lastFetchRef.current = 0;
    const { error } = await supabase.from("leads").update(updates).eq("id", id);
    if (error) {
      console.error("updateLead error:", error);
      fetchAll(true);
    }
  };

  const deleteLead = async (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setEventos((prev) => prev.filter((e) => e.id_lead !== id));
    lastFetchRef.current = 0;
    await supabase.from("eventos").delete().eq("id_lead", id);
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) {
      console.error("deleteLead error:", error);
      fetchAll(true);
    }
  };

  const addEvento = async (evento: Omit<Evento, "id">) => {
    const { data, error } = await supabase.from("eventos").insert({
      id_lead: evento.id_lead,
      tipo: evento.tipo,
      numero: evento.numero,
      data_prevista: evento.data_prevista,
      concluido: evento.concluido,
      id_usuario: evento.id_usuario || null,
      descricao: evento.descricao || null,
    }).select("*").single();
    if (error) {
      console.error("addEvento error:", error);
    } else if (data) {
      const newEvento = mapEvento(data);
      setEventos((prev) => [...prev, newEvento].sort((a, b) => a.data_prevista.localeCompare(b.data_prevista)));
    }
  };

  const concluirEvento = useCallback(async (eventoId: string, descricao: string, userId: string) => {
    const now = new Date().toISOString();
    setEventos((prev) => prev.map((e) => e.id === eventoId ? { ...e, concluido: true, data_conclusao: now, descricao_conclusao: descricao, id_usuario: userId } : e));
    const { error } = await supabase.from("eventos").update({
      concluido: true,
      data_conclusao: now,
      descricao_conclusao: descricao,
      id_usuario: userId,
    }).eq("id", eventoId);
    if (error) {
      console.error("concluirEvento error:", error);
      fetchAll(true);
    }
  }, [fetchAll]);

  return (
    <LeadContext.Provider value={{
      leads, eventos, unidades, profiles, agentUnidades, loading,
      addLead, updateLead, deleteLead, addEvento, concluirEvento,
      refreshAll: () => fetchAll(true),
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
    id_recepcionista: row.id_recepcionista,
    data_agendamento: row.data_agendamento,
    numero_os: row.numero_os,
    valor_servico: row.valor_servico ? Number(row.valor_servico) : null,
    tags_servico: row.tags_servico,
    checkin: row.checkin,
    checkout: row.checkout,
    is_porta: row.is_porta,
    notas: row.notas,
    tags_motivo: row.tags_motivo,
    fup_concluido: row.fup_concluido || false,
    fup_concluido_em: row.fup_concluido_em,
    fup_concluido_numero: row.fup_concluido_numero,
    fup_motivo_conclusao: row.fup_motivo_conclusao,
    created_at: row.created_at,
  };
}

function mapEvento(row: any): Evento {
  return {
    id: row.id,
    id_lead: row.id_lead,
    tipo: row.tipo as "followup" | "lembrete",
    numero: row.numero,
    data_prevista: row.data_prevista,
    concluido: row.concluido,
    data_conclusao: row.data_conclusao,
    descricao_conclusao: row.descricao_conclusao,
    descricao: row.descricao,
    id_usuario: row.id_usuario,
  };
}
