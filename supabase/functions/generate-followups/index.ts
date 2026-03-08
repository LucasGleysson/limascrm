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

    // Three followup scenarios:
    // 1. novo: lead never scheduled → followup to get them to schedule
    // 2. agendado/reagendado: scheduled but didn't show up (no-show) → followup
    // 3. dispensado: went to store but was dispensed → rescue followup

    const { data: leads, error: leadsErr } = await supabase
      .from("leads")
      .select("id, etapa, data_entrada, data_agendamento, checkin, id_agente")
      .or("etapa.eq.novo,etapa.eq.agendado,etapa.eq.reagendado,etapa.eq.dispensado");

    if (leadsErr) throw leadsErr;
    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ message: "No eligible leads", generated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter eligible leads based on their scenario
    const eligible = leads.filter((lead) => {
      // Scenario 1: novo lead, at least 1 day old
      if (lead.etapa === "novo" && lead.data_entrada < today) return true;
      // Scenario 2: agendado/reagendado, appointment date passed, no checkin
      if (["agendado", "reagendado"].includes(lead.etapa) && lead.data_agendamento && lead.data_agendamento < today && !lead.checkin) return true;
      // Scenario 3: dispensado, needs rescue followup
      if (lead.etapa === "dispensado") return true;
      return false;
    });

    if (eligible.length === 0) {
      return new Response(JSON.stringify({ message: "No eligible leads", generated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all eventos for eligible leads in one query
    const leadIds = eligible.map((l) => l.id);
    const { data: eventos, error: eventosErr } = await supabase
      .from("eventos")
      .select("id, id_lead, numero, concluido, data_conclusao")
      .in("id_lead", leadIds);

    if (eventosErr) throw eventosErr;

    let generated = 0;
    let statusChanged = 0;

    for (const lead of eligible) {
      const leadEventos = (eventos || []).filter((e) => e.id_lead === lead.id);
      const hasPending = leadEventos.some((e) => !e.concluido);
      if (hasPending) continue;

      const maxExisting = leadEventos.length > 0
        ? Math.max(...leadEventos.map((e) => e.numero))
        : 0;

      if (maxExisting >= 7) {
        // After 7 followups, mark as final status based on scenario
        if (lead.etapa === "novo") {
          await supabase.from("leads").update({ etapa: "desqualificado_novo" }).eq("id", lead.id);
          statusChanged++;
        } else if (["agendado", "reagendado"].includes(lead.etapa)) {
          await supabase.from("leads").update({ etapa: "desqualificado_agendado" }).eq("id", lead.id);
          statusChanged++;
        } else if (lead.etapa === "dispensado") {
          await supabase.from("leads").update({ etapa: "perdido" }).eq("id", lead.id);
          statusChanged++;
        }
        continue;
      }

      const nextNum = maxExisting + 1;
      let eventDateStr: string;

      if (nextNum === 1) {
        // First followup: 1 day after the triggering event
        let refDate: string;
        if (lead.etapa === "novo") {
          refDate = lead.data_entrada;
        } else if (["agendado", "reagendado"].includes(lead.etapa)) {
          refDate = lead.data_agendamento || lead.data_entrada;
        } else {
          // dispensado: use today as reference for first rescue followup
          refDate = today;
        }
        const entryDate = new Date(refDate + "T00:00:00");
        const nextDay = new Date(entryDate);
        nextDay.setDate(nextDay.getDate() + 1);
        eventDateStr = nextDay.toISOString().split("T")[0];
        if (eventDateStr > today) continue;
      } else {
        const lastConcluded = leadEventos
          .filter((e) => e.concluido && e.data_conclusao)
          .sort((a, b) => (b.data_conclusao || "").localeCompare(a.data_conclusao || ""))
          [0];

        if (!lastConcluded || !lastConcluded.data_conclusao) continue;

        const conclusionDate = new Date(lastConcluded.data_conclusao);
        const nextDay = new Date(conclusionDate);
        nextDay.setDate(nextDay.getDate() + 1);
        eventDateStr = nextDay.toISOString().split("T")[0];
        if (eventDateStr > today) continue;
      }

      const { error: insertErr } = await supabase.from("eventos").insert({
        id_lead: lead.id,
        tipo: "followup",
        numero: nextNum,
        data_prevista: eventDateStr,
        concluido: false,
        id_usuario: lead.id_agente,
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
