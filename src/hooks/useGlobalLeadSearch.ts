import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mapLead } from "@/hooks/useScopedLeads";
import type { Lead } from "@/data/mockData";

/**
 * Busca direta em todo o histórico de leads (sem janela de datas), igual à trava de duplicidade.
 * Ativa a partir de 3 caracteres, com debounce. Permissões ficam por conta do RLS;
 * `agentId` restringe aos leads do agente.
 */
export function useGlobalLeadSearch(query: string, agentId?: string | null) {
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onUpd = (e: Event) => {
      const { id, updates } = (e as CustomEvent).detail || {};
      if (!id) return;
      setRows((prev) => prev.some((l) => l.id === id) ? prev.map((l) => (l.id === id ? { ...l, ...updates } : l)) : prev);
    };
    window.addEventListener("lead-updated", onUpd);
    return () => window.removeEventListener("lead-updated", onUpd);
  }, []);
  const q = query.trim();
  const active = q.length >= 3;

  useEffect(() => {
    if (!active) { setRows([]); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const safe = q.replace(/[%,()*]/g, " ").trim();
      const digits = q.replace(/\D/g, "");
      const ors = [`nome.ilike.%${safe}%`, `numero_os.ilike.%${safe}%`];
      if (digits.length >= 3) {
        // casa com telefones formatados ou não; tolera ausência do 9º dígito
        ors.push(`telefone.ilike.%${digits.split("").join("%")}%`);
        if (digits.length >= 10) {
          const alt = digits.length === 11 ? digits.slice(0, 2) + digits.slice(3) : digits.slice(0, 2) + "9" + digits.slice(2);
          ors.push(`telefone.ilike.%${alt.split("").join("%")}%`);
        }
      }
      let req = supabase.from("leads").select("*").or(ors.join(",")).order("created_at", { ascending: false }).limit(200);
      if (agentId) req = req.eq("id_agente", agentId);
      const { data } = await req;
      if (!cancelled) { setRows((data || []).map(mapLead)); setLoading(false); }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, active, agentId]);

  return { active, rows, loading };
}
