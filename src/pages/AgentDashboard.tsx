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
import { Plus, Search, Users, CalendarDays, Calendar, CalendarCheck, LogIn, BarChart3, MapPin, Trophy, Award } from "lucide-react";
import { TablePagination } from "@/components/TablePagination";
import { AgentSchedulePanel } from "@/components/AgentSchedulePanel";
import { AgentReceptionPanel } from "@/components/AgentReceptionPanel";
import { StatsCard } from "@/components/StatsCard";
import { formatPhone } from "@/lib/phoneUtils";
import { getStatusBadgeClass, formatDateBR, isCarroDoAgente, getToday } from "@/lib/leadUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Car, CheckCircle2, XCircle, TrendingUp } from "lucide-react";

const SIDEBAR_TABS = [
  { id: "leads", label: "Leads", icon: Users },
  { id: "agendamentos", label: "Agendamentos", icon: CalendarCheck },
  { id: "recepcao", label: "Recepção", icon: LogIn },
  { id: "eventos", label: "Eventos", icon: CalendarDays },
  { id: "meu_dia", label: "Meu Dia", icon: BarChart3 },
  { id: "minha_loja", label: "Minha Loja", icon: MapPin },
];

export const AgentDashboard = () => {
  const { leads, updateLead, eventos, unidades, profiles } = useLeads();
  const { currentUser } = useRole();
  const [activeTab, setActiveTab] = useState("leads");
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleLead, setScheduleLead] = useState<{ id: string; nome: string } | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [etapaFilter, setEtapaFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [dateStart, setDateStart] = useState<Date | undefined>();
  const [dateEnd, setDateEnd] = useState<Date | undefined>();

  const today = getToday();

  const allMyLeads = useMemo(() => leads.filter((l) => l.id_agente === currentUser.id), [leads, currentUser.id]);

  const myLeads = useMemo(() => {
    return allMyLeads
      .filter((l) => etapaFilter === "todos" || l.etapa === etapaFilter)
      .filter((l) => !search || l.nome.toLowerCase().includes(search.toLowerCase()) || l.telefone.includes(search))
      .filter((l) => {
        if (!dateStart) return true;
        const d = new Date(l.data_entrada + "T12:00:00");
        return d >= dateStart;
      })
      .filter((l) => {
        if (!dateEnd) return true;
        const d = new Date(l.data_entrada + "T12:00:00");
        const end = new Date(dateEnd);
        end.setHours(23, 59, 59);
        return d <= end;
      });
  }, [allMyLeads, etapaFilter, search, dateStart, dateEnd]);

  const pagination = usePagination(myLeads, { pageSize: 15 });

  const etapaCounts = useMemo(() => {
    const counts: Record<string, number> = { todos: allMyLeads.length };
    ETAPAS_FUNIL.forEach((e) => {
      counts[e.id] = allMyLeads.filter((l) => l.etapa === e.id).length;
    });
    return counts;
  }, [allMyLeads]);

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
    const carrosHoje = todayAgendados.filter((l) => isCarroDoAgente(l.etapa)).length;
    const concluidosHoje = todayAgendados.filter((l) => l.etapa === "concluido").length;
    const dispensadosHoje = todayAgendados.filter((l) => l.etapa === "perdido").length;
    const pendingEvents = eventos.filter((e) => !e.concluido && e.data_prevista <= today && allMyLeads.some((l) => l.id === e.id_lead)).length;
    const fupsDoneToday = eventos.filter((e) => e.tipo === "followup" && e.concluido && e.data_conclusao && e.data_conclusao.slice(0, 10) === today && allMyLeads.some((l) => l.id === e.id_lead)).length;
    return {
      novos: todayLeads.length, agendados: todayAgendados.length, carros: carrosHoje,
      concluidos: concluidosHoje, perdidos: dispensadosHoje, eventosPendentes: pendingEvents,
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
    const agendados = cohort.filter((l) => !["novo", "desqualificado_novo", "desqualificado"].includes(l.etapa)).length;
    const naLojaOuSuperior = cohort.filter((l) => isCarroDoAgente(l.etapa)).length;
    const concluidos = cohort.filter((l) => l.etapa === "concluido").length;
    return {
      total,
      agendados,
      txAgendamento: total > 0 ? Math.round((agendados / total) * 100) : 0,
      naLojaOuSuperior,
      txVisita: total > 0 ? Math.round((naLojaOuSuperior / total) * 100) : 0,
      concluidos,
    };
  }, [allMyLeads, today]);

  // Store meta progress
  const storeMetaProgress = useMemo(() => {
    if (!currentUser.unidade_padrao) return null;
    const storeLeads = leads.filter((l) => l.id_unidade === currentUser.unidade_padrao);
    const carrosNaLoja = storeLeads.filter((l) => isCarroDoAgente(l.etapa)).length;
    return { carros: carrosNaLoja, total: storeLeads.length };
  }, [leads, currentUser.unidade_padrao]);

  // Store stats for "Minha Loja"
  const storeStats = useMemo(() => {
    if (!currentUser.unidade_padrao) return null;
    const storeLeads = leads.filter((l) => l.id_unidade === currentUser.unidade_padrao);
    const storeName = unidades.find((u) => u.id === currentUser.unidade_padrao)?.nome || "—";
    const todayAgendados = storeLeads.filter((l) => l.data_agendamento === today);
    const passaramNaLoja = storeLeads.filter((l) => isCarroDoAgente(l.etapa)).length;
    const concluidos = storeLeads.filter((l) => l.etapa === "concluido").length;
    const txConversao = passaramNaLoja > 0 ? Math.round((concluidos / passaramNaLoja) * 100) : 0;
    return {
      nome: storeName,
      totalLeads: storeLeads.length,
      agendados: storeLeads.filter((l) => ["agendado", "reagendado"].includes(l.etapa)).length,
      confirmados: storeLeads.filter((l) => l.etapa === "confirmado").length,
      naLoja: storeLeads.filter((l) => l.etapa === "na_loja").length,
      concluidos,
      dispensados: storeLeads.filter((l) => l.etapa === "dispensado").length,
      perdidos: storeLeads.filter((l) => l.etapa === "perdido").length,
      passaramNaLoja,
      txConversao,
      agendadosHoje: todayAgendados.length,
      confirmadosHoje: todayAgendados.filter((l) => isCarroDoAgente(l.etapa)).length,
    };
  }, [leads, unidades, currentUser.unidade_padrao, today]);

  

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
                Todos ({etapaCounts.todos})
              </button>
              {ETAPAS_FUNIL.map((e) => (
                <button key={e.id} onClick={() => setEtapaFilter(e.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    etapaFilter === e.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:border-primary/30"
                  }`}
                >
                  {e.label} ({etapaCounts[e.id] || 0})
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 min-w-36">
                    <Calendar className="h-4 w-4" />
                    {dateStart ? format(dateStart, "dd/MM/yyyy") : "Data início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent mode="single" selected={dateStart} onSelect={setDateStart} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 min-w-36">
                    <Calendar className="h-4 w-4" />
                    {dateEnd ? format(dateEnd, "dd/MM/yyyy") : "Data fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent mode="single" selected={dateEnd} onSelect={setDateEnd} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
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

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard title="Novos Leads Hoje" value={dailyStats.novos} icon={Users} variant="info" />
              <StatsCard title="Agendados Hoje" value={dailyStats.agendados} icon={CalendarCheck} variant="primary" />
              <StatsCard title="Foram na Loja" value={dailyStats.carros} icon={Car} variant="warning" />
              <StatsCard title="Concluídos" value={dailyStats.concluidos} icon={CheckCircle2} variant="success" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatsCard title="Perdidos" value={dailyStats.perdidos} icon={XCircle} variant="destructive" />
              <StatsCard title="FUPs Feitos Hoje" value={dailyStats.fupsDoneToday} icon={CalendarDays} variant="primary" />
              <StatsCard title="Eventos Pendentes" value={dailyStats.eventosPendentes} icon={CalendarDays} variant="warning" />
            </div>

            {/* Safra de Hoje — Cohort metrics */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold mb-1">🌱 Aproveitamento da Safra de Hoje</h2>
              <p className="text-xs text-muted-foreground mb-4">Métricas baseadas nos leads que entraram para você hoje</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg bg-muted/50 p-4 text-center space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Safra de Hoje</p>
                  <p className="text-3xl font-bold">{safraHoje.total}</p>
                  <p className="text-xs text-muted-foreground">leads novos</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Conversão em Agendamento</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">{safraHoje.txAgendamento}%</span>
                    <span className="text-sm text-muted-foreground">{safraHoje.agendados}/{safraHoje.total}</span>
                  </div>
                  <Progress value={safraHoje.txAgendamento} className="h-2" />
                </div>
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Conversão em Visita</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-warning">{safraHoje.txVisita}%</span>
                    <span className="text-sm text-muted-foreground">{safraHoje.naLojaOuSuperior}/{safraHoje.total}</span>
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

        {activeTab === "minha_loja" && (
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Minha Loja</h1>
              <p className="text-muted-foreground text-sm">
                {storeStats ? `Desempenho de ${storeStats.nome}` : "Nenhuma loja padrão configurada"}
              </p>
            </div>
            {storeStats ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatsCard title="Total de Leads" value={storeStats.totalLeads} icon={Users} variant="info" />
                  <StatsCard title="Passaram na Loja" value={storeStats.passaramNaLoja} icon={Car} variant="warning" />
                  <StatsCard title="Concluídos" value={storeStats.concluidos} icon={CheckCircle2} variant="success" />
                  <StatsCard title="Taxa Conversão" value={`${storeStats.txConversao}%`} icon={TrendingUp} variant="primary" subtitle="Na Loja → Concluído" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 <StatsCard title="Agendados" value={storeStats.agendados} icon={CalendarCheck} variant="primary" />
                  <StatsCard title="Perdidos" value={storeStats.perdidos} icon={XCircle} variant="destructive" />
                  <StatsCard title="Agendados Hoje" value={storeStats.agendadosHoje} icon={CalendarDays} variant="info" />
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="text-lg font-semibold mb-4">Hoje na {storeStats.nome}</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-primary">{storeStats.agendadosHoje}</p>
                      <p className="text-xs text-muted-foreground">Agendados Hoje</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-warning">{storeStats.confirmadosHoje}</p>
                      <p className="text-xs text-muted-foreground">Confirmados Hoje</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="text-lg font-semibold mb-4">Status da Loja</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-warning">{storeStats.confirmados}</p>
                      <p className="text-xs text-muted-foreground">Confirmados</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-warning">{storeStats.naLoja}</p>
                      <p className="text-xs text-muted-foreground">Na Loja</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-success">{storeStats.concluidos}</p>
                      <p className="text-xs text-muted-foreground">Concluídos</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-destructive">{storeStats.dispensados}</p>
                      <p className="text-xs text-muted-foreground">Dispensados</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>Sua loja padrão ainda não foi configurada.</p>
                <p className="text-xs mt-1">Peça ao gestor para definir sua loja padrão.</p>
              </div>
            )}
          </div>
        )}

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
