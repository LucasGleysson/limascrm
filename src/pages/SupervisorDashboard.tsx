import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { MOCK_USUARIOS, UNIDADES, ETAPAS_FUNIL } from "@/data/mockData";
import { StatsCard } from "@/components/StatsCard";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, CalendarCheck, TrendingUp, XCircle, ChevronRight, Download, BarChart3 } from "lucide-react";
import { Lead } from "@/data/mockData";

export const SupervisorDashboard = () => {
  const { leads, interacoes } = useLeads();
  const [selectedAgente, setSelectedAgente] = useState<string | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const agentes = MOCK_USUARIOS.filter((u) => u.cargo === "agente");
  const today = new Date().toISOString().split("T")[0];

  const agenteStats = useMemo(() => {
    return agentes.map((agente) => {
      const agenteLeads = leads.filter((l) => l.id_agente === agente.id);
      const agendados = agenteLeads.filter((l) => ["agendado", "compareceu", "concluido"].includes(l.etapa)).length;
      const concluidos = agenteLeads.filter((l) => l.etapa === "concluido");
      const perdidos = agenteLeads.filter((l) => l.etapa === "perdido").length;
      const faturamento = concluidos.reduce((s, l) => s + (l.valor_servico || 0), 0);
      const followUpsHoje = interacoes.filter(
        (i) => i.id_usuario === agente.id && i.tipo === "follow_up" && i.data.startsWith(today)
      ).length;
      const taxa = agenteLeads.length > 0 ? Math.round((agendados / agenteLeads.length) * 100) : 0;

      return { ...agente, total: agenteLeads.length, agendados, perdidos, faturamento, followUpsHoje, taxa, leads: agenteLeads };
    });
  }, [leads, interacoes, today]);

  const unidadeStats = useMemo(() => {
    return UNIDADES.map((u) => {
      const unitLeads = leads.filter((l) => l.id_unidade === u.id);
      return {
        ...u,
        agendados: unitLeads.filter((l) => ["agendado", "compareceu", "concluido"].includes(l.etapa)).length,
        perdidos: unitLeads.filter((l) => l.etapa === "perdido").length,
        faturamento: unitLeads.reduce((s, l) => s + (l.valor_servico || 0), 0),
      };
    });
  }, [leads]);

  const globalStats = useMemo(() => ({
    totalLeads: leads.length,
    totalAgendados: leads.filter((l) => ["agendado", "compareceu", "concluido"].includes(l.etapa)).length,
    totalFaturamento: leads.reduce((s, l) => s + (l.valor_servico || 0), 0),
    totalPerdidos: leads.filter((l) => l.etapa === "perdido").length,
  }), [leads]);

  const exportCSV = () => {
    const rows = [["Agente", "Leads", "Agendados", "Perdidos", "Taxa Conv.", "Follow-ups Hoje", "Faturamento"]];
    agenteStats.forEach((a) => {
      rows.push([a.nome, String(a.total), String(a.agendados), String(a.perdidos), `${a.taxa}%`, String(a.followUpsHoje), `R$ ${a.faturamento}`]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-supervisor-${today}.csv`;
    a.click();
  };

  const selected = selectedAgente ? agenteStats.find((a) => a.id === selectedAgente) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Painel do Supervisor</h1>
          <p className="text-muted-foreground text-sm">Desempenho dos agentes e unidades</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total de Leads" value={globalStats.totalLeads} icon={Users} variant="info" />
        <StatsCard title="Agendados" value={globalStats.totalAgendados} icon={CalendarCheck} variant="success" />
        <StatsCard title="Perdidos" value={globalStats.totalPerdidos} icon={XCircle} variant="warning" />
        <StatsCard title="Faturamento Total" value={`R$ ${globalStats.totalFaturamento.toLocaleString("pt-BR")}`} icon={TrendingUp} variant="primary" />
      </div>

      {/* Agentes */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Desempenho por Agente</h2>
        <div className="space-y-2">
          {agenteStats.map((agente) => (
            <div
              key={agente.id}
              className={`flex items-center gap-4 p-4 rounded-xl bg-card border transition-all cursor-pointer animate-slide-in ${selectedAgente === agente.id ? "border-primary shadow-sm" : "border-border hover:border-primary/30"}`}
              onClick={() => setSelectedAgente(selectedAgente === agente.id ? null : agente.id)}
            >
              <div className="flex-1">
                <span className="font-semibold">{agente.nome}</span>
                <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                  <span>{agente.total} leads</span>
                  <span className="text-success">{agente.agendados} agendados</span>
                  <span className="text-destructive">{agente.perdidos} perdidos</span>
                  <span className="text-primary font-medium">{agente.taxa}% conv.</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold">R$ {agente.faturamento.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">{agente.followUpsHoje} follow-ups hoje</p>
              </div>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedAgente === agente.id ? "rotate-90" : ""}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Agent Detail */}
      {selected && (
        <div className="rounded-xl border border-primary/20 bg-card p-5 animate-slide-in">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Leads de {selected.nome}
          </h3>
          <div className="space-y-2">
            {selected.leads.map((lead) => {
              const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
              return (
                <div
                  key={lead.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => { setDetailLead(lead); setDetailOpen(true); }}
                >
                  <span className="font-medium text-sm">{lead.nome}</span>
                  <Badge variant="outline" className="text-xs">{etapa?.label}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">{lead.origem}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unidades */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Visão por Unidade</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {unidadeStats.map((u) => (
            <div key={u.id} className="rounded-xl border border-border bg-card p-4 animate-slide-in">
              <h3 className="font-semibold mb-2">{u.nome}</h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Agendados</p>
                  <p className="font-bold text-success">{u.agendados}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Perdidos</p>
                  <p className="font-bold text-destructive">{u.perdidos}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Faturamento</p>
                  <p className="font-bold">R$ {u.faturamento.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};

export default SupervisorDashboard;
