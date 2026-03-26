import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { ETAPAS_FUNIL } from "@/data/mockData";
import { StatsCard } from "@/components/StatsCard";
import { AppSidebar } from "@/components/AppSidebar";
import { PeriodFilter, PeriodKey, getDateRangeForPeriod } from "@/components/PeriodFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, CalendarCheck, XCircle, TrendingUp, ChevronRight, LayoutDashboard, MapPin,
  RefreshCw, Target, Car, CheckCircle2, FileText, Calendar, ClipboardList, Eye, Skull, AlertTriangle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { MetasUnidadesPanel } from "@/components/MetasUnidadesPanel";
import { FichasPanel } from "@/components/FichasPanel";
import { DailyReportPanel } from "@/components/DailyReportPanel";
import { FollowUpTrackingPanel } from "@/components/FollowUpTrackingPanel";
import { DispensaReportPanel } from "@/components/DispensaReportPanel";
import { isCarroDoAgente, isCarroParaMeta, isPerdidoAntesLoja, isPerdidoDepoisLoja } from "@/lib/leadUtils";

const SIDEBAR_TABS = [
  { id: "visao_geral", label: "Visão Geral", icon: LayoutDashboard },
  { id: "por_loja", label: "Por Loja", icon: MapPin },
  { id: "por_agente", label: "Por Agente", icon: Users },
  { id: "fichas", label: "Fichas", icon: FileText },
  { id: "diario", label: "Relatório Diário", icon: Calendar },
  { id: "followups", label: "Follow-ups", icon: ClipboardList },
  { id: "dispensa_relatorio", label: "Rel. Dispensa", icon: XCircle },
  { id: "metas", label: "Metas", icon: Target },
];

export const SupervisorDashboard = () => {
  const { leads, eventos, unidades, profiles, refreshAll } = useLeads();
  const [activeTab, setActiveTab] = useState("visao_geral");
  const [selectedAgente, setSelectedAgente] = useState<string | null>(null);
  const [selectedUnidade, setSelectedUnidade] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => { setRefreshing(true); await refreshAll(); setRefreshing(false); };

  const RefreshButton = (
    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
    </Button>
  );

  const periodRange = useMemo(() => getDateRangeForPeriod(period), [period]);
  const filteredLeads = useMemo(() => {
    if (!periodRange.from) return leads;
    return leads.filter((l) => l.data_entrada >= periodRange.from!);
  }, [leads, periodRange]);

  const agentes = profiles.filter((u) => u.cargo === "agente");

  const agenteStats = useMemo(() => {
    return agentes.map((agente) => {
      const aLeads = filteredLeads.filter((l) => l.id_agente === agente.id);
      const passaramNaLoja = aLeads.filter((l) => isCarroDoAgente(l.etapa)).length;
      const concluidos = aLeads.filter((l) => l.etapa === "concluido").length;
      const agendados = aLeads.filter((l) => ["agendado", "reagendado"].includes(l.etapa)).length;
      const totalAgendamentos = aLeads.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado"].includes(l.etapa)).length;
      const dispensados = aLeads.filter((l) => l.etapa === "dispensado").length;
      const perdidos = aLeads.filter((l) => l.etapa === "perdido").length;
      const desqNovos = aLeads.filter((l) => l.etapa === "desqualificado_novo").length;
      const desqAgendados = aLeads.filter((l) => l.etapa === "desqualificado_agendado").length;
      const naoAgendados = aLeads.filter((l) => ["novo", "desqualificado_novo"].includes(l.etapa)).length;
      const perdidosAntes = aLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length;
      const txConversao = passaramNaLoja > 0 ? Math.round((concluidos / passaramNaLoja) * 100) : 0;
      const txAgendamento = aLeads.length > 0 ? Math.round((totalAgendamentos / aLeads.length) * 100) : 0;

      const agFollowUps = eventos.filter((e) => e.tipo === "followup" && aLeads.some((l) => l.id === e.id_lead));
      const fupConcluidos = agFollowUps.filter((e) => e.concluido).length;
      const fupPendentes = agFollowUps.filter((e) => !e.concluido).length;

      const unidade = unidades.find((u) => u.id === agente.unidade_padrao);

      return {
        ...agente, unidadeNome: unidade?.nome || "—",
        total: aLeads.length, passaramNaLoja, concluidos, agendados, totalAgendamentos,
        dispensados, perdidos, desqNovos, desqAgendados, naoAgendados, perdidosAntes,
        txConversao, txAgendamento, fupConcluidos, fupPendentes, leads: aLeads,
      };
    });
  }, [filteredLeads, eventos, agentes, unidades]);

  const unidadeStats = useMemo(() => {
    return unidades.map((u) => {
      const uLeads = filteredLeads.filter((l) => l.id_unidade === u.id);
      const passaramNaLoja = uLeads.filter((l) => isCarroDoAgente(l.etapa)).length;
      const concluidos = uLeads.filter((l) => l.etapa === "concluido").length;
      const txConversao = passaramNaLoja > 0 ? Math.round((concluidos / passaramNaLoja) * 100) : 0;
      return {
        ...u, total: uLeads.length, passaramNaLoja,
        agendados: uLeads.filter((l) => ["agendado", "reagendado"].includes(l.etapa)).length,
        concluidos,
        dispensados: uLeads.filter((l) => l.etapa === "dispensado").length,
        perdidos: uLeads.filter((l) => l.etapa === "perdido").length,
        naoAgendados: uLeads.filter((l) => ["novo", "desqualificado_novo"].includes(l.etapa)).length,
        perdidosAntes: uLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length,
        txConversao,
      };
    });
  }, [filteredLeads, unidades]);

  const globalStats = useMemo(() => {
    const passaramNaLoja = filteredLeads.filter((l) => isCarroDoAgente(l.etapa)).length;
    const concluidos = filteredLeads.filter((l) => l.etapa === "concluido").length;
    const agendados = filteredLeads.filter((l) => ["agendado", "reagendado"].includes(l.etapa)).length;
    const naoAgendados = filteredLeads.filter((l) => l.etapa === "novo").length;
    const dispensados = filteredLeads.filter((l) => l.etapa === "dispensado").length;
    const perdidos = filteredLeads.filter((l) => l.etapa === "perdido").length;
    const desqNovos = filteredLeads.filter((l) => l.etapa === "desqualificado_novo").length;
    const desqOutraCidade = filteredLeads.filter((l) => l.etapa === "desqualificado_novo" && (l.notas || "").includes("[Outra Cidade]")).length;
    const desqAgendados = filteredLeads.filter((l) => l.etapa === "desqualificado_agendado").length;
    const txConversao = passaramNaLoja > 0 ? Math.round((concluidos / passaramNaLoja) * 100) : 0;
    return {
      totalLeads: filteredLeads.length, passaramNaLoja, concluidos, agendados,
      naoAgendados, dispensados, perdidos, desqNovos, desqOutraCidade, desqAgendados, txConversao,
    };
  }, [filteredLeads]);

  const selected = selectedAgente ? agenteStats.find((a) => a.id === selectedAgente) : null;

  const chartData = useMemo(() => {
    if (!selected) return [];
    return [
      { name: "Novos", value: selected.leads.filter((l) => l.etapa === "novo").length },
      { name: "Agendados", value: selected.agendados },
      { name: "Na Loja", value: selected.passaramNaLoja },
      { name: "Concluídos", value: selected.concluidos },
      { name: "Dispensados", value: selected.dispensados },
      { name: "Perdidos", value: selected.perdidos },
      { name: "Perdidos s/L", value: selected.perdidosAntes },
    ];
  }, [selected]);

  const chartColors = ["hsl(217, 91%, 60%)", "hsl(280, 65%, 60%)", "hsl(38, 92%, 50%)", "hsl(142, 71%, 45%)", "hsl(0, 72%, 51%)", "hsl(0, 50%, 40%)", "hsl(0, 50%, 65%)"];

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} tabs={SIDEBAR_TABS} />

      <main className="flex-1 overflow-auto p-6 space-y-6">
        {activeTab === "visao_geral" && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Painel do Supervisor</h1>
                <p className="text-muted-foreground text-sm">Visão geral de desempenho</p>
              </div>
              <div className="flex items-center gap-3">
                {RefreshButton}
                <PeriodFilter value={period} onChange={setPeriod} />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatsCard title="Total de Leads" value={globalStats.totalLeads} icon={Users} variant="info" />
              <StatsCard title="Não Agendados" value={globalStats.naoAgendados} icon={AlertTriangle} variant="warning" />
              <StatsCard title="Agendados" value={globalStats.agendados} icon={CalendarCheck} variant="primary" />
              <StatsCard title="Passaram na Loja" value={globalStats.passaramNaLoja} icon={Car} variant="warning" />
              <StatsCard title="Concluídos" value={globalStats.concluidos} icon={CheckCircle2} variant="success" />
            </div>
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Perdidos (pós-loja)" value={globalStats.perdidos} icon={Skull} variant="destructive" />
              <StatsCard title="Dispensados" value={globalStats.dispensados} icon={XCircle} variant="warning" />
              <StatsCard title="Desq. Novo" value={globalStats.desqNovos} icon={XCircle} variant="destructive" />
              <StatsCard title="Outra Cidade" value={globalStats.desqOutraCidade} icon={MapPin} variant="warning" />
              <StatsCard title="Desq. Agendado" value={globalStats.desqAgendados} icon={XCircle} variant="destructive" />
              <StatsCard title="Conversão (Loja→Concl.)" value={`${globalStats.txConversao}%`} icon={TrendingUp} variant="primary" />
            </div>

            {/* Agent summary table */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold mb-4">Resumo por Agente</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">CIDADE</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">LEADS</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">AGEND.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                       <th className="text-center py-2 font-medium text-muted-foreground">CONCL.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">PERD.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">TX CV.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">FUP ✓</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">FUP ⏳</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agenteStats.map((a) => (
                      <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 font-medium">{a.nome}</td>
                        <td className="py-3 text-muted-foreground">{a.unidadeNome}</td>
                        <td className="py-3 text-center">{a.total}</td>
                        <td className="py-3 text-center text-primary">{a.agendados}</td>
                        <td className="py-3 text-center text-warning">{a.passaramNaLoja}</td>
                         <td className="py-3 text-center text-success">{a.concluidos}</td>
                        <td className="py-3 text-center text-destructive">{a.perdidos}</td>
                        <td className="py-3 text-center font-medium">{a.txConversao}%</td>
                        <td className="py-3 text-center text-success">{a.fupConcluidos}</td>
                        <td className="py-3 text-center">
                          {a.fupPendentes > 0 ? (
                            <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">{a.fupPendentes}</Badge>
                          ) : (
                            <span className="text-success">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Unit summary */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold mb-4">Resumo por Loja</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">LOJA</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">LEADS</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">N/AGEND.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">AGEND.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                       <th className="text-center py-2 font-medium text-muted-foreground">CONCL.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">PERD.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">TX CV.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unidadeStats.map((u) => (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 font-medium flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{u.nome}</td>
                        <td className="py-3 text-center">{u.total}</td>
                        <td className="py-3 text-center text-warning">{u.naoAgendados}</td>
                        <td className="py-3 text-center text-primary">{u.agendados}</td>
                        <td className="py-3 text-center text-warning">{u.passaramNaLoja}</td>
                         <td className="py-3 text-center text-success">{u.concluidos}</td>
                        <td className="py-3 text-center text-destructive">{u.perdidos}</td>
                        <td className="py-3 text-center font-medium">{u.txConversao}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Safra do Dia — Aproveitamento dos leads de hoje por agente */}
            {(() => {
              const todayStr = new Date().toISOString().split("T")[0];
              const safraAgentes = agentes.map((ag) => {
                const cohort = filteredLeads.filter((l) => l.id_agente === ag.id && (l.created_at ? l.created_at.slice(0, 10) : l.data_entrada) === todayStr);
                const total = cohort.length;
                const agendados = cohort.filter((l) => !["novo", "desqualificado_novo", "desqualificado"].includes(l.etapa)).length;
                const naLoja = cohort.filter((l) => isCarroDoAgente(l.etapa)).length;
                const concluidos = cohort.filter((l) => l.etapa === "concluido").length;
                const unidade = unidades.find((u) => u.id === ag.unidade_padrao);
                return { ...ag, unidadeNome: unidade?.nome || "—", total, agendados, naLoja, concluidos, txAgend: total > 0 ? Math.round((agendados / total) * 100) : 0, txVisita: total > 0 ? Math.round((naLoja / total) * 100) : 0 };
              }).filter((a) => a.total > 0);

              if (safraAgentes.length === 0) return null;
              return (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="text-lg font-semibold mb-4">🌱 Aproveitamento da Safra — Hoje</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">CIDADE</th>
                          <th className="text-center py-2 font-medium text-muted-foreground">SAFRA</th>
                          <th className="text-center py-2 font-medium text-muted-foreground">AGEND.</th>
                          <th className="text-center py-2 font-medium text-muted-foreground">% AGEND.</th>
                          <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                          <th className="text-center py-2 font-medium text-muted-foreground">% VISITA</th>
                          <th className="text-center py-2 font-medium text-muted-foreground">CONCL.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {safraAgentes.map((a) => (
                          <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-3 font-medium">{a.nome}</td>
                            <td className="py-3 text-muted-foreground">{a.unidadeNome}</td>
                            <td className="py-3 text-center">{a.total}</td>
                            <td className="py-3 text-center text-primary">{a.agendados}</td>
                            <td className="py-3 text-center font-medium">{a.txAgend}%</td>
                            <td className="py-3 text-center text-warning">{a.naLoja}</td>
                            <td className="py-3 text-center font-medium">{a.txVisita}%</td>
                            <td className="py-3 text-center text-success">{a.concluidos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Desqualificados report */}
            {(() => {
              const desq = filteredLeads.filter((l) => isPerdidoAntesLoja(l.etapa));
              const desqNovo = desq.filter((l) => l.etapa === "desqualificado_novo").length;
              const desqOutraCidade = desq.filter((l) => l.etapa === "desqualificado_novo" && (l.notas || "").includes("[Outra Cidade]")).length;
              const desqAgendado = desq.filter((l) => l.etapa === "desqualificado_agendado").length;
              if (desq.length === 0) return null;
              return (
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="text-lg font-semibold mb-4">Relatório de Desqualificados</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-warning">{desqNovo}</p>
                      <p className="text-xs text-muted-foreground">Desq. Novo</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-orange-500">{desqOutraCidade}</p>
                      <p className="text-xs text-muted-foreground">Outra Cidade</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-destructive">{desqAgendado}</p>
                      <p className="text-xs text-muted-foreground">Desq. Agendado</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold">{desq.length}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                          <th className="text-center py-2 font-medium text-muted-foreground">DESQ. NOVO</th>
                          <th className="text-center py-2 font-medium text-muted-foreground">OUTRA CIDADE</th>
                          <th className="text-center py-2 font-medium text-muted-foreground">DESQ. AGENDADO</th>
                          <th className="text-center py-2 font-medium text-muted-foreground">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentes.map((ag) => {
                          const agDesq = desq.filter((l) => l.id_agente === ag.id);
                          if (agDesq.length === 0) return null;
                          return (
                            <tr key={ag.id} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="py-3 font-medium">{ag.nome}</td>
                              <td className="py-3 text-center text-warning">{agDesq.filter((l) => l.etapa === "desqualificado_novo").length}</td>
                              <td className="py-3 text-center text-orange-500">{agDesq.filter((l) => l.etapa === "desqualificado_novo" && (l.notas || "").includes("[Outra Cidade]")).length}</td>
                              <td className="py-3 text-center text-destructive">{agDesq.filter((l) => l.etapa === "desqualificado_agendado").length}</td>
                              <td className="py-3 text-center font-medium">{agDesq.length}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {activeTab === "por_loja" && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Desempenho por Loja</h1>
                <p className="text-muted-foreground text-sm">Clique em uma loja para ver detalhes</p>
              </div>
              <div className="flex items-center gap-3">{RefreshButton}<PeriodFilter value={period} onChange={setPeriod} /></div>
            </div>
            <div className="space-y-2">
              {unidadeStats.map((u) => (
                <div key={u.id}
                  className={`flex items-center gap-4 p-4 rounded-xl bg-card border transition-all cursor-pointer ${selectedUnidade === u.id ? "border-primary shadow-sm" : "border-border hover:border-primary/30"}`}
                  onClick={() => setSelectedUnidade(selectedUnidade === u.id ? null : u.id)}
                >
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold">{u.nome}</span>
                    <div className="flex gap-3 mt-1 text-sm text-muted-foreground">
                       <span>{u.total} leads</span>
                      <span className="text-primary">{u.agendados} agend.</span>
                      <span className="text-warning">{u.passaramNaLoja} na loja</span>
                      <span className="text-success">{u.concluidos} concl.</span>
                      <span className="text-destructive">{u.perdidos} perd.</span>
                      <span className="font-medium">{u.txConversao}% conv.</span>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedUnidade === u.id ? "rotate-90" : ""}`} />
                </div>
              ))}
            </div>
            {(() => {
              const sel = selectedUnidade ? unidadeStats.find((u) => u.id === selectedUnidade) : null;
              if (!sel) return null;
              const unitChartData = [
                { name: "N/Agend.", value: sel.naoAgendados },
                { name: "Agendados", value: sel.agendados },
                { name: "Na Loja", value: sel.passaramNaLoja },
                { name: "Concluídos", value: sel.concluidos },
                { name: "Perdidos", value: sel.perdidos },
              ].filter((d) => d.value > 0);
              return (
                <div className="rounded-xl border border-primary/20 bg-card p-5 animate-slide-in space-y-4">
                  <h3 className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{sel.nome} — TX Conversão: {sel.txConversao}%</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold">{sel.total}</p><p className="text-xs text-muted-foreground">Total</p></div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-warning">{sel.passaramNaLoja}</p><p className="text-xs text-muted-foreground">Passaram na Loja</p></div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-success">{sel.concluidos}</p><p className="text-xs text-muted-foreground">Concluídos</p></div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-destructive">{sel.perdidos}</p><p className="text-xs text-muted-foreground">Perdidos</p></div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={unitChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {unitChartData.map((_, i) => <Cell key={i} fill={chartColors[i] || "hsl(var(--muted-foreground))"} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {activeTab === "por_agente" && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Desempenho por Agente</h1>
                <p className="text-muted-foreground text-sm">Clique em um agente para ver detalhes</p>
              </div>
              <div className="flex items-center gap-3">{RefreshButton}<PeriodFilter value={period} onChange={setPeriod} /></div>
            </div>
            <div className="space-y-2">
              {agenteStats.map((ag) => (
                <div key={ag.id}
                  className={`flex items-center gap-4 p-4 rounded-xl bg-card border transition-all cursor-pointer ${selectedAgente === ag.id ? "border-primary shadow-sm" : "border-border hover:border-primary/30"}`}
                  onClick={() => setSelectedAgente(selectedAgente === ag.id ? null : ag.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{ag.nome}</span>
                      <span className="text-xs text-muted-foreground">({ag.unidadeNome})</span>
                    </div>
                    <div className="flex gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span>{ag.total} leads</span>
                      <span className="text-primary">{ag.totalAgendamentos} agend.</span>
                      <span className="text-warning">{ag.passaramNaLoja} loja</span>
                      <span className="text-success">{ag.concluidos} concl.</span>
                      <span className="text-destructive">{ag.perdidos} perd.</span>
                      <span className="font-medium">{ag.txAgendamento}% ag. | {ag.txConversao}% conv.</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 text-xs">
                    <p className="text-success">{ag.fupConcluidos} FUP ✓</p>
                    {ag.fupPendentes > 0 && <p className="text-warning">{ag.fupPendentes} FUP ⏳</p>}
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedAgente === ag.id ? "rotate-90" : ""}`} />
                </div>
              ))}
            </div>
            {selected && (
              <div className="rounded-xl border border-primary/20 bg-card p-5 animate-slide-in space-y-4">
                <h3 className="font-semibold">{selected.nome} — Conv. Agend: {selected.txAgendamento}% | Conv. Loja: {selected.txConversao}%</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold">{selected.total}</p><p className="text-xs text-muted-foreground">Registros</p></div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-primary">{selected.totalAgendamentos}</p><p className="text-xs text-muted-foreground">Agendamentos</p></div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-warning">{selected.passaramNaLoja}</p><p className="text-xs text-muted-foreground">Na Loja</p></div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-success">{selected.concluidos}</p><p className="text-xs text-muted-foreground">Concluídos</p></div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-warning">{selected.desqNovos}</p><p className="text-xs text-muted-foreground">Desq. Novo</p></div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-destructive">{selected.desqAgendados}</p><p className="text-xs text-muted-foreground">Desq. Agendado</p></div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-warning">{selected.dispensados}</p><p className="text-xs text-muted-foreground">Dispensados</p></div>
                  <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-destructive">{selected.perdidos}</p><p className="text-xs text-muted-foreground">Perdidos</p></div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {chartData.map((_, i) => <Cell key={i} fill={chartColors[i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "fichas" && <FichasPanel />}
        {activeTab === "diario" && <DailyReportPanel />}
        {activeTab === "followups" && <FollowUpTrackingPanel />}
        {activeTab === "dispensa_relatorio" && <DispensaReportPanel />}
        {activeTab === "metas" && <MetasUnidadesPanel profiles={profiles} />}
      </main>
    </div>
  );
};

export default SupervisorDashboard;
