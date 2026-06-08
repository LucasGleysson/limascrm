import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { usePagination } from "@/hooks/usePagination";
import { useRole } from "@/contexts/RoleContext";
import { ETAPAS_FUNIL, Lead } from "@/data/mockData";
import { NewLeadModal } from "@/components/NewLeadModal";
import { ScheduleModal } from "@/components/ScheduleModal";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { EventoPanel } from "@/components/EventoPanel";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus, Search, Users, CalendarDays, Calendar, CalendarCheck, LogIn, BarChart3, MapPin, Trophy, Award, PieChart as PieChartIcon } from "lucide-react";
import { TablePagination } from "@/components/TablePagination";
import { AgentSchedulePanel } from "@/components/AgentSchedulePanel";
import { AgentReceptionPanel } from "@/components/AgentReceptionPanel";
import { AgentPanelOverview } from "@/components/AgentPanelOverview";
import { AgentDayPanel } from "@/components/AgentDayPanel";
import { StatsCard } from "@/components/StatsCard";
import { formatPhone } from "@/lib/phoneUtils";
import { getStatusBadgeClass, formatDateBR, isCarroDoAgente, foiNaLoja, getToday } from "@/lib/leadUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Car, CheckCircle2, XCircle, TrendingUp, Flame, Target, AlertTriangle as NoShowIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Legend } from "recharts";
import { ORIGENS } from "@/data/mockData";

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--info))", "#8b5cf6", "#f97316"];

const SIDEBAR_TABS = [
  { id: "meu_painel", label: "Meu Painel", icon: Trophy },
  { id: "meu_dia", label: "Meu Dia", icon: BarChart3 },
  { id: "leads", label: "Leads", icon: Users },
  { id: "agendamentos", label: "Agendamentos", icon: CalendarCheck },
  { id: "recepcao", label: "Recepção", icon: LogIn },
  { id: "eventos", label: "Eventos", icon: CalendarDays },
];

export const AgentDashboard = () => {
  const { leads, updateLead, eventos, unidades, profiles, agentUnidades } = useLeads();
  const { currentUser } = useRole();
  const [activeTab, setActiveTab] = useState("meu_painel");
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleLead, setScheduleLead] = useState<{ id: string; nome: string } | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [etapaFilter, setEtapaFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [entradaStart, setEntradaStart] = useState<Date | undefined>();
  const [entradaEnd, setEntradaEnd] = useState<Date | undefined>();
  const [agendStart, setAgendStart] = useState<Date | undefined>();
  const [agendEnd, setAgendEnd] = useState<Date | undefined>();

  const today = getToday();

  const allMyLeads = useMemo(() => {
    const unitIds = new Set<string>(
      agentUnidades.filter((au) => au.id_agente === currentUser.id).map((au) => au.id_unidade)
    );
    if (currentUser.unidade_padrao) unitIds.add(currentUser.unidade_padrao);
    return leads.filter(
      (l) => l.id_agente === currentUser.id || (l.id_unidade && unitIds.has(l.id_unidade))
    );
  }, [leads, currentUser.id, currentUser.unidade_padrao, agentUnidades]);

  const myLeads = useMemo(() => {
    return allMyLeads
      .filter((l) => etapaFilter === "todos" || l.etapa === etapaFilter)
      .filter((l) => !search || l.nome.toLowerCase().includes(search.toLowerCase()) || l.telefone.includes(search))
      .filter((l) => {
        if (!entradaStart) return true;
        const s = format(entradaStart, "yyyy-MM-dd");
        return l.data_entrada >= s;
      })
      .filter((l) => {
        if (!entradaEnd) return true;
        const e = format(entradaEnd, "yyyy-MM-dd");
        return l.data_entrada <= e;
      })
      .filter((l) => {
        if (!agendStart) return true;
        const s = format(agendStart, "yyyy-MM-dd");
        return !!l.data_agendamento && l.data_agendamento >= s;
      })
      .filter((l) => {
        if (!agendEnd) return true;
        const e = format(agendEnd, "yyyy-MM-dd");
        return !!l.data_agendamento && l.data_agendamento <= e;
      });
  }, [allMyLeads, etapaFilter, search, entradaStart, entradaEnd, agendStart, agendEnd]);

  const hasDateFilter = !!(entradaStart || entradaEnd || agendStart || agendEnd);
  const clearDateFilters = () => {
    setEntradaStart(undefined);
    setEntradaEnd(undefined);
    setAgendStart(undefined);
    setAgendEnd(undefined);
  };

  const pagination = usePagination(myLeads, { pageSize: 15 });


  const handleMoveEtapa = async (lead: Lead, novaEtapa: string) => {
    if (novaEtapa === "agendado") {
      setScheduleLead({ id: lead.id, nome: lead.nome });
      setScheduleOpen(true);
      return;
    }
    await updateLead(lead.id, { etapa: novaEtapa });
  };

  const getStatusBadge = getStatusBadgeClass;

  // Daily stats for "Meu Dia"
  const dailyStats = useMemo(() => {
    const todayLeads = allMyLeads.filter((l) => l.data_entrada === today);
    const todayAgendados = allMyLeads.filter((l) => l.data_agendamento === today);
    const carrosHoje = todayAgendados.filter((l) => foiNaLoja(l)).length;
    const dispensadosHoje = todayAgendados.filter((l) => l.etapa === "dispensado").length;
      const isEligible = (lead: Lead): boolean => {
        if (lead.fup_concluido) return false;
        if (lead.etapa === "dispensado") return true;
        if (lead.etapa === "novo") return true;
        if (["agendado", "reagendado"].includes(lead.etapa)) {
          return !!lead.data_agendamento && lead.data_agendamento <= today;
        }
        return false;
      };
      const pendingEvents = eventos.filter((e) => !e.concluido && e.tipo === "followup" && e.data_prevista <= today && allMyLeads.some((l) => l.id === e.id_lead && isEligible(l))).length
        + eventos.filter((e) => !e.concluido && e.tipo === "lembrete" && e.data_prevista <= today && allMyLeads.some((l) => l.id === e.id_lead)).length;
    const fupsDoneToday = eventos.filter((e) => e.tipo === "followup" && e.concluido && e.data_conclusao && e.data_conclusao.slice(0, 10) === today && allMyLeads.some((l) => l.id === e.id_lead)).length;
    return {
      novos: todayLeads.length, agendados: todayAgendados.length, carros: carrosHoje,
      perdidos: dispensadosHoje, eventosPendentes: pendingEvents,
      fupsDoneToday,
    };
  }, [allMyLeads, eventos, today]);

  // "Safra de Hoje" — cohort metrics based on leads created TODAY (created_at)
  const safraHoje = useMemo(() => {
    const cohort = allMyLeads.filter((l) => {
      // Use created_at for precise cohort (includes time), fallback to data_entrada
      const createdDate = l.created_at ? l.created_at.slice(0, 10) : l.data_entrada;
      return createdDate === today;
    });
    const total = cohort.length;
    const desqualificados = cohort.filter((l) => ["desqualificado_novo", "desqualificado_agendado"].includes(l.etapa)).length;
    const produtivos = total - desqualificados;
    const agendados = cohort.filter((l) => !["novo", "desqualificado_novo", "desqualificado_agendado", "desqualificado"].includes(l.etapa)).length;
    const naLojaOuSuperior = cohort.filter((l) => foiNaLoja(l)).length;
    const concluidos = cohort.filter((l) => l.etapa === "concluido").length;
    return {
      total,
      produtivos,
      desqualificados,
      agendados,
      txAgendamento: produtivos > 0 ? Math.round((agendados / produtivos) * 100) : 0,
      naLojaOuSuperior,
      txVisita: produtivos > 0 ? Math.round((naLojaOuSuperior / produtivos) * 100) : 0,
      concluidos,
    };
  }, [allMyLeads, today]);

  // Origin breakdown for today's new leads
  const origemHoje = useMemo(() => {
    const todayLeads = allMyLeads.filter((l) => l.data_entrada === today);
    const counts: Record<string, number> = {};
    todayLeads.forEach((l) => { counts[l.origem] = (counts[l.origem] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [allMyLeads, today]);

  // Monthly performance for "Meu Desempenho"
  const mesAtual = useMemo(() => {
    const now = new Date();
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const endD = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const to = endD.toISOString().split("T")[0];
    return { from, to };
  }, []);

  const monthLeads = useMemo(() => {
    const seen = new Set<string>();
    return allMyLeads.filter((l) => {
      if (seen.has(l.id)) return false;
      const entradaInMonth = l.data_entrada >= mesAtual.from && l.data_entrada <= mesAtual.to;
      const agendInMonth = l.data_agendamento && l.data_agendamento >= mesAtual.from && l.data_agendamento <= mesAtual.to;
      if (entradaInMonth || agendInMonth) { seen.add(l.id); return true; }
      return false;
    });
  }, [allMyLeads, mesAtual]);

  const desempenho = useMemo(() => {
    const total = monthLeads.length;
    const desqNovos = monthLeads.filter((l) => l.etapa === "desqualificado_novo").length;
    const produtivos = total - desqNovos;
    const agendados = monthLeads.filter((l) =>
      !["novo", "desqualificado_novo"].includes(l.etapa)
    ).length;
    const naLoja = monthLeads.filter((l) => foiNaLoja(l)).length;
    const concluidos = monthLeads.filter((l) => l.etapa === "concluido").length;
    const dispensados = monthLeads.filter((l) => l.etapa === "dispensado").length;
    const perdidos = monthLeads.filter((l) => l.etapa === "perdido").length;
    const emAnalise = monthLeads.filter((l) => l.etapa === "analise_supervisor").length;
    const registrosFeitos = monthLeads.filter((l) => l.id_agente === currentUser.id).length;
    const agendamentosFeitos = monthLeads.filter((l) =>
      l.id_agente === currentUser.id &&
      ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado", "analise_supervisor"].includes(l.etapa)
    ).length;
    // Progressão da meta = Concluídos + Perdidos (resultado já realizado)
    const progressoMeta = concluidos + perdidos;
    // Pendentes = Dispensados + Em Análise (ainda podem virar concluído/perdido)
    const pendentes = dispensados + emAnalise;

    // No-Show: agendados cujo data_agendamento já passou e ainda estão como agendado/reagendado
    const noShow = monthLeads.filter((l) =>
      ["agendado", "reagendado"].includes(l.etapa) && l.data_agendamento && l.data_agendamento < today
    ).length;

    // Business days elapsed
    const now = new Date();
    let bizDays = 0;
    const firstDay = new Date(mesAtual.from + "T12:00:00");
    for (let d = new Date(firstDay); d <= now; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) bizDays++;
    }
    const mediaCarrosLojaDia = bizDays > 0 ? naLoja / bizDays : 0;

    const txComparecimento = agendados > 0 ? Math.round((naLoja / agendados) * 100) : 0;
    const txConversao = produtivos > 0 ? Math.round((naLoja / produtivos) * 100) : 0;

    // Resgatados concluídos: leads that have dispensado in notes and are now concluido
    const resgatados = monthLeads.filter((l) =>
      l.etapa === "concluido" && (l.notas || "").toLowerCase().includes("reagendado")
    ).length;

    // Ganhos com FUP: concluídos que passaram por análise
    const ganhosFup = monthLeads.filter((l) =>
      l.etapa === "concluido" && (l.notas || "").toLowerCase().includes("análise")
    ).length;

    return {
      total, desqNovos, produtivos, agendados, naLoja, concluidos, dispensados, perdidos,
      noShow, mediaCarrosLojaDia, txComparecimento, txConversao, resgatados, ganhosFup, bizDays,
      emAnalise, registrosFeitos, agendamentosFeitos, progressoMeta, pendentes,
    };
  }, [monthLeads, today, mesAtual, currentUser.id]);

  // Daily appointments chart data
  const dailyChartData = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const data: { dia: number; agendamentos: number; naLoja: number }[] = [];
    for (let d = 1; d <= Math.min(daysInMonth, now.getDate()); d++) {
      const dateStr = `${mesAtual.from.slice(0, 8)}${String(d).padStart(2, "0")}`;
      const agendamentos = monthLeads.filter((l) =>
        l.data_agendamento === dateStr
      ).length;
      const naLoja = monthLeads.filter((l) => {
        if (!foiNaLoja(l)) return false;
        const agendInRange = l.data_agendamento && l.data_agendamento >= mesAtual.from && l.data_agendamento <= mesAtual.to;
        const entradaInRange = l.data_entrada >= mesAtual.from && l.data_entrada <= mesAtual.to;
        let refDate: string;
        if (l.data_agendamento && agendInRange) {
          refDate = l.data_agendamento;
        } else if (entradaInRange) {
          refDate = l.data_entrada;
        } else {
          refDate = l.data_agendamento || l.data_entrada;
        }
        return refDate === dateStr;
      }).length;
      data.push({ dia: d, agendamentos, naLoja });
    }
    return data;
  }, [monthLeads, mesAtual]);

  // Pie data: produtivos que foram na loja vs não
  const pieDesempenho = useMemo(() => {
    const foramNaLoja = desempenho.naLoja;
    const naoFoiNaLoja = desempenho.produtivos - foramNaLoja;
    return [
      { name: "Na Loja", value: Math.max(0, foramNaLoja), fill: "hsl(142, 71%, 45%)" },
      { name: "Não foi", value: Math.max(0, naoFoiNaLoja), fill: "hsl(var(--muted-foreground))" },
    ].filter((d) => d.value > 0);
  }, [desempenho]);

  // Units this agent attends (N:N), with legacy unidade_padrao fallback
  const myUnitIds = useMemo(() => {
    const ids = new Set<string>(
      agentUnidades.filter((au) => au.id_agente === currentUser.id).map((au) => au.id_unidade)
    );
    if (currentUser.unidade_padrao) ids.add(currentUser.unidade_padrao);
    return ids;
  }, [agentUnidades, currentUser.id, currentUser.unidade_padrao]);

  // Store meta progress (sums across ALL units the agent attends)
  const storeMetaProgress = useMemo(() => {
    if (myUnitIds.size === 0) return null;
    const storeLeads = leads.filter((l) => l.id_unidade && myUnitIds.has(l.id_unidade));
    const carrosNaLoja = storeLeads.filter((l) => foiNaLoja(l)).length;
    return { carros: carrosNaLoja, total: storeLeads.length };
  }, [leads, myUnitIds]);



  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} tabs={SIDEBAR_TABS} />

      <main className="flex-1 overflow-auto">
        {activeTab === "leads" && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Leads</h1>
                <p className="text-muted-foreground text-sm">Seus leads</p>
              </div>
              <Button onClick={() => setNewLeadOpen(true)} size="lg" className="gap-2">
                <Plus className="h-4 w-4" /> Nova Ficha
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setEtapaFilter("todos")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  etapaFilter === "todos" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:border-primary/30"
                }`}
              >
                Todos
              </button>
              {ETAPAS_FUNIL.map((e) => (
                <button key={e.id} onClick={() => setEtapaFilter(e.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    etapaFilter === e.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:border-primary/30"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Entrada:</span>
              {[
                { label: "De", date: entradaStart, set: setEntradaStart },
                { label: "Até", date: entradaEnd, set: setEntradaEnd },
              ].map((p, i) => (
                <Popover key={`ent-${i}`}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={`gap-1.5 text-xs h-8 ${p.date ? "border-primary text-primary" : ""}`}>
                      <Calendar className="h-3 w-3" />
                      {p.date ? format(p.date, "dd/MM/yy") : p.label}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={p.date} onSelect={p.set} locale={ptBR} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              ))}
              <span className="text-xs text-muted-foreground font-medium ml-2">Agendamento:</span>
              {[
                { label: "De", date: agendStart, set: setAgendStart },
                { label: "Até", date: agendEnd, set: setAgendEnd },
              ].map((p, i) => (
                <Popover key={`ag-${i}`}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={`gap-1.5 text-xs h-8 ${p.date ? "border-primary text-primary" : ""}`}>
                      <Calendar className="h-3 w-3" />
                      {p.date ? format(p.date, "dd/MM/yy") : p.label}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={p.date} onSelect={p.set} locale={ptBR} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              ))}
              {hasDateFilter && (
                <Button variant="ghost" size="sm" className="text-xs h-8" onClick={clearDateFilters}>Limpar datas</Button>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CLIENTE</TableHead>
                    <TableHead>CONTATO</TableHead>
                    <TableHead>ORIGEM</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead>UNIDADE</TableHead>
                    <TableHead>AGENDAMENTO</TableHead>
                    <TableHead>ENTRADA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        Nenhum lead encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagination.paginatedItems.map((lead) => {
                      const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
                      const unidade = unidades.find((u) => u.id === lead.id_unidade);
                      return (
                        <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                          <TableCell className="font-medium">{lead.nome}</TableCell>
                          <TableCell className="text-muted-foreground">{formatPhone(lead.telefone)}</TableCell>
                          <TableCell className="text-muted-foreground">{lead.origem}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${getStatusBadge(lead.etapa)}`}>
                              <span className="mr-1">●</span> {etapa?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{unidade?.nome || "—"}</TableCell>
                          <TableCell>
                            {lead.data_agendamento ? (
                              <span className="font-semibold text-primary text-sm">{formatDateBR(lead.data_agendamento)}</span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{formatDateBR(lead.data_entrada)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <TablePagination
                currentPage={pagination.currentPage} totalPages={pagination.totalPages}
                totalItems={pagination.totalItems} pageSize={pagination.pageSize}
                onPageChange={pagination.goToPage} hasNextPage={pagination.hasNextPage} hasPrevPage={pagination.hasPrevPage}
              />
            </div>
          </div>
        )}

        {activeTab === "agendamentos" && <AgentSchedulePanel />}
        {activeTab === "recepcao" && <AgentReceptionPanel />}
        {activeTab === "eventos" && <EventoPanel />}

        {activeTab === "meu_dia" && (
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Meu Dia</h1>
              <p className="text-muted-foreground text-sm">Resumo do seu desempenho hoje</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatsCard title="Novos Leads Hoje" value={dailyStats.novos} icon={Users} variant="info" />
              <StatsCard title="Agendados Hoje" value={dailyStats.agendados} icon={CalendarCheck} variant="primary" />
              <StatsCard title="Foram na Loja" value={dailyStats.carros} icon={Car} variant="warning" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatsCard title="Dispensados" value={dailyStats.perdidos} icon={XCircle} variant="destructive" />
              <StatsCard title="FUPs Feitos Hoje" value={dailyStats.fupsDoneToday} icon={CalendarDays} variant="primary" />
              <StatsCard title="Eventos Pendentes" value={dailyStats.eventosPendentes} icon={CalendarDays} variant="warning" />
            </div>

            {/* Origin breakdown pie chart */}
            {origemHoje.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-muted-foreground" /> Novos Leads por Origem
                </h2>
                <p className="text-xs text-muted-foreground mb-4">Distribuição dos {dailyStats.novos} leads de hoje</p>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={origemHoje} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                          {origemHoje.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {origemHoje.map((o, i) => (
                      <div key={o.name} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-sm font-medium">{o.name}</span>
                        <span className="text-sm text-muted-foreground">{o.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Safra de Hoje — Cohort metrics */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold mb-1">🌱 Aproveitamento da Safra de Hoje</h2>
              <p className="text-xs text-muted-foreground mb-4">Métricas baseadas nos leads que entraram para você hoje</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg bg-muted/50 p-4 text-center space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Safra Produtiva</p>
                  <p className="text-3xl font-bold">{safraHoje.produtivos}</p>
                  <p className="text-xs text-muted-foreground">{safraHoje.total} novos − {safraHoje.desqualificados} desq.</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Conversão em Agendamento</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">{safraHoje.txAgendamento}%</span>
                    <span className="text-sm text-muted-foreground">{safraHoje.agendados}/{safraHoje.produtivos}</span>
                  </div>
                  <Progress value={safraHoje.txAgendamento} className="h-2" />
                </div>
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Conversão em Visita</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-warning">{safraHoje.txVisita}%</span>
                    <span className="text-sm text-muted-foreground">{safraHoje.naLojaOuSuperior}/{safraHoje.produtivos}</span>
                  </div>
                  <Progress value={safraHoje.txVisita} className="h-2" />
                </div>
              </div>
            </div>

            {/* Conquistas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h2 className="text-lg font-semibold">Conquistas</h2>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">FUPs Concluídos Hoje</span>
                    <Badge variant={dailyStats.fupsDoneToday > 0 ? "default" : "secondary"} className="text-xs">
                      {dailyStats.fupsDoneToday}
                    </Badge>
                  </div>
                  {dailyStats.fupsDoneToday >= 5 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Trophy className="h-4 w-4 text-warning" />
                      <span className="text-xs text-warning font-medium">🔥 Excelente! +5 FUPs hoje!</span>
                    </div>
                  )}
                </div>
                {storeMetaProgress && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Carros na Loja</span>
                      <span className="text-sm font-bold text-warning">{storeMetaProgress.carros}</span>
                    </div>
                    <Progress value={storeMetaProgress.total > 0 ? (storeMetaProgress.carros / storeMetaProgress.total) * 100 : 0} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">{storeMetaProgress.total > 0 ? Math.round((storeMetaProgress.carros / storeMetaProgress.total) * 100) : 0}% dos leads foram à loja</p>
                  </div>
                )}
                {safraHoje.txAgendamento >= 70 && (
                  <div className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/20 p-3">
                    <Award className="h-5 w-5 text-success" />
                    <div>
                      <p className="text-sm font-semibold text-success">Meta Batida! 🏆</p>
                      <p className="text-xs text-success/80">Safra com +70% de agendamento</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Minha Carteira */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold mb-4">Minha Carteira</h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {ETAPAS_FUNIL.slice(0, 6).map((et) => {
                    const count = allMyLeads.filter((l) => l.etapa === et.id).length;
                    return (
                      <div key={et.id} className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground">{et.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "meu_painel" && <AgentPanelOverview />}

        <NewLeadModal open={newLeadOpen} onOpenChange={setNewLeadOpen} />
        {scheduleLead && (
          <ScheduleModal open={scheduleOpen} onOpenChange={setScheduleOpen} leadId={scheduleLead.id} leadNome={scheduleLead.nome} />
        )}
        <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />
      </main>
    </div>
  );
};

export default AgentDashboard;
