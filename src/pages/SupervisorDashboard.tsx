import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { ETAPAS_FUNIL, ETAPAS_CARRO_AGENTE } from "@/data/mockData";
import { StatsCard } from "@/components/StatsCard";
import { AppSidebar } from "@/components/AppSidebar";
import { PeriodFilter, PeriodKey, getDateRangeForPeriod } from "@/components/PeriodFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, CalendarCheck, XCircle, TrendingUp, ChevronRight, LayoutDashboard, MapPin, RefreshCw, Target, Car, AlertTriangle, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { MetasAgentesPanel } from "@/components/MetasAgentesPanel";
import { isCarroDoAgente, isPerdidoAntesLoja, isPerdidoDepoisLoja } from "@/lib/leadUtils";

const SIDEBAR_TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "metas", label: "Metas", icon: Target },
  { id: "agentes", label: "Agentes", icon: Users },
  { id: "unidades", label: "Unidades", icon: MapPin },
];

export const SupervisorDashboard = () => {
  const { leads, eventos, unidades, profiles, refreshAll } = useLeads();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedAgente, setSelectedAgente] = useState<string | null>(null);
  const [selectedUnidade, setSelectedUnidade] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const RefreshButton = (
    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
      Atualizar
    </Button>
  );

  const periodRange = useMemo(() => getDateRangeForPeriod(period), [period]);

  const filteredLeads = useMemo(() => {
    if (!periodRange.from) return leads;
    return leads.filter((l) => l.data_entrada >= periodRange.from!);
  }, [leads, periodRange]);

  const agentes = profiles.filter((u) => u.cargo === "agente");
  const today = new Date().toISOString().split("T")[0];

  const agenteStats = useMemo(() => {
    return agentes.map((agente) => {
      const agenteLeads = filteredLeads.filter((l) => l.id_agente === agente.id);
      const carrosNaLoja = agenteLeads.filter((l) => isCarroDoAgente(l.etapa)).length;
      const concluidos = agenteLeads.filter((l) => l.etapa === "concluido").length;
      const perdidosAntes = agenteLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length;
      const perdidosDepois = agenteLeads.filter((l) => isPerdidoDepoisLoja(l.etapa)).length;
      const taxaConversao = agenteLeads.length > 0 ? Math.round((carrosNaLoja / agenteLeads.length) * 100) : 0;

      const agenteEvents = eventos.filter((e) => {
        const lead = filteredLeads.find((l) => l.id === e.id_lead);
        return lead?.id_agente === agente.id;
      });
      const pendentes = agenteEvents.filter((e) => !e.concluido);
      const atrasados = pendentes.filter((e) => e.data_prevista < today);

      return {
        ...agente,
        total: agenteLeads.length,
        carrosNaLoja,
        concluidos,
        perdidosAntes,
        perdidosDepois,
        taxaConversao,
        pendentes: pendentes.length,
        atrasados: atrasados.length,
        leads: agenteLeads,
      };
    });
  }, [filteredLeads, eventos, today, agentes]);

  const unidadeStats = useMemo(() => {
    return unidades.map((u) => {
      const unitLeads = filteredLeads.filter((l) => l.id_unidade === u.id);
      const foramNaLoja = unitLeads.filter((l) => isCarroDoAgente(l.etapa)).length;
      return {
        ...u,
        total: unitLeads.length,
        foramNaLoja,
        concluidos: unitLeads.filter((l) => l.etapa === "concluido").length,
        perdidosAntes: unitLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length,
        perdidosDepois: unitLeads.filter((l) => isPerdidoDepoisLoja(l.etapa)).length,
      };
    });
  }, [filteredLeads, unidades]);

  const globalStats = useMemo(() => {
    const carrosNaLoja = filteredLeads.filter((l) => isCarroDoAgente(l.etapa)).length;
    const concluidos = filteredLeads.filter((l) => l.etapa === "concluido").length;
    const perdidosAntes = filteredLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length;
    const perdidosDepois = filteredLeads.filter((l) => isPerdidoDepoisLoja(l.etapa)).length;
    return {
      totalLeads: filteredLeads.length,
      carrosNaLoja,
      concluidos,
      perdidosAntes,
      perdidosDepois,
      taxaConversao: filteredLeads.length > 0 ? Math.round((carrosNaLoja / filteredLeads.length) * 100) : 0,
    };
  }, [filteredLeads]);

  const selected = selectedAgente ? agenteStats.find((a) => a.id === selectedAgente) : null;

  const chartData = useMemo(() => {
    if (!selected) return [];
    return [
      { name: "Novos", value: selected.leads.filter((l) => l.etapa === "novo").length },
      { name: "Agendados", value: selected.leads.filter((l) => ["agendado", "reagendado"].includes(l.etapa)).length },
      { name: "Foram na Loja", value: selected.carrosNaLoja },
      { name: "Concluídos", value: selected.concluidos },
      { name: "Perdidos s/ Loja", value: selected.perdidosAntes },
      { name: "Perdidos c/ Loja", value: selected.perdidosDepois },
    ];
  }, [selected]);

  const chartColors = ["hsl(217, 91%, 60%)", "hsl(280, 65%, 60%)", "hsl(38, 92%, 50%)", "hsl(142, 71%, 45%)", "hsl(0, 50%, 65%)", "hsl(0, 72%, 51%)"];

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} tabs={SIDEBAR_TABS} />

      <main className="flex-1 overflow-auto p-6 space-y-6">
        {activeTab === "dashboard" && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Painel do Supervisor</h1>
                <p className="text-muted-foreground text-sm">Desempenho geral dos agentes</p>
              </div>
              <div className="flex items-center gap-3">
                {RefreshButton}
                <PeriodFilter value={period} onChange={setPeriod} />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <StatsCard title="Total de Leads" value={globalStats.totalLeads} icon={Users} variant="info" />
              <StatsCard title="Foram na Loja" value={globalStats.carrosNaLoja} icon={Car} variant="warning" />
              <StatsCard title="Concluídos" value={globalStats.concluidos} icon={CheckCircle2} variant="success" />
              <StatsCard title="Conversão Loja" value={`${globalStats.taxaConversao}%`} icon={TrendingUp} variant="primary" />
              <StatsCard title="Perdidos s/ Loja" value={globalStats.perdidosAntes} icon={XCircle} variant="destructive" />
              <StatsCard title="Perdidos c/ Loja" value={globalStats.perdidosDepois} icon={AlertTriangle} variant="warning" />
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold mb-4">Resumo por Agente</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">LEADS</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">CONCLUÍDOS</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">PERDIDOS s/ LOJA</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">PERDIDOS c/ LOJA</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">CONV.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">EVENTOS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agenteStats.map((a) => (
                      <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 font-medium">{a.nome}</td>
                        <td className="py-3 text-center">{a.total}</td>
                        <td className="py-3 text-center text-warning font-semibold">{a.carrosNaLoja}</td>
                        <td className="py-3 text-center text-success">{a.concluidos}</td>
                        <td className="py-3 text-center text-muted-foreground">{a.perdidosAntes}</td>
                        <td className="py-3 text-center text-destructive">{a.perdidosDepois}</td>
                        <td className="py-3 text-center font-medium">{a.taxaConversao}%</td>
                        <td className="py-3 text-center">
                          <Badge variant="outline" className={`text-xs ${a.atrasados > 0 ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-success/10 text-success border-success/30"}`}>
                            {a.atrasados > 0 ? `${a.atrasados} atrasados` : "Em dia"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === "metas" && (
          <MetasAgentesPanel profiles={profiles} />
        )}

        {activeTab === "agentes" && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Desempenho por Agente</h1>
                <p className="text-muted-foreground text-sm">Clique em um agente para ver detalhes</p>
              </div>
              <div className="flex items-center gap-3">
                {RefreshButton}
                <PeriodFilter value={period} onChange={setPeriod} />
              </div>
            </div>

            <div className="space-y-2">
              {agenteStats.map((agente) => (
                <div
                  key={agente.id}
                  className={`flex items-center gap-4 p-4 rounded-xl bg-card border transition-all cursor-pointer ${selectedAgente === agente.id ? "border-primary shadow-sm" : "border-border hover:border-primary/30"}`}
                  onClick={() => setSelectedAgente(selectedAgente === agente.id ? null : agente.id)}
                >
                  <div className="flex-1">
                    <span className="font-semibold">{agente.nome}</span>
                    <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                      <span>{agente.total} leads</span>
                      <span className="text-warning">{agente.carrosNaLoja} na loja</span>
                      <span className="text-success">{agente.concluidos} concluídos</span>
                      <span className="text-primary font-medium">{agente.taxaConversao}% conv.</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className={`text-xs ${agente.atrasados > 0 ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-success/10 text-success border-success/30"}`}>
                      {agente.atrasados > 0 ? `${agente.atrasados} atrasados` : "Em dia"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">{agente.pendentes} pendentes</p>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedAgente === agente.id ? "rotate-90" : ""}`} />
                </div>
              ))}
            </div>

            {selected && (
              <div className="rounded-xl border border-primary/20 bg-card p-5 animate-slide-in space-y-4">
                <h3 className="font-semibold">{selected.nome} — Distribuição de Leads</h3>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold">{selected.total}</p>
                    <p className="text-xs text-muted-foreground">Total Leads</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold text-warning">{selected.carrosNaLoja}</p>
                    <p className="text-xs text-muted-foreground">Foram na Loja</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold text-success">{selected.concluidos}</p>
                    <p className="text-xs text-muted-foreground">Concluídos</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className={`text-2xl font-bold ${selected.atrasados > 0 ? "text-destructive" : "text-success"}`}>
                      {selected.atrasados}
                    </p>
                    <p className="text-xs text-muted-foreground">Eventos Atrasados</p>
                  </div>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={chartColors[i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "unidades" && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Desempenho por Unidade</h1>
                <p className="text-muted-foreground text-sm">Clique em uma unidade para ver detalhes</p>
              </div>
              <div className="flex items-center gap-3">
                {RefreshButton}
                <PeriodFilter value={period} onChange={setPeriod} />
              </div>
            </div>

            <div className="space-y-2">
              {unidadeStats.map((u) => (
                <div
                  key={u.id}
                  className={`flex items-center gap-4 p-4 rounded-xl bg-card border transition-all cursor-pointer ${selectedUnidade === u.id ? "border-primary shadow-sm" : "border-border hover:border-primary/30"}`}
                  onClick={() => setSelectedUnidade(selectedUnidade === u.id ? null : u.id)}
                >
                  <div className="flex items-center gap-2 min-w-32">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold">{u.nome}</span>
                  </div>
                  <div className="flex gap-4 text-sm flex-1">
                    <span className="text-muted-foreground">{u.total} leads</span>
                    <span className="text-warning">{u.foramNaLoja} na loja</span>
                    <span className="text-success">{u.concluidos} concluídos</span>
                    <span className="text-muted-foreground">{u.perdidosAntes} s/ loja</span>
                    <span className="text-destructive">{u.perdidosDepois} c/ loja</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedUnidade === u.id ? "rotate-90" : ""}`} />
                </div>
              ))}
            </div>

            {(() => {
              const selUnit = selectedUnidade ? unidadeStats.find((u) => u.id === selectedUnidade) : null;
              if (!selUnit) return null;

              const unitLeads = filteredLeads.filter((l) => l.id_unidade === selUnit.id);
              const unitChartData = [
                { name: "Novos", value: unitLeads.filter((l) => l.etapa === "novo").length },
                { name: "Agendados", value: unitLeads.filter((l) => ["agendado", "reagendado"].includes(l.etapa)).length },
                { name: "Confirmados", value: unitLeads.filter((l) => l.etapa === "confirmado").length },
                { name: "Na Loja", value: unitLeads.filter((l) => l.etapa === "na_loja").length },
                { name: "Concluídos", value: unitLeads.filter((l) => l.etapa === "concluido").length },
                { name: "Dispensados", value: unitLeads.filter((l) => l.etapa === "dispensado").length },
                { name: "Perdidos", value: unitLeads.filter((l) => l.etapa === "perdido").length },
                { name: "Desq. Novo", value: unitLeads.filter((l) => l.etapa === "desqualificado_novo").length },
                { name: "Desq. Agend.", value: unitLeads.filter((l) => l.etapa === "desqualificado_agendado").length },
              ].filter((d) => d.value > 0);
              const unitChartColors = [
                "hsl(217, 91%, 60%)", "hsl(280, 65%, 60%)", "hsl(190, 80%, 45%)",
                "hsl(38, 92%, 50%)", "hsl(142, 71%, 45%)", "hsl(0, 72%, 51%)",
                "hsl(0, 50%, 65%)", "hsl(var(--muted-foreground))", "hsl(var(--muted-foreground))",
              ];

              return (
                <div className="rounded-xl border border-primary/20 bg-card p-5 animate-slide-in space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {selUnit.nome} — Detalhamento
                  </h3>

                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold">{selUnit.total}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-warning">{selUnit.foramNaLoja}</p>
                      <p className="text-xs text-muted-foreground">Na Loja</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-success">{selUnit.concluidos}</p>
                      <p className="text-xs text-muted-foreground">Concluídos</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-muted-foreground">{selUnit.perdidosAntes}</p>
                      <p className="text-xs text-muted-foreground">Perdidos s/ Loja</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-destructive">{selUnit.perdidosDepois}</p>
                      <p className="text-xs text-muted-foreground">Perdidos c/ Loja</p>
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={unitChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {unitChartData.map((_, i) => (
                            <Cell key={i} fill={unitChartColors[i] || "hsl(var(--muted-foreground))"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </main>
    </div>
  );
};

export default SupervisorDashboard;
