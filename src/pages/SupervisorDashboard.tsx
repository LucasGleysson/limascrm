import React, { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { useScopedLeads } from "@/hooks/useScopedLeads";
import { getLeadWindowCutoff } from "@/lib/leadUtils";
import { ETAPAS_FUNIL } from "@/data/mockData";
import { foiNaLoja, foiNaLojaNoPeriodo, isCarroDoAgente, isCarroParaMeta, isPerdidoAntesLoja, isPerdidoDepoisLoja } from "@/lib/leadUtils";
import { StatsCard } from "@/components/StatsCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppSidebar } from "@/components/AppSidebar";
import { PeriodFilter, PeriodKey, getDateRangeForPeriod } from "@/components/PeriodFilter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, CalendarCheck, XCircle, TrendingUp, ChevronRight, LayoutDashboard, MapPin,
  RefreshCw, Target, Car, CheckCircle2, FileText, Calendar, ClipboardList, Eye, Skull, AlertTriangle, LogIn,
} from "lucide-react";
import type { Lead } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { MetasUnidadesPanel } from "@/components/MetasUnidadesPanel";
import { FichasPanel } from "@/components/FichasPanel";
import { DailyReportPanel } from "@/components/DailyReportPanel";
import { FollowUpTrackingPanel } from "@/components/FollowUpTrackingPanel";
import { DispensaReportPanel } from "@/components/DispensaReportPanel";
import { StoreAgentAssigner } from "@/components/StoreAgentAssigner";
import { MonthNavigator, getMonthRef, getMonthRange } from "@/components/MonthNavigator";
import { ReceptionistReportPanel } from "@/components/ReceptionistReportPanel";
import { AgentDailyChart } from "@/components/AgentDailyChart";
import { DashboardOverviewPanel } from "@/components/DashboardOverviewPanel";
import { ManagerByStorePanel } from "@/components/ManagerByStorePanel";
import { ManagerByAgentPanel } from "@/components/ManagerByAgentPanel";

const SIDEBAR_TABS = [
  { id: "visao_geral", label: "Visão Geral", icon: LayoutDashboard },
  { id: "por_loja", label: "Por Loja", icon: MapPin },
  { id: "por_agente", label: "Por Agente", icon: Users },
  { id: "fichas", label: "Fichas", icon: FileText },
  { id: "diario", label: "Relatório Diário", icon: Calendar },
  { id: "followups", label: "Follow-ups", icon: ClipboardList },
  { id: "dispensa_relatorio", label: "Análise", icon: XCircle },
  { id: "recepcao", label: "Recepção", icon: LogIn },
  { id: "metas", label: "Metas", icon: Target },
];

export const SupervisorDashboard = () => {
  const { eventos, unidades, unidadesAtivas, profiles, agentUnidades, refreshAll } = useLeads();
  const [activeTab, setActiveTab] = useState("visao_geral");
  const [selectedAgente, setSelectedAgente] = useState<string | null>(null);
  const [selectedUnidade, setSelectedUnidade] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [mesRef, setMesRef] = useState(() => getMonthRef(new Date()));
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customTo, setCustomTo] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => { setRefreshing(true); await refreshAll(); setRefreshing(false); };

  const RefreshButton = (
    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
    </Button>
  );

  const PeriodControls = (
    <>
      <PeriodFilter value={period} onChange={setPeriod} />
      {period === "mes" && <MonthNavigator mesRef={mesRef} onChange={setMesRef} />}
      {period === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-9 w-[150px]"
          />
          <span className="text-muted-foreground text-sm">até</span>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-9 w-[150px]"
          />
        </div>
      )}
    </>
  );

  const periodRange = useMemo(() => {
    if (period === "mes") {
      return getMonthRange(mesRef);
    }
    if (period === "custom") {
      return { from: customFrom || null, to: customTo || new Date().toISOString().split("T")[0] };
    }
    const r = getDateRangeForPeriod(period);
    return { from: r.from ?? getLeadWindowCutoff(), to: r.to };
  }, [period, mesRef, customFrom, customTo]);
  const { rows: scopedLeadsRaw } = useScopedLeads({
    from: periodRange.from,
    to: periodRange.to,
    anchor: "any",
  });
  // Leads de "Campanha Whatsapp" (repasse) não entram no dashboard.
  const leads = useMemo(() => scopedLeadsRaw.filter((l) => l.origem !== "Campanha Whatsapp"), [scopedLeadsRaw]);
  const filteredLeads = useMemo(() => {
    if (!periodRange.from) return leads;
    const from = periodRange.from!;
    const to = periodRange.to;
    const seen = new Set<string>();
    return leads.filter((l) => {
      if (seen.has(l.id)) return false;
      const entradaIn = l.data_entrada >= from && l.data_entrada <= to;
      const agendIn = l.data_agendamento && l.data_agendamento >= from && l.data_agendamento <= to;
      if (entradaIn || agendIn) { seen.add(l.id); return true; }
      return false;
    });
  }, [leads, periodRange]);

  // Carros "na loja" no período: ancorado no check-in (data imutável).
  // Garante que cada carro conta em exatamente um mês e que o número de
  // meses fechados não muda quando o status do lead muda depois.
  const naLojaPeriodLeads = useMemo(
    () => leads.filter((l) => foiNaLojaNoPeriodo(l, periodRange.from, periodRange.to)),
    [leads, periodRange],
  );

  const agentes = profiles.filter((u) => u.cargo === "agente");

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  // Map of agent -> unidades using agente_unidades (single source of truth, N:N)
  const agentUnitMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    agentUnidades.forEach((au) => {
      if (!map[au.id_agente]) map[au.id_agente] = [];
      map[au.id_agente].push(au.id_unidade);
    });
    return map;
  }, [agentUnidades]);

  // Lead unit comes ONLY from leads.id_unidade now (after backfill + autofill trigger)
  const getLeadUnidade = (l: { id_unidade?: string | null }) => l.id_unidade || null;

  const agenteStats = useMemo(() => {
    return agentes.map((agente) => {
      const aLeads = filteredLeads.filter((l) => l.id_agente === agente.id);
      const aNaLoja = naLojaPeriodLeads.filter((l) => l.id_agente === agente.id);
      const aLeadIds = new Set(aLeads.map((l) => l.id));
      const passaramNaLoja = aNaLoja.length;
      const concluidos = aNaLoja.filter((l) => l.etapa === "concluido").length;
      const agendados = aLeads.filter((l) => ["agendado", "reagendado"].includes(l.etapa)).length;
      const totalAgendamentos = aLeads.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado"].includes(l.etapa)).length;
      const dispensados = aNaLoja.filter((l) => l.etapa === "dispensado").length;
      const perdidos = aNaLoja.filter((l) => l.etapa === "perdido").length;
      const desqNovos = aLeads.filter((l) => l.etapa === "desqualificado_novo").length;
      const desqAgendados = aLeads.filter((l) => l.etapa === "desqualificado_agendado").length;
      const naoAgendados = aLeads.filter((l) => l.etapa === "novo").length;
      const emAtendimento = aNaLoja.filter((l) => ["confirmado", "na_loja"].includes(l.etapa)).length;
      const perdidosAntes = aLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length;
      const produtivos = Math.max(aLeads.length - desqNovos, 0);
      // Conversão de produtivos em agendados: agendamentos feitos ÷ leads produtivos.
      const txConversao = produtivos > 0 ? Math.round((totalAgendamentos / produtivos) * 100) : 0;
      const txAgendamento = aLeads.length > 0 ? Math.round((totalAgendamentos / aLeads.length) * 100) : 0;

      // FUP pendentes: same logic as agent view — only data_prevista <= today and lead eligible
      // Also include pending reminders (lembretes)
      const agFollowUps = eventos.filter((e) => e.tipo === "followup" && aLeadIds.has(e.id_lead));
      const agLembretes = eventos.filter((e) => e.tipo === "lembrete" && aLeadIds.has(e.id_lead));
      const fupConcluidos = agFollowUps.filter((e) => e.concluido).length;
      const leadById = new Map(aLeads.map((l) => [l.id, l]));
      const fupPendentes = agFollowUps.filter((e) => {
        if (e.concluido || e.data_prevista > todayStr) return false;
        const lead = leadById.get(e.id_lead);
        if (!lead || lead.fup_concluido) return false;
        if (lead.etapa === "dispensado") return true;
        if (lead.etapa === "novo") return true;
        if (["agendado", "reagendado"].includes(lead.etapa)) {
          return !!lead.data_agendamento && lead.data_agendamento <= tomorrowStr;
        }
        return false;
      }).length + agLembretes.filter((e) => {
        if (e.concluido) return false;
        return e.data_prevista <= todayStr;
      }).length;

      const agUnitIds = agentUnitMap[agente.id] || (agente.unidade_padrao ? [agente.unidade_padrao] : []);
      const unidadeNome = agUnitIds
        .map((id) => unidades.find((u) => u.id === id)?.nome)
        .filter(Boolean)
        .join(" / ") || "—";

      return {
        ...agente, unidadeNome,
        total: aLeads.length, passaramNaLoja, concluidos, agendados, totalAgendamentos,
        dispensados, perdidos, desqNovos, desqAgendados, naoAgendados, emAtendimento, perdidosAntes,
        txConversao, txAgendamento, fupConcluidos, fupPendentes, leads: aLeads,
      };
    });
  }, [filteredLeads, naLojaPeriodLeads, eventos, agentes, unidades, todayStr, tomorrowStr, agentUnitMap]);

  const unidadeStats = useMemo(() => {
    return unidadesAtivas.map((u) => {
      // Agents linked to this unit via agente_unidades
      const unitAgentIds = new Set(agentUnidades.filter((au) => au.id_unidade === u.id).map((au) => au.id_agente));
      const uAgents = agentes.filter((a) => unitAgentIds.has(a.id));
      const uLeads = filteredLeads.filter((l) => l.id_unidade === u.id);
      const uNaLoja = naLojaPeriodLeads.filter((l) => l.id_unidade === u.id);
      const passaramNaLoja = uNaLoja.length;
      const concluidos = uNaLoja.filter((l) => l.etapa === "concluido").length;
      const totalAgendamentos = uLeads.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado"].includes(l.etapa)).length;
      const desqNovos = uLeads.filter((l) => l.etapa === "desqualificado_novo").length;
      const desqOutraCidade = uLeads.filter((l) => l.etapa === "desqualificado_novo" && (l.notas || "").includes("[Outra Cidade]")).length;
      const desqAgendados = uLeads.filter((l) => l.etapa === "desqualificado_agendado").length;
      const dispensados = uNaLoja.filter((l) => l.etapa === "dispensado").length;
      const perdidos = uNaLoja.filter((l) => l.etapa === "perdido").length;
      const analiseSupervisor = uNaLoja.filter((l) => l.etapa === "analise_supervisor").length;
      const naLojaConfirmado = uNaLoja.filter((l) => l.etapa === "confirmado").length;
      const naLojaEmLoja = uNaLoja.filter((l) => l.etapa === "na_loja").length;
      const reagendados = uNaLoja.filter((l) => l.etapa === "reagendado").length;
      const recepcionista = profiles.find((p) => p.cargo === "recepcionista" && p.unidade_padrao === u.id);
      const txConversao = passaramNaLoja > 0 ? Math.round((concluidos / passaramNaLoja) * 100) : 0;
      return {
        ...u, total: uLeads.length, passaramNaLoja, carrosNaLoja: passaramNaLoja, totalAgendamentos,
        agendados: uLeads.filter((l) => ["agendado", "reagendado"].includes(l.etapa)).length,
        concluidos, dispensados, perdidos, desqNovos, desqOutraCidade, desqAgendados, analiseSupervisor,
        emAnalise: analiseSupervisor, naLojaConfirmado, naLojaEmLoja, reagendados, recepcionista,
        naoAgendados: uLeads.filter((l) => ["novo"].includes(l.etapa)).length,
        perdidosAntes: uLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length,
        txConversao, unitAgents: uAgents, leads: uLeads,
      };
    });
  }, [filteredLeads, naLojaPeriodLeads, unidadesAtivas, agentUnitMap, agentes, agentUnidades, profiles]);

  const globalStats = useMemo(() => {
    const naLoja = naLojaPeriodLeads.length;
    const concluidos = naLojaPeriodLeads.filter((l) => l.etapa === "concluido").length;
    const dispensados = naLojaPeriodLeads.filter((l) => l.etapa === "dispensado").length;
    const perdidos = naLojaPeriodLeads.filter((l) => l.etapa === "perdido").length;
    const totalAgendamentos = filteredLeads.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado", "analise_supervisor"].includes(l.etapa)).length;
    const novos = filteredLeads.filter((l) => l.etapa === "novo").length;
    const desqNovos = filteredLeads.filter((l) => l.etapa === "desqualificado_novo").length;
    const desqOutraCidade = filteredLeads.filter((l) => l.etapa === "desqualificado_novo" && (l.notas || "").includes("[Outra Cidade]")).length;
    const desqAgendados = filteredLeads.filter((l) => l.etapa === "desqualificado_agendado").length;
    const trabalhados = filteredLeads.filter((l) => l.etapa === "trabalhado").length;
    const semRetorno = filteredLeads.filter((l) => l.etapa === "sem_retorno").length;
    const naoConvertidos = filteredLeads.filter((l) => l.etapa === "nao_convertido").length;
    const txConversao = naLoja > 0 ? Math.round((concluidos / naLoja) * 100) : 0;
    return {
      totalLeads: filteredLeads.length, naLoja, concluidos, totalAgendamentos,
      novos, dispensados, perdidos, desqNovos, desqOutraCidade, desqAgendados, trabalhados, semRetorno, naoConvertidos, txConversao,
    };
  }, [filteredLeads, naLojaPeriodLeads]);

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
        <ErrorBoundary resetKey={activeTab}>
        {activeTab === "visao_geral" && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Painel do Supervisor</h1>
                <p className="text-muted-foreground text-sm">Visão geral de desempenho</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {RefreshButton}
                {PeriodControls}
              </div>
            </div>

            <DashboardOverviewPanel
              filteredLeads={filteredLeads}
              naLojaPeriodLeads={naLojaPeriodLeads}
              unidades={unidadesAtivas}
              profiles={profiles}
              eventos={eventos}
              agentUnidades={agentUnidades}
              periodRange={periodRange}
            />
          </>
        )}

        {activeTab === "por_loja" && (
          <ManagerByStorePanel
            porUnidade={unidadeStats as any}
            mesRef={mesRef}
            periodRange={periodRange as any}
            headerActions={
              <div className="flex items-center gap-3 flex-wrap">
                {RefreshButton}
                {PeriodControls}
              </div>
            }
          />
        )}

        {activeTab === "por_agente" && (
          <ManagerByAgentPanel
            agenteStats={agenteStats as any}
            period={period}
            mesRef={mesRef}
            periodRange={periodRange as any}
            headerActions={
              <div className="flex items-center gap-3 flex-wrap">
                {RefreshButton}
                {PeriodControls}
              </div>
            }
          />
        )}

        {activeTab === "fichas" && <FichasPanel />}
        {activeTab === "diario" && <DailyReportPanel />}
        {activeTab === "followups" && <FollowUpTrackingPanel />}
        {activeTab === "dispensa_relatorio" && <DispensaReportPanel />}
        {activeTab === "recepcao" && <ReceptionistReportPanel />}
        {activeTab === "metas" && <MetasUnidadesPanel profiles={profiles} />}
      </ErrorBoundary>
      </main>
    </div>
  );
};

export default SupervisorDashboard;
