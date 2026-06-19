import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLeads } from "@/contexts/LeadContext";
import { getLeadWindowCutoff } from "@/lib/leadUtils";
import type { Lead } from "@/data/mockData";

export type ScopeAnchor = "any" | "data_entrada" | "checkin" | "data_agendamento";

interface Options {
  from: string | null; // inclusive YYYY-MM-DD; null = sem limite inferior
  to: string | null; // inclusive YYYY-MM-DD; null = sem limite superior
  anchor?: ScopeAnchor; // "any" = entrada OR agendamento OR checkin
  idUnidade?: string | null;
}

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
    visitas_loja: row.visitas_loja ?? 0,
    created_at: row.created_at,
  };
}

function matchScope(l: Lead, from: string | null, to: string | null, anchor: ScopeAnchor): boolean {
  if (!from && !to) return true;
  const after = (d?: string | null) => !from || (!!d && d.slice(0, 10) >= from);
  const before = (d?: string | null) => !to || (!!d && d.slice(0, 10) <= to);
  const inRange = (d?: string | null) => !!d && after(d) && before(d);
  if (anchor === "any" || !anchor) {
    return inRange(l.data_entrada) || inRange(l.data_agendamento) || inRange(l.checkin);
  }
  return inRange(l[anchor]);
}

// Cache module-level por chave para evitar refetch ao alternar abas no mesmo período.
const cache = new Map<string, { ts: number; rows: Lead[] }>();
const TTL = 60_000;

/**
 * Retorna leads cobrindo um período arbitrário.
 * - Se o período está totalmente dentro da janela do contexto → filtra context.leads (zero requests).
 * - Senão → fetch direcionado ao Supabase e merge com qualquer lead do contexto que case.
 */
export function useScopedLeads({ from, to, anchor = "any", idUnidade }: Options) {
  const { leads } = useLeads();
  const cutoff = useMemo(() => getLeadWindowCutoff(), []);
  // Janela cobre o período inteiro? (from precisa existir e ser >= cutoff)
  const fullyInWindow = !!from && from >= cutoff;
  const cacheKey = `${from || "*"}|${to || "*"}|${anchor}|${idUnidade || "*"}`;

  const [extra, setExtra] = useState<Lead[]>(() => cache.get(cacheKey)?.rows ?? []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (fullyInWindow) {
      setExtra([]);
      return;
    }
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < TTL) {
      setExtra(cached.rows);
      return;
    }
    let active = true;
    setLoading(true);
    (async () => {
      const queries: any[] = [];
      const apply = (col: "data_entrada" | "data_agendamento" | "checkin") => {
        let q = supabase.from("leads").select("*");
        if (idUnidade) q = q.eq("id_unidade", idUnidade);
        if (col === "checkin") {
          if (from) q = q.gte("checkin", `${from}T00:00:00`);
          if (to) q = q.lte("checkin", `${to}T23:59:59`);
        } else {
          if (from) q = q.gte(col, from);
          if (to) q = q.lte(col, to);
        }
        return q;
      };
      if (anchor === "any") {
        queries.push(apply("data_entrada"), apply("data_agendamento"), apply("checkin"));
      } else {
        queries.push(apply(anchor));
      }
      const results = await Promise.all(queries.map((q) => q));
      if (!active) return;
      const map = new Map<string, Lead>();
      for (const r of results) {
        if (r.error) {
          console.error("useScopedLeads fetch error:", r.error);
          continue;
        }
        for (const row of r.data || []) map.set(row.id, mapLead(row));
      }
      const rows = Array.from(map.values());
      cache.set(cacheKey, { ts: Date.now(), rows });
      setExtra(rows);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [fullyInWindow, cacheKey, from, to, anchor, idUnidade]);

  const rows = useMemo(() => {
    if (fullyInWindow) {
      return leads.filter((l) => {
        if (idUnidade && l.id_unidade !== idUnidade) return false;
        return matchScope(l, from, to, anchor);
      });
    }
    // Mescla context (pode conter leads pendentes não trazidos pelo fetch direcionado).
    const map = new Map<string, Lead>();
    for (const l of extra) {
      if (idUnidade && l.id_unidade !== idUnidade) continue;
      map.set(l.id, l);
    }
    for (const l of leads) {
      if (idUnidade && l.id_unidade !== idUnidade) continue;
      if (!matchScope(l, from, to, anchor)) continue;
      if (!map.has(l.id)) map.set(l.id, l);
      else map.set(l.id, l); // context é mais fresco que cache
    }
    return Array.from(map.values());
  }, [fullyInWindow, leads, extra, from, to, anchor, idUnidade]);

  return { rows, loading };
}

/** Limpa o cache (útil após mutações em massa). */
export function clearScopedLeadsCache() {
  cache.clear();
}