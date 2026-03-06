import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { ETAPAS_FUNIL } from "@/data/mockData";
import { StatsCard } from "@/components/StatsCard";
import { AppSidebar } from "@/components/AppSidebar";
import { PeriodFilter, PeriodKey, getDateRangeForPeriod } from "@/components/PeriodFilter";
import { Badge } from "@/components/ui/badge";
import { Users, CalendarCheck, XCircle, TrendingUp, ChevronRight, LayoutDashboard, MapPin } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SIDEBAR_TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "agentes", label: "Agentes", icon: Users },
  { id: "unidades", label: "Unidades", icon: MapPin },
];

export const SupervisorDashboard = () => {
  const { leads, eventos, unidades, profiles } = useLeads();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedAgente, setSelectedAgente] = useState<string | null>(null);
  const [selectedUnidade, setSelectedUnidade] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("mes");

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
      const agendados = agenteLeads.filter((l) => ["agendado", "na_loja", "concluido"].includes(l.etapa)).length;
      const perdidos = agenteLeads.filter((l) => ["perdido", "dispensado", "desqualificado"].includes(l.etapa)).length;
      const taxa = agenteLeads.length > 0 ? Math.round((agendados / agenteLeads.length) * 100) : 0;

      const agenteEvents = eventos.filter((e) => {
        const lead = filteredLeads.find((l) => l.id === e.id_lead);
        return lead?.id_agente === agente.id;
      });
      const pendentes = agenteEvents.filter((e) => !e.concluido);
      const atrasados = pendentes.filter((e) => e.data_prevista < today);
      const totalEventos = agenteEvents.length;
      const concluidos = agenteEvents.filter((e) => e.concluido).length;
      const taxaEventos = totalEventos > 0 ? Math.round((concluidos / totalEventos) * 100) : 100;

      return {
        ...agente,
        total: agenteLeads.length,
        agendados,
        perdidos,
        taxa,
        pendentes: pendentes.length,
        atrasados: atrasados.length,
        taxaEventos,
        leads: agenteLeads,
      };
    });
  }, [filteredLeads, eventos, today, agentes]);

  const unidadeStats = useMemo(() => {
    return unidades.map((u) => {
      const unitLeads = leads.filter((l) => l.id_unidade === u.id);
      return {
        ...u,
        total: unitLeads.length,
        agendados: unitLeads.filter((l) => ["agendado", "na_loja", "concluido"].includes(l.etapa)).length,
        concluidos: unitLeads.filter((l) => l.etapa === "concluido").length,
        perdidos: unitLeads.filter((l) => ["perdido", "dispensado", "desqualificado"].includes(l.etapa)).length,
      };
    });
  }, [leads, unidades]);

  const globalStats = useMemo(() => ({
    totalLeads: leads.length,
    totalAgendados: leads.filter((l) => ["agendado", "na_loja", "concluido"].includes(l.etapa)).length,
    totalPerdidos: leads.filter((l) => ["perdido", "dispensado", "desqualificado"].includes(l.etapa)).length,
    taxaConversao: leads.length > 0 ? Math.round((leads.filter((l) => ["agendado", "na_loja", "concluido"].includes(l.etapa)).length / leads.length) * 100) : 0,
  }), [leads]);

  const selected = selectedAgente ? agenteStats.find((a) => a.id === selectedAgente) : null;

  const chartData = useMemo(() => {
    if (!selected) return [];
    return [
      { name: "Novos", value: selected.leads.filter((l) => l.etapa === "novo").length },
      { name: "Agendados", value: selected.leads.filter((l) => l.etapa === "agendado").length },
      { name: "Na Loja", value: selected.leads.filter((l) => l.etapa === "na_loja").length },
      { name: "Concluídos", value: selected.leads.filter((l) => l.etapa === "concluido").length },
      { name: "Perdidos", value: selected.leads.filter((l) => ["perdido", "dispensado", "desqualificado"].includes(l.etapa)).length },
    ];
  }, [selected]);

  const chartColors = ["hsl(217, 91%, 60%)", "hsl(38, 92%, 50%)", "hsl(38, 92%, 50%)", "hsl(142, 71%, 45%)", "hsl(0, 72%, 51%)"];

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} tabs={SIDEBAR_TABS} />

      <main className="flex-1 overflow-auto p-6 space-y-6">
        {activeTab === "dashboard" && (
          <>
            <div>
              <h1 className="text-2xl font-bold">Painel do Supervisor</h1>
              <p className="text-muted-foreground text-sm">Desempenho geral</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Total de Leads" value={globalStats.totalLeads} icon={Users} variant="info" />
              <StatsCard title="Agendados" value={globalStats.totalAgendados} icon={CalendarCheck} variant="success" />
              <StatsCard title="Perdidos" value={globalStats.totalPerdidos} icon={XCircle} variant="warning" />
              <StatsCard title="Taxa Conversão" value={`${globalStats.taxaConversao}%`} icon={TrendingUp} variant="primary" />
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold mb-4">Resumo por Agente</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">LEADS</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">AGENDADOS</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">PERDIDOS</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">CONVERSÃO</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">EVENTOS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agenteStats.map((a) => (
                      <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 font-medium">{a.nome}</td>
                        <td className="py-3 text-center">{a.total}</td>
                        <td className="py-3 text-center text-success">{a.agendados}</td>
                        <td className="py-3 text-center text-destructive">{a.perdidos}</td>
                        <td className="py-3 text-center font-medium">{a.taxa}%</td>
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

        {activeTab === "agentes" && (
          <>
            <div>
              <h1 className="text-2xl font-bold">Desempenho por Agente</h1>
              <p className="text-muted-foreground text-sm">Clique em um agente para ver detalhes</p>
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
                      <span className="text-success">{agente.agendados} agendados</span>
                      <span className="text-destructive">{agente.perdidos} perdidos</span>
                      <span className="text-primary font-medium">{agente.taxa}% conv.</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className={`text-xs ${agente.atrasados > 0 ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-success/10 text-success border-success/30"}`}>
                      {agente.taxaEventos}% eventos
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
                    <p className="text-2xl font-bold text-primary">{selected.taxa}%</p>
                    <p className="text-xs text-muted-foreground">Conversão</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold text-success">{selected.taxaEventos}%</p>
                    <p className="text-xs text-muted-foreground">Eventos Cumpridos</p>
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
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
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
            <div>
              <h1 className="text-2xl font-bold">Desempenho por Unidade</h1>
              <p className="text-muted-foreground text-sm">Clique em uma unidade para ver detalhes</p>
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
                    <span className="text-success">{u.concluidos} concluídos</span>
                    <span className="text-destructive">{u.perdidos} perdidos</span>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedUnidade === u.id ? "rotate-90" : ""}`} />
                </div>
              ))}
            </div>

            {(() => {
              const selUnit = selectedUnidade ? unidadeStats.find((u) => u.id === selectedUnidade) : null;
              if (!selUnit) return null;

              const unitLeads = leads.filter((l) => l.id_unidade === selUnit.id);
              const unitChartData = ETAPAS_FUNIL.map((e) => ({
                name: e.label,
                value: unitLeads.filter((l) => l.etapa === e.id).length,
              }));
              const unitChartColors = [
                "hsl(217, 91%, 60%)",
                "hsl(38, 92%, 50%)",
                "hsl(38, 92%, 50%)",
                "hsl(142, 71%, 45%)",
                "hsl(0, 72%, 51%)",
                "hsl(0, 72%, 51%)",
                "hsl(var(--muted-foreground))",
              ];

              return (
                <div className="rounded-xl border border-primary/20 bg-card p-5 animate-slide-in space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {selUnit.nome} — Detalhamento
                  </h3>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold">{selUnit.total}</p>
                      <p className="text-xs text-muted-foreground">Total Leads</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-warning">{selUnit.agendados}</p>
                      <p className="text-xs text-muted-foreground">Agendados</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-success">{selUnit.concluidos}</p>
                      <p className="text-xs text-muted-foreground">Concluídos</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-destructive">{selUnit.perdidos}</p>
                      <p className="text-xs text-muted-foreground">Perdidos</p>
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
