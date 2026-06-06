import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];

    // New cadence (reduced load):
    //   novo:       4 FUPs, gaps [1, 2, 3, 4] days
    //   agendado:   3 FUPs, gaps [0, 1, 3] days (FUP1 on appointment day)
    //   dispensado: 4 FUPs, gaps [1, 2, 3, 4] days from `dispensado_em`
    // Next FUP is generated only after the previous one is concluded.
    const GAPS: Record<string, number[]> = {
      novo: [1, 2, 3, 4],
      agendado: [0, 1, 3],
      dispensado: [1, 2, 3, 4],
    };
    const MAX: Record<string, number> = { novo: 4, agendado: 3, dispensado: 4 };
    const FINAL: Record<string, string> = {
      novo: "trabalhado",
      agendado: "desqualificado_agendado",
      dispensado: "analise_supervisor",
    };

    const categoryOf = (etapa: string): "novo" | "agendado" | "dispensado" | null => {
      if (etapa === "novo") return "novo";
      if (etapa === "agendado" || etapa === "reagendado") return "agendado";
      if (etapa === "dispensado") return "dispensado";
      return null;
    };

    // Paginate to bypass PostgREST 1000-row default limit
    const PAGE = 1000;
    const leads: any[] = [];
    {
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("leads")
          .select("id, etapa, data_entrada, data_agendamento, dispensado_em, checkin, id_agente, fup_concluido")
          .eq("fup_concluido", false)
          .or("etapa.eq.novo,etapa.eq.agendado,etapa.eq.reagendado,etapa.eq.dispensado")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        leads.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
    }
    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ message: "No eligible leads", generated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter eligible leads based on category
    const eligible = leads.filter((lead) => {
      if (lead.fup_concluido) return false;
      const cat = categoryOf(lead.etapa);
      if (!cat) return false;
      if (cat === "novo") return lead.data_entrada < today;
      if (cat === "agendado") {
        if (!lead.data_agendamento) return false;
        // reagendado: cliente já passou pela loja anteriormente; checkin antigo não bloqueia
        if (lead.etapa === "reagendado") return true;
        return !lead.checkin;
      }
      if (cat === "dispensado") return true;
      return false;
    });

    if (eligible.length === 0) {
      return new Response(JSON.stringify({ message: "No eligible leads", generated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all eventos for eligible leads, chunked to avoid URL length + 1000-row limit
    const leadIds = eligible.map((l) => l.id);
    const eventos: any[] = [];
    const CHUNK = 200;
    for (let i = 0; i < leadIds.length; i += CHUNK) {
      const slice = leadIds.slice(i, i + CHUNK);
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("eventos")
          .select("id, id_lead, numero, concluido, data_conclusao")
          .in("id_lead", slice)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        eventos.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
    }

    let generated = 0;
    let statusChanged = 0;

    const addDays = (isoDate: string, days: number): string => {
      const d = new Date(isoDate + (isoDate.length === 10 ? "T00:00:00" : ""));
      d.setDate(d.getDate() + days);
      return d.toISOString().split("T")[0];
    };

    for (const lead of eligible) {
      const cat = categoryOf(lead.etapa)!;
      const leadEventos = (eventos || []).filter((e) => e.id_lead === lead.id);
      const hasPending = leadEventos.some((e) => !e.concluido);
      if (hasPending) continue;

      const maxExisting = leadEventos.length > 0
        ? Math.max(...leadEventos.map((e) => e.numero))
        : 0;

      const maxForCat = MAX[cat];

      if (maxExisting >= maxForCat) {
        await supabase.from("leads").update({
          fup_concluido: true,
          fup_concluido_em: new Date().toISOString(),
          fup_concluido_numero: maxForCat,
          fup_motivo_conclusao: `Processo completo (${maxForCat} follow-ups)`,
          etapa: FINAL[cat],
        }).eq("id", lead.id);
        statusChanged++;
        continue;
      }

      const nextNum = maxExisting + 1; // 1-based
      const gap = GAPS[cat][nextNum - 1] ?? 1;
      let eventDateStr: string;

      if (nextNum === 1) {
        let anchorDate: string;
        if (cat === "novo") {
          anchorDate = lead.data_entrada;
        } else if (cat === "agendado") {
          anchorDate = lead.data_agendamento || lead.data_entrada;
        } else {
          // dispensado: use dispensado_em (date part), fallback to data_entrada
          anchorDate = (lead.dispensado_em ? lead.dispensado_em.slice(0, 10) : lead.data_entrada);
        }
        eventDateStr = addDays(anchorDate, gap);
      } else if (cat === "agendado") {
        // Para agendado, ancorar sempre na data_agendamento atual (suporta reagendamentos)
        const baseDate = lead.data_agendamento || lead.data_entrada;
        eventDateStr = addDays(baseDate, gap);
      } else {
        const lastConcluded = leadEventos
          .filter((e) => e.concluido && e.data_conclusao)
          .sort((a, b) => (b.data_conclusao || "").localeCompare(a.data_conclusao || ""))[0];
        if (!lastConcluded || !lastConcluded.data_conclusao) continue;
        eventDateStr = addDays(lastConcluded.data_conclusao.slice(0, 10), gap);
      }

      if (eventDateStr > today) continue;

      let descricao = "";
      if (cat === "novo") {
        descricao = `Follow-up ${nextNum}/${maxForCat}: Ligar para agendar`;
      } else if (cat === "agendado") {
        descricao = nextNum === 1
          ? `Follow-up ${nextNum}/${maxForCat}: Lembrar cliente do agendamento`
          : `Follow-up ${nextNum}/${maxForCat}: Cliente não compareceu - resgatar`;
      } else {
        descricao = `Follow-up ${nextNum}/${maxForCat}: Resgatar cliente dispensado`;
      }

      const { error: insertErr } = await supabase.from("eventos").insert({
        id_lead: lead.id,
        tipo: "followup",
        numero: nextNum,
        data_prevista: eventDateStr,
        concluido: false,
        id_usuario: lead.id_agente,
        descricao,
      });

      if (!insertErr) generated++;
    }

    return new Response(
      JSON.stringify({ message: "Done", generated, statusChanged, eligible: eligible.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
