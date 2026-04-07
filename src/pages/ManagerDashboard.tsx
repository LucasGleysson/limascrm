import React, { useMemo, useState } from "react";
import { UserManagement } from "@/components/UserManagement";
import { useLeads } from "@/contexts/LeadContext";
import { ORIGENS, Lead } from "@/data/mockData";
import { StatsCard } from "@/components/StatsCard";
import { AppSidebar } from "@/components/AppSidebar";
import { PeriodFilter, PeriodKey, getDateRangeForPeriod } from "@/components/PeriodFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, CalendarCheck, TrendingUp, LayoutDashboard, MapPin, Percent,
  RefreshCw, Car, XCircle, FileText, Calendar,
  ClipboardList, Target, CheckCircle2, ChevronRight, AlertTriangle, Skull, LogIn,
} from "lucide-react";
import { FichasPanel } from "@/components/FichasPanel";
import { DailyReportPanel } from "@/components/DailyReportPanel";
import { FollowUpTrackingPanel } from "@/components/FollowUpTrackingPanel";
import { MetasUnidadesPanel } from "@/components/MetasUnidadesPanel";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { isCarroDoAgente, isCarroParaMeta, isPerdidoAntesLoja, isPerdidoDepoisLoja } from "@/lib/leadUtils";
import { StoreAgentAssigner } from "@/components/StoreAgentAssigner";
import { MonthNavigator, getMonthRef, getMonthRange } from "@/components/MonthNavigator";
import { ReceptionistReportPanel } from "@/components/ReceptionistReportPanel";
import { AgentDailyChart } from "@/components/AgentDailyChart";

const SIDEBAR_TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "por_loja", label: "Por Loja", icon: MapPin },
  { id: "por_agente", label: "Por Agente", icon: Users },
  { id: "fichas", label: "Fichas", icon: FileText },
  { id: "diario", label: "Relatório Diário", icon: Calendar },
  { id: "followups", label: "Follow-ups", icon: ClipboardList },
  { id: "metas", label: "Metas", icon: Target },
  { id: "recepcao", label: "Recepção", icon: LogIn },
  { id: "usuarios", label: "Usuários", icon: Users },
];

const PIE_COLORS = [
  "hsl(38, 92%, 50%)", "hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)",
  "hsl(0, 72%, 51%)", "hsl(280, 65%, 60%)", "hsl(190, 80%, 45%)", "hsl(45, 90%, 50%)",
];

export const ManagerDashboard = () => {
  const { leads, unidades, profiles, eventos, agentUnidades, refreshAll } = useLeads();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [unidadeFilter, setUnidadeFilter] = useState("todas");
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [mesRef, setMesRef] = useState(() => getMonthRef(new Date()));
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUnidade, setSelectedUnidade] = useState<string | null>(null);
  const [expandedAgente, setExpandedAgente] = useState<string | null>(null);
  const [selectedAgente, setSelectedAgente] = useState<string | null>(null);

  const handleRefresh = async () => { setRefreshing(true); await refreshAll(); setRefreshing(false); };

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (unidadeFilter !== "todas") result = result.filter((l) => l.id_unidade === unidadeFilter);
    let from: string | null = null;
    let to: string | null = null;
    if (period === "mes") {
      const range = getMonthRange(mesRef);
      from = range.from;
      to = range.to;
    } else {
      const range = getDateRangeForPeriod(period);
      from = range.from;
      to = range.to;
    }
    if (from) {
      const seen = new Set<string>();
      result = result.filter((l) => {
        if (seen.has(l.id)) return false;
        const entradaIn = l.data_entrada >= from! && l.data_entrada <= to!;
        const agendIn = l.data_agendamento && l.data_agendamento >= from! && l.data_agendamento <= to!;
        if (entradaIn || agendIn) { seen.add(l.id); return true; }
        return false;
      });
    }
    return result;
  }, [leads, unidadeFilter, period, mesRef]);

  const stats = useMemo(() => {
    const carrosNaLoja = filteredLeads.filter((l) => ["concluido", "confirmado", "dispensado", "perdido", "reagendado"].includes(l.etapa)).length;
    const concluidos = filteredLeads.filter((l) => l.etapa === "concluido").length;
    const totalAgendamentos = filteredLeads.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado", "analise_supervisor"].includes(l.etapa)).length;
    const novos = filteredLeads.filter((l) => l.etapa === "novo").length;
    const dispensados = filteredLeads.filter((l) => l.etapa === "dispensado").length;
    const perdidos = filteredLeads.filter((l) => l.etapa === "perdido").length;
    const reagendados = filteredLeads.filter((l) => l.etapa === "reagendado").length;
    const desqNovos = filteredLeads.filter((l) => l.etapa === "desqualificado_novo").length;
    const desqOutraCidade = filteredLeads.filter((l) => l.etapa === "desqualificado_novo" && (l.notas || "").includes("[Outra Cidade]")).length;
    const desqAgendados = filteredLeads.filter((l) => l.etapa === "desqualificado_agendado").length;
    const perdidosAntes = filteredLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length;
    const taxaConversao = carrosNaLoja > 0 ? Math.round((concluidos / carrosNaLoja) * 100) : 0;
    return { totalLeads: filteredLeads.length, carrosNaLoja, concluidos, totalAgendamentos, novos, dispensados, perdidos, reagendados, desqNovos, desqOutraCidade, desqAgendados, perdidosAntes, taxaConversao };
  }, [filteredLeads]);

  const porOrigem = useMemo(() => {
    return ORIGENS.map((origem) => {
      const oLeads = filteredLeads.filter((l) => l.origem === origem);
      return { origem, total: oLeads.length, concluidos: oLeads.filter((l) => l.etapa === "concluido").length };
    }).filter((o) => o.total > 0).sort((a, b) => b.total - a.total);
  }, [filteredLeads]);

  const funnelData = useMemo(() => {
    const total = filteredLeads.length;
    const agendamentos = filteredLeads.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado", "analise_supervisor"].includes(l.etapa)).length;
    const naLoja = filteredLeads.filter((l) => ["concluido", "confirmado", "dispensado", "perdido", "reagendado"].includes(l.etapa)).length;
    const concluidos = filteredLeads.filter((l) => l.etapa === "concluido").length;
    const dispensados = filteredLeads.filter((l) => l.etapa === "dispensado").length;
    const reagendados = filteredLeads.filter((l) => l.etapa === "reagendado").length;
    const perdidos = filteredLeads.filter((l) => l.etapa === "perdido").length;
    return [
      { name: "Leads Produtivos", value: total - filteredLeads.filter((l) => l.etapa === "desqualificado_novo").length },
      { name: "Agendamentos", value: agendamentos },
      { name: "Na Loja", value: naLoja },
      { name: "Concluídos", value: concluidos },
      { name: "Dispensados", value: dispensados },
      { name: "Reagendados", value: reagendados },
      { name: "Perdidos", value: perdidos },
    ].filter((d) => d.value > 0);
  }, [filteredLeads]);

  // Build a map of agent -> unidades using agente_unidades (many-to-many)
  const agentUnitMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    agentUnidades.forEach((au) => {
      if (!map[au.id_agente]) map[au.id_agente] = [];
      map[au.id_agente].push(au.id_unidade);
    });
    // Fallback to unidade_padrao
    profiles.forEach((p) => {
      if (p.unidade_padrao && (!map[p.id] || map[p.id].length === 0)) {
        map[p.id] = [p.unidade_padrao];
      }
    });
    return map;
  }, [agentUnidades, profiles]);

  const getLeadUnidade = (l: { id_unidade?: string | null; id_agente: string }) =>
    l.id_unidade || (agentUnitMap[l.id_agente] ? agentUnitMap[l.id_agente][0] : null) || null;

  const agentes = profiles.filter((u) => u.cargo === "agente");

  const porUnidade = useMemo(() => {
    return unidades.map((u) => {
      const unitAgentIds = new Set(agentUnidades.filter((au) => au.id_unidade === u.id).map((au) => au.id_agente));
      const uAgents = agentes.filter((a) => unitAgentIds.has(a.id));
      const uLeads = filteredLeads.filter((l) => getLeadUnidade(l) === u.id);
      const carrosNaLoja = uLeads.filter((l) => ["concluido", "confirmado", "dispensado", "perdido", "reagendado"].includes(l.etapa)).length;
      const totalAgendamentos = uLeads.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado"].includes(l.etapa)).length;
      const desqNovos = uLeads.filter((l) => l.etapa === "desqualificado_novo").length;
      const desqOutraCidade = uLeads.filter((l) => l.etapa === "desqualificado_novo" && (l.notas || "").includes("[Outra Cidade]")).length;
      const desqAgendados = uLeads.filter((l) => l.etapa === "desqualificado_agendado").length;
      const dispensados = uLeads.filter((l) => l.etapa === "dispensado").length;
      const perdidos = uLeads.filter((l) => l.etapa === "perdido").length;
      const concluidos = uLeads.filter((l) => l.etapa === "concluido").length;
      const txConversao = carrosNaLoja > 0 ? Math.round((concluidos / carrosNaLoja) * 100) : 0;
      return {
        ...u, total: uLeads.length, carrosNaLoja, totalAgendamentos,
        agendados: uLeads.filter((l) => ["agendado", "reagendado"].includes(l.etapa)).length,
        concluidos, dispensados, perdidos, desqNovos, desqOutraCidade, desqAgendados,
        txConversao, unitAgents: uAgents, leads: uLeads,
      };
    });
  }, [filteredLeads, unidades, agentUnitMap, agentes, agentUnidades]);

  const periodRange = useMemo(() => {
    if (period === "mes") return getMonthRange(mesRef);
    return getDateRangeForPeriod(period);
  }, [period, mesRef]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; }, []);

  const agenteStats = useMemo(() => {
    return agentes.map((agente) => {
      const aLeads = filteredLeads.filter((l) => l.id_agente === agente.id);
      const aLeadIds = new Set(aLeads.map((l) => l.id));
      const passaramNaLoja = aLeads.filter((l) => ["concluido", "confirmado", "dispensado", "perdido", "reagendado"].includes(l.etapa)).length;
      const concluidos = aLeads.filter((l) => l.etapa === "concluido").length;
      const totalAgendamentos = aLeads.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado"].includes(l.etapa)).length;
      const dispensados = aLeads.filter((l) => l.etapa === "dispensado").length;
      const perdidos = aLeads.filter((l) => l.etapa === "perdido").length;
      const desqNovos = aLeads.filter((l) => l.etapa === "desqualificado_novo").length;
      const desqAgendados = aLeads.filter((l) => l.etapa === "desqualificado_agendado").length;
      const perdidosAntes = aLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length;
      const txConversao = passaramNaLoja > 0 ? Math.round((concluidos / passaramNaLoja) * 100) : 0;
      const txAgendamento = aLeads.length > 0 ? Math.round((totalAgendamentos / aLeads.length) * 100) : 0;
      const agFollowUps = eventos.filter((e) => e.tipo === "followup" && aLeadIds.has(e.id_lead));
      const agLembretes = eventos.filter((e) => e.tipo === "lembrete" && aLeadIds.has(e.id_lead));
      const fupConcluidos = agFollowUps.filter((e) => e.concluido).length;
      const leadById = new Map(aLeads.map((l) => [l.id, l]));
      const fupPendentes = agFollowUps.filter((e) => {
        if (e.concluido || e.data_prevista > todayStr) return false;
        const lead = leadById.get(e.id_lead);
        if (!lead || lead.fup_concluido) return false;
        if (lead.etapa === "dispensado" || lead.etapa === "novo") return true;
        if (["agendado", "reagendado"].includes(lead.etapa)) return !!lead.data_agendamento && lead.data_agendamento <= tomorrowStr;
        return false;
      }).length + agLembretes.filter((e) => !e.concluido && e.data_prevista <= todayStr).length;
      const unidade = unidades.find((u) => u.id === agente.unidade_padrao);
      return {
        ...agente, unidadeNome: unidade?.nome || "—",
        total: aLeads.length, passaramNaLoja, concluidos, totalAgendamentos,
        dispensados, perdidos, desqNovos, desqAgendados, perdidosAntes,
        txConversao, txAgendamento, fupConcluidos, fupPendentes, leads: aLeads,
      };
    });
  }, [filteredLeads, eventos, agentes, unidades, todayStr, tomorrowStr]);

  const selectedAgent = selectedAgente ? agenteStats.find((a) => a.id === selectedAgente) : null;


  const agenteTable = useMemo(() => {
    return agentes.map((agente) => {
      const aLeads = filteredLeads.filter((l) => l.id_agente === agente.id);
      const unidade = unidades.find((u) => u.id === agente.unidade_padrao);
      const carrosNaLoja = aLeads.filter((l) => ["concluido", "confirmado", "dispensado", "perdido", "reagendado"].includes(l.etapa)).length;
      const agFollowUps = eventos.filter((e) => e.tipo === "followup" && aLeads.some((l) => l.id === e.id_lead));
      const totalAgendamentos = aLeads.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado", "analise_supervisor"].includes(l.etapa)).length;
      return {
        nome: agente.nome, unidade: unidade?.nome || "—",
        novo: aLeads.filter((l) => l.etapa === "novo").length,
        agendado: totalAgendamentos,
        carrosNaLoja,
        concluido: aLeads.filter((l) => l.etapa === "concluido").length,
        perdidos: aLeads.filter((l) => l.etapa === "perdido").length,
        perdidosAntes: aLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length,
        total: aLeads.length,
        taxa: aLeads.length > 0 ? Math.round((carrosNaLoja / aLeads.length) * 100) : 0,
        fupDone: agFollowUps.filter((e) => e.concluido).length,
        fupPending: agFollowUps.filter((e) => !e.concluido).length,
      };
    });
  }, [filteredLeads, agentes, unidades, eventos]);

  const origemPieData = useMemo(() => {
    return porOrigem.map((o, i) => ({ name: o.origem, value: o.total, fill: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [porOrigem]);

  const RefreshButton = (
    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
    </Button>
  );

  const UnidadeFilterSelect = (
    <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="todas">Todas as Unidades</SelectItem>
        {unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} tabs={SIDEBAR_TABS} />

      <main className="flex-1 overflow-auto p-6 space-y-6">
        {activeTab === "dashboard" && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground text-sm">Visão estratégica de desempenho</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {RefreshButton}
                <PeriodFilter value={period} onChange={setPeriod} />
                {period === "mes" && <MonthNavigator mesRef={mesRef} onChange={setMesRef} />}
                {UnidadeFilterSelect}
              </div>
            </div>

            {/* Registros e Funil */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Total de Registros" value={stats.totalLeads} icon={Users} variant="info" />
              <StatsCard title="Agendamentos" value={stats.totalAgendamentos} icon={CalendarCheck} variant="primary" />
              <StatsCard title="Leads Produtivos" value={stats.totalLeads - stats.desqNovos} icon={Users} variant="success" subtitle="Total - Desq. Novos" />
              <StatsCard title="Aproveitamento" value={`${(stats.totalLeads - stats.desqNovos) > 0 ? Math.round((stats.carrosNaLoja / (stats.totalLeads - stats.desqNovos)) * 100) : 0}%`} icon={TrendingUp} variant="primary" subtitle="Na Loja / Produtivos" />
            </div>
            {/* Na Loja */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Na Loja" value={stats.carrosNaLoja} icon={Car} variant="warning" subtitle="Conf+Concl+Disp+Perd+Reag" />
              <StatsCard title="Concluídos" value={stats.concluidos} icon={CheckCircle2} variant="success" />
              <StatsCard title="Dispensados" value={stats.dispensados} icon={XCircle} variant="warning" />
              <StatsCard title="Perdidos" value={stats.perdidos} icon={Skull} variant="destructive" />
            </div>
            {/* Desqualificados */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Desq. Novo" value={stats.desqNovos} icon={XCircle} variant="destructive" />
              <StatsCard title="Outra Cidade" value={stats.desqOutraCidade} icon={MapPin} variant="warning" />
              <StatsCard title="Desq. Agendado" value={stats.desqAgendados} icon={XCircle} variant="destructive" />
              <StatsCard title="Conversão (Loja→Concl.)" value={`${stats.taxaConversao}%`} icon={TrendingUp} variant="primary" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold mb-4">Funil de Status</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={funnelData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold mb-4">Distribuição por Origem</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={origemPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                      {origemPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold mb-4">Desempenho por Loja</h2>
                <div className="space-y-3">
                  {porUnidade.map((u) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-28 shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{u.nome}</span>
                      </div>
                      <div className="flex gap-3 text-sm flex-1 justify-end">
                        <span>{u.total} leads</span>
                         <span className="text-warning">{u.carrosNaLoja} loja</span>
                        <span className="text-success">{u.concluidos} ✓</span>
                        <span className="text-destructive">{u.perdidos} perd.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold mb-4">Top Agentes</h2>
                <div className="space-y-3">
                  {[...agenteTable].sort((a, b) => b.carrosNaLoja - a.carrosNaLoja).map((a) => (
                    <div key={a.nome} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-32 shrink-0">{a.nome}</span>
                      <div className="flex gap-3 text-sm flex-1 justify-end">
                        <span>{a.total} leads</span>
                        <span className="text-warning">{a.carrosNaLoja} loja</span>
                        <span className="text-success">{a.taxa}% conv.</span>
                        <span className="text-primary">{a.fupDone} FUP ✓</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold mb-4">Desempenho Detalhado por Agente</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">CIDADE</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">NOVO</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">AGEND.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                       <th className="text-center py-2 font-medium text-muted-foreground">CONCL.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">PERD.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">PERD. s/L</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">CONV.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">FUP ✓</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">FUP ⏳</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agenteTable.map((a) => (
                      <tr key={a.nome} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 font-medium">{a.nome}</td>
                        <td className="py-3 text-muted-foreground">{a.unidade}</td>
                        <td className="py-3 text-center">{a.novo}</td>
                        <td className="py-3 text-center text-primary">{a.agendado}</td>
                        <td className="py-3 text-center text-warning">{a.carrosNaLoja}</td>
                         <td className="py-3 text-center text-success">{a.concluido}</td>
                        <td className="py-3 text-center text-destructive">{a.perdidos}</td>
                        <td className="py-3 text-center text-muted-foreground">{a.perdidosAntes}</td>
                        <td className="py-3 text-center font-medium">{a.taxa}%</td>
                        <td className="py-3 text-center text-success">{a.fupDone}</td>
                        <td className="py-3 text-center">
                          {a.fupPending > 0 ? (
                            <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">{a.fupPending}</Badge>
                          ) : <span className="text-success">0</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold mb-4">Performance por Origem</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">ORIGEM</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">LEADS</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">DESQ. NOVO</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">DISP.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">AGEND.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">NO-SHOW</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">PERD.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">CONCL.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">CONV.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      return ORIGENS.map((origem) => {
                        const oLeads = filteredLeads.filter((l) => l.origem === origem);
                        if (oLeads.length === 0) return null;
                        const desqNovo = oLeads.filter((l) => l.etapa === "desqualificado_novo").length;
                        const naLoja = oLeads.filter((l) => ["concluido", "dispensado", "perdido", "confirmado", "reagendado"].includes(l.etapa)).length;
                        const dispensados = oLeads.filter((l) => l.etapa === "dispensado").length;
                        const agendados = oLeads.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado"].includes(l.etapa)).length;
                        const noShow = oLeads.filter((l: Lead) => ["agendado", "reagendado"].includes(l.etapa) && l.data_agendamento && l.data_agendamento < todayStr).length;
                        const perdidos = oLeads.filter((l) => l.etapa === "perdido").length;
                        const concluidos = oLeads.filter((l) => l.etapa === "concluido").length;
                        const conv = naLoja > 0 ? Math.round((concluidos / naLoja) * 100) : 0;
                        return (
                          <tr key={origem} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-3 font-medium">{origem}</td>
                            <td className="py-3 text-center">{oLeads.length}</td>
                            <td className="py-3 text-center text-muted-foreground">{desqNovo}</td>
                            <td className="py-3 text-center text-warning">{naLoja}</td>
                            <td className="py-3 text-center text-purple-500">{dispensados}</td>
                            <td className="py-3 text-center text-primary">{agendados}</td>
                            <td className="py-3 text-center text-destructive">{noShow}</td>
                            <td className="py-3 text-center text-destructive">{perdidos}</td>
                            <td className="py-3 text-center text-success">{concluidos}</td>
                            <td className="py-3 text-center font-medium">{conv}%</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed report: By Loja */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold mb-4">Relatório por Loja</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">LOJA</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">CONCL.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">DISP. (incl. reag.)</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">PERDIDOS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porUnidade.map((u) => {
                      const dispensadosReag = u.leads.filter((l: Lead) => ["dispensado", "reagendado"].includes(l.etapa)).length;
                      return (
                        <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3 font-medium flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{u.nome}</td>
                          <td className="py-3 text-center text-warning">{u.carrosNaLoja}</td>
                          <td className="py-3 text-center text-success">{u.concluidos}</td>
                          <td className="py-3 text-center text-purple-500">{dispensadosReag}</td>
                          <td className="py-3 text-center text-destructive">{u.perdidos}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed report: By Agente */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold mb-4">Relatório por Agente</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">LEADS</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">PRODUTIVOS</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">AGEND.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">MÉD. AGEND./DIA</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">MÉD. LOJA/DIA</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">NO-SHOW</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      // Calculate business days elapsed in period
                      const pRange = period === "mes" ? getMonthRange(mesRef) : getDateRangeForPeriod(period);
                      const rangeStart = new Date((pRange.from || todayStr) + "T00:00:00");
                      const rangeEnd = new Date(Math.min(new Date((pRange.to || todayStr) + "T00:00:00").getTime(), new Date().setHours(0,0,0,0)));
                      let bizDays = 0;
                      for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
                        const dow = d.getDay();
                        if (dow !== 0 && dow !== 6) bizDays++;
                      }
                      const elapsed = Math.max(bizDays, 1);
                      return agenteTable.map((a) => {
                        const agenteProfile = agentes.find((ag) => ag.nome === a.nome);
                        const agenteId = agenteProfile?.id || a.nome;
                        const aLeads = filteredLeads.filter((l) => l.id_agente === agenteProfile?.id);
                        const desqNovos = aLeads.filter((l) => l.etapa === "desqualificado_novo").length;
                        const desqAgendados = aLeads.filter((l) => l.etapa === "desqualificado_agendado").length;
                        const produtivos = aLeads.length - desqNovos;
                        const noShow = aLeads.filter((l: Lead) => ["agendado", "reagendado"].includes(l.etapa) && l.data_agendamento && l.data_agendamento < todayStr).length;
                        const mediaAgend = (a.agendado / elapsed).toFixed(1);
                        const mediaLoja = (a.carrosNaLoja / elapsed).toFixed(1);
                        const isExpanded = expandedAgente === agenteId;
                        const dispensados = aLeads.filter((l) => l.etapa === "dispensado").length;
                        const resgatados = aLeads.filter((l) => l.etapa === "reagendado").length;
                        const ganhosFup = aLeads.filter((l) => l.etapa === "concluido" && l.fup_concluido).length;
                        const txComparecimento = a.agendado > 0 ? Math.round((a.carrosNaLoja / a.agendado) * 100) : 0;
                        const txAproveitamento = produtivos > 0 ? Math.round((a.carrosNaLoja / produtivos) * 100) : 0;
                        return (
                          <React.Fragment key={a.nome}>
                            <tr className={`border-b border-border/50 hover:bg-muted/30 cursor-pointer ${isExpanded ? "bg-muted/20" : ""}`} onClick={() => setExpandedAgente(isExpanded ? null : agenteId)}>
                              <td className="py-3 font-medium flex items-center gap-1">
                                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                                {a.nome}
                              </td>
                              <td className="py-3 text-center">{a.total}</td>
                              <td className="py-3 text-center text-primary">{produtivos}</td>
                              <td className="py-3 text-center text-primary">{a.agendado}</td>
                              <td className="py-3 text-center text-muted-foreground">{mediaAgend}</td>
                              <td className="py-3 text-center text-warning">{a.carrosNaLoja}</td>
                              <td className="py-3 text-center text-muted-foreground">{mediaLoja}</td>
                              <td className="py-3 text-center text-destructive">{noShow}</td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={8} className="p-4 bg-muted/10 border-b border-border">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Leads Recebidos</p>
                                      <p className="text-lg font-bold">{a.total}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Desqualificados</p>
                                      <p className="text-lg font-bold text-destructive">{desqNovos + desqAgendados}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Produtivos</p>
                                      <p className="text-lg font-bold text-primary">{produtivos}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Agendamentos</p>
                                      <p className="text-lg font-bold text-primary">{a.agendado}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Méd. Loja/Dia</p>
                                      <p className="text-lg font-bold text-warning">{mediaLoja}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Na Loja</p>
                                      <p className="text-lg font-bold text-warning">{a.carrosNaLoja}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                                      <p className="text-xs text-muted-foreground">No-Show</p>
                                      <p className="text-lg font-bold text-destructive">{noShow}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Tx Comparecimento</p>
                                      <p className="text-lg font-bold">{txComparecimento}%</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Aproveitamento</p>
                                      <p className="text-lg font-bold">{txAproveitamento}%</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Resgatados</p>
                                      <p className="text-lg font-bold text-info">{resgatados}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Ganhos c/ FUP</p>
                                      <p className="text-lg font-bold text-success">{ganhosFup}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-card p-3 text-center">
                                      <p className="text-xs text-muted-foreground">Dispensados</p>
                                      <p className="text-lg font-bold text-destructive">{dispensados}</p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === "por_loja" && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Desempenho por Loja</h1>
                <p className="text-muted-foreground text-sm">Leads atribuídos pela unidade ou pelo agente vinculado</p>
              </div>
              <div className="flex items-center gap-3">
                {RefreshButton}
                <PeriodFilter value={period} onChange={setPeriod} />
              </div>
            </div>
            <div className="space-y-2">
              {porUnidade.map((u) => (
                <div key={u.id}
                  className={`flex items-center gap-4 p-4 rounded-xl bg-card border transition-all cursor-pointer ${selectedUnidade === u.id ? "border-primary shadow-sm" : "border-border hover:border-primary/30"}`}
                  onClick={() => setSelectedUnidade(selectedUnidade === u.id ? null : u.id)}
                >
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold">{u.nome}</span>
                    <div className="flex gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span>{u.total} registros</span>
                      <span className="text-primary">{u.totalAgendamentos} agend.</span>
                      <span className="text-warning">{u.carrosNaLoja} na loja</span>
                      <span className="text-success">{u.concluidos} concl.</span>
                      <span className="font-medium">{u.txConversao}% conv.</span>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedUnidade === u.id ? "rotate-90" : ""}`} />
                </div>
              ))}
            </div>
            {(() => {
              const sel = selectedUnidade ? porUnidade.find((u) => u.id === selectedUnidade) : null;
              if (!sel) return null;
              const funnelChartData = [
                { name: "Registros", value: sel.total },
                { name: "Agendamentos", value: sel.totalAgendamentos },
                { name: "Na Loja", value: sel.carrosNaLoja },
                { name: "Concluídos", value: sel.concluidos },
              ];
              const evasionChartData = [
                { name: "Desq. Novo", value: sel.desqNovos, color: "hsl(38, 92%, 50%)" },
                { name: "Outra Cidade", value: sel.desqOutraCidade, color: "hsl(25, 95%, 53%)" },
                { name: "Desq. Agend.", value: sel.desqAgendados, color: "hsl(0, 72%, 51%)" },
                { name: "Dispensados", value: sel.dispensados, color: "hsl(280, 65%, 60%)" },
                { name: "Perdidos", value: sel.perdidos, color: "hsl(0, 50%, 40%)" },
              ].filter((d) => d.value > 0);
              const funnelColors = ["hsl(217, 91%, 60%)", "hsl(280, 65%, 60%)", "hsl(38, 92%, 50%)", "hsl(142, 71%, 45%)"];
              return (
                <div className="rounded-xl border border-primary/20 bg-card p-5 animate-slide-in space-y-5">
                  <h3 className="font-semibold flex items-center gap-2 text-lg"><MapPin className="h-5 w-5 text-primary" />{sel.nome}</h3>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold">{sel.total}</p><p className="text-xs text-muted-foreground">Registros</p></div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-primary">{sel.totalAgendamentos}</p><p className="text-xs text-muted-foreground">Agendamentos</p></div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-warning">{sel.carrosNaLoja}</p><p className="text-xs text-muted-foreground">Na Loja</p></div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-success">{sel.concluidos}</p><p className="text-xs text-muted-foreground">Concluídos</p></div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-warning">{sel.desqNovos}</p><p className="text-xs text-muted-foreground">Desq. Novo</p></div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-orange-500">{sel.desqOutraCidade}</p><p className="text-xs text-muted-foreground">Outra Cidade</p></div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-destructive">{sel.desqAgendados}</p><p className="text-xs text-muted-foreground">Desq. Agendado</p></div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-purple-500">{sel.dispensados}</p><p className="text-xs text-muted-foreground">Dispensados</p></div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center"><p className="text-2xl font-bold text-destructive">{sel.perdidos}</p><p className="text-xs text-muted-foreground">Perdidos</p></div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div>
                      <h4 className="text-sm font-medium mb-2 text-muted-foreground">Funil de Conversão</h4>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={funnelChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                              {funnelChartData.map((_, i) => <Cell key={i} fill={funnelColors[i]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    {evasionChartData.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">Evasão do Funil</h4>
                        <div className="h-56">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={evasionChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                {evasionChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>

                  <StoreAgentAssigner
                    unidadeId={sel.id}
                    unitAgents={sel.unitAgents}
                    allAgents={agentes}
                    agentUnidades={agentUnidades}
                    onUpdated={() => refreshAll()}
                  />

                  {sel.unitAgents.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                            <th className="text-center py-2 font-medium text-muted-foreground">REGISTROS</th>
                            <th className="text-center py-2 font-medium text-muted-foreground">AGEND.</th>
                            <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                            <th className="text-center py-2 font-medium text-muted-foreground">CONCL.</th>
                            <th className="text-center py-2 font-medium text-muted-foreground">DESQ.</th>
                            <th className="text-center py-2 font-medium text-muted-foreground">DISP.</th>
                            <th className="text-center py-2 font-medium text-muted-foreground">PERD.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sel.unitAgents.map((ag) => {
                            const agLeads = sel.leads.filter((l) => l.id_agente === ag.id);
                            const agNaLoja = agLeads.filter((l) => ["concluido", "confirmado", "dispensado", "perdido", "reagendado"].includes(l.etapa)).length;
                            const agConcl = agLeads.filter((l) => l.etapa === "concluido").length;
                            const agAgend = agLeads.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado"].includes(l.etapa)).length;
                            const agDesq = agLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length;
                            const agDisp = agLeads.filter((l) => l.etapa === "dispensado").length;
                            const agPerd = agLeads.filter((l) => l.etapa === "perdido").length;
                            return (
                              <tr key={ag.id} className="border-b border-border/50 hover:bg-muted/30">
                                <td className="py-2 font-medium">{ag.nome}</td>
                                <td className="py-2 text-center">{agLeads.length}</td>
                                <td className="py-2 text-center text-primary">{agAgend}</td>
                                <td className="py-2 text-center text-warning">{agNaLoja}</td>
                                <td className="py-2 text-center text-success">{agConcl}</td>
                                <td className="py-2 text-center text-muted-foreground">{agDesq}</td>
                                <td className="py-2 text-center text-purple-500">{agDisp}</td>
                                <td className="py-2 text-center text-destructive">{agPerd}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}

        {activeTab === "fichas" && <FichasPanel />}
        {activeTab === "diario" && <DailyReportPanel />}
        {activeTab === "followups" && <FollowUpTrackingPanel />}
        {activeTab === "metas" && <MetasUnidadesPanel profiles={profiles} />}
        {activeTab === "recepcao" && <ReceptionistReportPanel />}
        {activeTab === "usuarios" && <UserManagement />}
      </main>
    </div>
  );
};

export default ManagerDashboard;
