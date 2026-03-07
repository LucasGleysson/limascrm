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

    // Fetch leads eligible for followup generation
    const { data: leads, error: leadsErr } = await supabase
      .from("leads")
      .select("id, etapa, data_entrada, data_agendamento, checkin, id_agente")
      .or(`etapa.eq.novo,etapa.eq.agendado`);

    if (leadsErr) throw leadsErr;
    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ message: "No eligible leads", generated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter eligible leads
    const eligible = leads.filter((lead) => {
      if (lead.etapa === "novo" && lead.data_entrada < today) return true;
      if (lead.etapa === "agendado" && lead.data_agendamento && lead.data_agendamento < today && !lead.checkin) return true;
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
    let desqualified = 0;

    for (const lead of eligible) {
      const leadEventos = (eventos || []).filter((e) => e.id_lead === lead.id);
      const hasPending = leadEventos.some((e) => !e.concluido);
      if (hasPending) continue;

      const maxExisting = leadEventos.length > 0
        ? Math.max(...leadEventos.map((e) => e.numero))
        : 0;

      if (maxExisting >= 7) {
        if (lead.etapa === "novo") {
          await supabase.from("leads").update({ etapa: "desqualificado" }).eq("id", lead.id);
          desqualified++;
        }
        continue;
      }

      const nextNum = maxExisting + 1;

      let eventDateStr: string;

      if (nextNum === 1) {
        const entryDate = new Date(lead.data_entrada + "T00:00:00");
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
      JSON.stringify({ message: "Done", generated, desqualified, eligible: eligible.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
