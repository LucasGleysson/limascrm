import { useMemo, useState } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { UNIDADES, ORIGENS, MOCK_USUARIOS } from "@/data/mockData";
import { StatsCard } from "@/components/StatsCard";
import { AppSidebar } from "@/components/AppSidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, CalendarCheck, TrendingUp, DollarSign, LayoutDashboard, BarChart3, MapPin } from "lucide-react";

const SIDEBAR_TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: Users },
  { id: "agendamentos", label: "Agendamentos", icon: CalendarCheck },
];

export const ManagerDashboard = () => {
  const { leads } = useLeads();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [unidadeFilter, setUnidadeFilter] = useState("todas");

  const filteredLeads = useMemo(() => {
    if (unidadeFilter === "todas") return leads;
    return leads.filter((l) => l.id_unidade === unidadeFilter);
  }, [leads, unidadeFilter]);

  const stats = useMemo(() => {
    const concluidos = filteredLeads.filter((l) => l.etapa === "concluido");
    const faturamentoTotal = concluidos.reduce((s, l) => s + (l.valor_servico || 0), 0);
    const agendados = filteredLeads.filter((l) => ["agendado", "na_loja", "concluido"].includes(l.etapa)).length;
    return {
      totalLeads: filteredLeads.length,
      agendados,
      concluidos: concluidos.length,
      receita: faturamentoTotal,
    };
  }, [filteredLeads]);

  const porOrigem = useMemo(() => {
    return ORIGENS.map((origem) => {
      const originLeads = filteredLeads.filter((l) => l.origem === origem);
      return { origem, total: originLeads.length };
    }).filter((o) => o.total > 0).sort((a, b) => b.total - a.total);
  }, [filteredLeads]);

  const maxOrigem = Math.max(...porOrigem.map((o) => o.total), 1);

  const porUnidade = useMemo(() => {
    return UNIDADES.map((u) => {
      const unitLeads = leads.filter((l) => l.id_unidade === u.id);
      const concluidos = unitLeads.filter((l) => l.etapa === "concluido").length;
      const perdidos = unitLeads.filter((l) => ["perdido", "dispensado", "desqualificado"].includes(l.etapa)).length;
      return { ...u, total: unitLeads.length, concluidos, perdidos };
    });
  }, [leads]);

  const agentes = MOCK_USUARIOS.filter((u) => u.cargo === "agente");

  const agenteTable = useMemo(() => {
    return agentes.map((agente) => {
      const aLeads = filteredLeads.filter((l) => l.id_agente === agente.id);
      const unidade = UNIDADES.find((u) => u.id === agente.unidade_padrao);
      return {
        nome: agente.nome,
        unidade: unidade?.nome || "—",
        novo: aLeads.filter((l) => l.etapa === "novo").length,
        agendado: aLeads.filter((l) => l.etapa === "agendado").length,
        na_loja: aLeads.filter((l) => l.etapa === "na_loja").length,
        dispensado: aLeads.filter((l) => l.etapa === "dispensado").length,
        concluido: aLeads.filter((l) => l.etapa === "concluido").length,
        perdido: aLeads.filter((l) => ["perdido", "desqualificado"].includes(l.etapa)).length,
        total: aLeads.length,
      };
    });
  }, [filteredLeads]);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} tabs={SIDEBAR_TABS} />

      <main className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header with unit filter */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Visão geral do desempenho</p>
          </div>
          <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Unidades</SelectItem>
              {UNIDADES.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total de Leads" value={stats.totalLeads} icon={Users} variant="info" />
          <StatsCard title="Agendados" value={stats.agendados} icon={CalendarCheck} variant="warning" />
          <StatsCard title="Concluídos" value={stats.concluidos} icon={TrendingUp} variant="success" />
          <StatsCard title="Receita" value={`R$ ${stats.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} variant="primary" />
        </div>

        {/* Two column: Origem + Unidade */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads por Origem */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold mb-4">Leads por Origem</h2>
            <div className="space-y-3">
              {porOrigem.map((o) => (
                <div key={o.origem} className="flex items-center gap-3">
                  <span className="text-sm w-24 shrink-0">{o.origem}</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${(o.total / maxOrigem) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-8 text-right">{o.total}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Desempenho por Unidade */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold mb-4">Desempenho por Unidade</h2>
            <div className="space-y-3">
              {porUnidade.map((u) => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">{u.nome}</span>
                  </div>
                  <div className="flex gap-4 text-sm flex-1 justify-end">
                    <span>{u.total} leads</span>
                    <span className="text-success">{u.concluidos} concluídos</span>
                    <span className="text-destructive">{u.perdidos} perdidos</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent performance table */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold mb-4">Desempenho por Agente</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">UNIDADE</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">NOVO LEAD</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">AGENDADO</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">DISPENSADO</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">SERVIÇO CONCLUÍDO</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">PERDIDO</th>
                  <th className="text-center py-2 font-medium text-muted-foreground font-bold">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {agenteTable.map((a) => (
                  <tr key={a.nome} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 font-medium">{a.nome}</td>
                    <td className="py-3 text-muted-foreground">{a.unidade}</td>
                    <td className="py-3 text-center">{a.novo}</td>
                    <td className="py-3 text-center">{a.agendado}</td>
                    <td className="py-3 text-center">{a.na_loja}</td>
                    <td className="py-3 text-center text-destructive">{a.dispensado || 0}</td>
                    <td className="py-3 text-center">{a.concluido}</td>
                    <td className="py-3 text-center">{a.perdido}</td>
                    <td className="py-3 text-center font-bold">{a.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManagerDashboard;
