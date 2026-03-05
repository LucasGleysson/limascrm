import { useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { UNIDADES, ORIGENS } from "@/data/mockData";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Target, BarChart3, Download, PieChart } from "lucide-react";

export const ManagerDashboard = () => {
  const { leads } = useLeads();
  const today = new Date().toISOString().split("T")[0];

  const stats = useMemo(() => {
    const concluidos = leads.filter((l) => l.etapa === "concluido");
    const faturamentoTotal = concluidos.reduce((s, l) => s + (l.valor_servico || 0), 0);
    const taxaConversaoGeral = leads.length > 0 ? Math.round((concluidos.length / leads.length) * 100) : 0;
    const ticketMedio = concluidos.length > 0 ? faturamentoTotal / concluidos.length : 0;
    return { faturamentoTotal, taxaConversaoGeral, ticketMedio, totalLeads: leads.length, concluidos: concluidos.length };
  }, [leads]);

  const porOrigem = useMemo(() => {
    return ORIGENS.map((origem) => {
      const originLeads = leads.filter((l) => l.origem === origem);
      const concluidos = originLeads.filter((l) => l.etapa === "concluido");
      const faturamento = concluidos.reduce((s, l) => s + (l.valor_servico || 0), 0);
      const taxa = originLeads.length > 0 ? Math.round((concluidos.length / originLeads.length) * 100) : 0;
      return { origem, total: originLeads.length, concluidos: concluidos.length, faturamento, taxa };
    }).filter((o) => o.total > 0).sort((a, b) => b.faturamento - a.faturamento);
  }, [leads]);

  const porUnidade = useMemo(() => {
    return UNIDADES.map((u) => {
      const unitLeads = leads.filter((l) => l.id_unidade === u.id);
      const concluidos = unitLeads.filter((l) => l.etapa === "concluido");
      const faturamento = concluidos.reduce((s, l) => s + (l.valor_servico || 0), 0);
      return { ...u, total: unitLeads.length, concluidos: concluidos.length, faturamento };
    }).sort((a, b) => b.faturamento - a.faturamento);
  }, [leads]);

  const exportCSV = () => {
    const rows = [["Canal", "Leads", "Concluídos", "Faturamento", "Taxa Conv."]];
    porOrigem.forEach((o) => {
      rows.push([o.origem, String(o.total), String(o.concluidos), `R$ ${o.faturamento}`, `${o.taxa}%`]);
    });
    rows.push([]);
    rows.push(["Unidade", "Leads", "Concluídos", "Faturamento"]);
    porUnidade.forEach((u) => {
      rows.push([u.nome, String(u.total), String(u.concluidos), `R$ ${u.faturamento}`]);
    });
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-gestor-${today}.csv`;
    a.click();
  };

  const maxFaturamento = Math.max(...porOrigem.map((o) => o.faturamento), 1);
  const maxUnidadeFat = Math.max(...porUnidade.map((u) => u.faturamento), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Painel do Gestor</h1>
          <p className="text-muted-foreground text-sm">Visão financeira e ROI por canal</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Faturamento Total" value={`R$ ${stats.faturamentoTotal.toLocaleString("pt-BR")}`} icon={DollarSign} variant="primary" />
        <StatsCard title="Taxa de Conversão" value={`${stats.taxaConversaoGeral}%`} icon={Target} variant="success" />
        <StatsCard title="Ticket Médio" value={`R$ ${stats.ticketMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} icon={TrendingUp} variant="info" />
        <StatsCard title="Serviços Concluídos" value={stats.concluidos} subtitle={`de ${stats.totalLeads} leads`} icon={BarChart3} variant="warning" />
      </div>

      {/* ROI por Canal */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" /> Faturamento por Canal de Marketing
        </h2>
        <div className="space-y-3">
          {porOrigem.map((o) => (
            <div key={o.origem} className="animate-slide-in">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{o.origem}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">{o.total} leads</span>
                  <span className="text-success">{o.taxa}% conv.</span>
                  <span className="font-bold">R$ {o.faturamento.toLocaleString("pt-BR")}</span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700"
                  style={{ width: `${(o.faturamento / maxFaturamento) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Faturamento por Unidade */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Faturamento por Unidade
        </h2>
        <div className="space-y-3">
          {porUnidade.map((u) => (
            <div key={u.id} className="animate-slide-in">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{u.nome}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">{u.total} leads</span>
                  <span className="font-bold">R$ {u.faturamento.toLocaleString("pt-BR")}</span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all duration-700"
                  style={{ width: `${(u.faturamento / maxUnidadeFat) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
