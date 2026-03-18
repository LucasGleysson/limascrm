import { Fragment, useMemo, useState } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { TablePagination } from "@/components/TablePagination";
import { Lead, ETAPAS_FUNIL } from "@/data/mockData";
import { formatPhone } from "@/lib/phoneUtils";
import { getStatusBadgeClass } from "@/lib/leadUtils";
import { usePagination } from "@/hooks/usePagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, User, ChevronRight, ChevronDown, FileText, Phone, Car, Flag, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const FollowUpTrackingPanel = () => {
  const { leads, eventos, profiles, unidades } = useLeads();
  const agentes = useMemo(() => profiles.filter((p) => p.cargo === "agente"), [profiles]);
  const [agenteFilter, setAgenteFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const isConcludedOnDay = (iso?: string | null) => !!iso && iso.slice(0, 10) === today;

  const allFollowUps = useMemo(() => eventos.filter((e) => e.tipo === "followup"), [eventos]);

  const categorizeLead = (lead: Lead): string => {
    if (lead.etapa === "novo" || lead.etapa === "desqualificado_novo") return "novo";
    if (["agendado", "reagendado", "desqualificado_agendado"].includes(lead.etapa)) return "agendado";
    if (["dispensado", "perdido"].includes(lead.etapa)) return "dispensado";
    if (["confirmado", "na_loja", "concluido"].includes(lead.etapa)) return "loja";
    return "outro";
  };

  const agentFupBreakdown = useMemo(() => {
    return agentes
      .map((ag) => {
        const agLeads = leads.filter((l) => l.id_agente === ag.id);
        const agLeadIds = new Set(agLeads.map((l) => l.id));
        const agFups = allFollowUps.filter((e) => agLeadIds.has(e.id_lead));

        const byNumber: Record<number, { pending: number; completed: number }> = {};
        for (let i = 1; i <= 7; i++) {
          const nFups = agFups.filter((e) => e.numero === i);
          byNumber[i] = {
            pending: nFups.filter((e) => !e.concluido).length,
            completed: nFups.filter((e) => e.concluido).length,
          };
        }

        const leadIdsWithFup = new Set(agFups.map((e) => e.id_lead));
        const leadsWithFup = agLeads.filter((l) => leadIdsWithFup.has(l.id));
        const processesConcluidosFull = leadsWithFup.filter((l) => l.fup_concluido);
        const processesPending = leadsWithFup.filter((l) => !l.fup_concluido);

        const dispensaLeadIds = new Set<string>();
        agLeads.forEach((lead) => {
          if (["dispensado", "perdido"].includes(lead.etapa)) dispensaLeadIds.add(lead.id);
        });
        agFups.forEach((fup) => {
          const descricao = (fup.descricao || "").toLowerCase();
          if (descricao.includes("dispensado")) dispensaLeadIds.add(fup.id_lead);
        });

        const carrosGanhosDispensado = processesConcluidosFull.filter((l) => dispensaLeadIds.has(l.id));

        return {
          ...ag,
          byNumber,
          processesConcluidosFull,
          processesPending,
          totalProcesses: leadsWithFup.length,
          totalFupsDone: agFups.filter((e) => e.concluido).length,
          totalFupsPending: agFups.filter((e) => !e.concluido).length,
          totalFupsDoneToday: agFups.filter((e) => e.concluido && isConcludedOnDay(e.data_conclusao)).length,
          carrosGanhosDispensado,
          leadsWithFup,
        };
      })
      .filter((a) => a.totalProcesses > 0)
      .sort((a, b) => b.totalFupsDone - a.totalFupsDone);
  }, [agentes, leads, allFollowUps, today]);

  const globalByNumber = useMemo(() => {
    const result: Record<number, { pending: number; completed: number }> = {};
    for (let i = 1; i <= 7; i++) {
      const nFups = allFollowUps.filter((e) => e.numero === i);
      result[i] = {
        pending: nFups.filter((e) => !e.concluido).length,
        completed: nFups.filter((e) => e.concluido).length,
      };
    }
    return result;
  }, [allFollowUps]);

  const globalTotals = useMemo(() => {
    const leadsWithFup = new Set(allFollowUps.map((e) => e.id_lead));
    const relevantLeads = leads.filter((l) => leadsWithFup.has(l.id));
    const concluded = relevantLeads.filter((l) => l.fup_concluido);
    const pending = relevantLeads.filter((l) => !l.fup_concluido);

    const dispensaLeadIds = new Set<string>();
    relevantLeads.forEach((lead) => {
      if (["dispensado", "perdido"].includes(lead.etapa)) dispensaLeadIds.add(lead.id);
    });
    allFollowUps.forEach((fup) => {
      const descricao = (fup.descricao || "").toLowerCase();
      if (descricao.includes("dispensado")) dispensaLeadIds.add(fup.id_lead);
    });

    return {
      totalProcesses: relevantLeads.length,
      complete: concluded.length,
      pending: pending.length,
      totalDone: allFollowUps.filter((e) => e.concluido).length,
      totalDoneToday: allFollowUps.filter((e) => e.concluido && isConcludedOnDay(e.data_conclusao)).length,
      totalPending: allFollowUps.filter((e) => !e.concluido).length,
      carrosDispensadoConcluido: concluded.filter((l) => dispensaLeadIds.has(l.id)).length,
    };
  }, [allFollowUps, leads, today]);

  const getAgentName = (id: string) => profiles.find((p) => p.id === id)?.nome || "—";
  const getUnitName = (id?: string | null) => (id ? unidades.find((u) => u.id === id)?.nome || "—" : "—");

  // Filtered leads list
  const filteredLeadsList = useMemo(() => {
    let agentData = agentFupBreakdown;
    if (agenteFilter !== "todos") agentData = agentData.filter((a) => a.id === agenteFilter);

    let allLeadsList: Lead[] = [];
    for (const ag of agentData) {
      if (statusFilter === "completed") allLeadsList.push(...ag.processesConcluidosFull);
      else if (statusFilter === "pending") allLeadsList.push(...ag.processesPending);
      else allLeadsList.push(...ag.leadsWithFup);
    }
    const seen = new Set<string>();
    return allLeadsList.filter((l) => { if (seen.has(l.id)) return false; seen.add(l.id); return true; });
  }, [agentFupBreakdown, agenteFilter, statusFilter]);

  const renderLeadCard = (lead: Lead) => {
    const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
    const leadFups = allFollowUps.filter((e) => e.id_lead === lead.id);
    const done = leadFups.filter((e) => e.concluido).length;
    const total = leadFups.length;
    const isProcessDone = lead.fup_concluido;
    const category = categorizeLead(lead);

    return (
      <div
        key={lead.id}
        className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border cursor-pointer hover:bg-muted/50 transition-all"
        onClick={() => { setDetailLead(lead); setDetailOpen(true); }}
      >
        <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isProcessDone ? "bg-success/10" : "bg-warning/10"}`}>
          {isProcessDone ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Clock className="h-5 w-5 text-warning" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{lead.nome}</span>
            <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(lead.etapa)}`}>
              {etapa?.label || lead.etapa}
            </Badge>
            <Badge variant={isProcessDone ? "default" : "secondary"} className="text-xs">
              {done}/{total} FUPs
            </Badge>
            {isProcessDone && lead.fup_concluido_numero && (
              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                <Flag className="h-3 w-3 mr-1" />Concluído no F{lead.fup_concluido_numero}
              </Badge>
            )}
            {category === "dispensado" && isProcessDone && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                <Car className="h-3 w-3 mr-1" />Carro ganho
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{formatPhone(lead.telefone)}</span>
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{getAgentName(lead.id_agente)}</span>
            <span>{getUnitName(lead.id_unidade)}</span>
            {lead.numero_os && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />OS: {lead.numero_os}</span>}
            {lead.fup_motivo_conclusao && (
              <span className="italic">"{lead.fup_motivo_conclusao}"</span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Acompanhamento de Follow-ups</h1>
        <p className="text-muted-foreground text-sm">Processos de resgate por agente, etapa e conclusão</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-7 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{globalTotals.totalProcesses}</p>
          <p className="text-xs text-muted-foreground">Processos</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-success">{globalTotals.complete}</p>
          <p className="text-xs text-muted-foreground">Processos Concluídos</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-warning">{globalTotals.pending}</p>
          <p className="text-xs text-muted-foreground">Processos Pendentes</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{globalTotals.totalDone}</p>
          <p className="text-xs text-muted-foreground">FUPs Feitos</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{globalTotals.totalDoneToday}</p>
          <p className="text-xs text-muted-foreground">FUPs Feitos Hoje</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{globalTotals.totalPending}</p>
          <p className="text-xs text-muted-foreground">FUPs Pendentes</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{globalTotals.carrosDispensadoConcluido}</p>
          <p className="text-xs text-muted-foreground">Carros Ganhos (Disp.)</p>
        </div>
      </div>

      {/* Global by FUP number */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold mb-4">Leads por Etapa de Follow-up</h2>
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => {
            const data = globalByNumber[n];
            if (!data || (data.pending === 0 && data.completed === 0)) return (
              <div key={n} className="rounded-lg bg-muted/30 p-3 text-center opacity-50">
                <p className="text-xs font-semibold text-muted-foreground">FUP {n}</p>
                <p className="text-lg font-bold">0</p>
              </div>
            );
            return (
              <div key={n} className="rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xs font-semibold text-muted-foreground">FUP {n}</p>
                <p className="text-lg font-bold">{data.pending + data.completed}</p>
                <div className="flex justify-center gap-1 mt-1">
                  <span className="text-xs text-success">✓{data.completed}</span>
                  <span className="text-xs text-warning">⏳{data.pending}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agent breakdown */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold mb-4">Detalhamento por Agente</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground w-8"></th>
                <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <th key={n} className="text-center py-2 font-medium text-muted-foreground text-xs">F{n}</th>
                ))}
                <th className="text-center py-2 font-medium text-muted-foreground text-xs">PROC. ✓</th>
                <th className="text-center py-2 font-medium text-muted-foreground text-xs">PROC. ⏳</th>
                <th className="text-center py-2 font-medium text-muted-foreground text-xs">FUPs ✓</th>
                <th className="text-center py-2 font-medium text-muted-foreground text-xs">FUPs HOJE</th>
                <th className="text-center py-2 font-medium text-muted-foreground text-xs">🚗 GANHOS</th>
              </tr>
            </thead>
            <tbody>
              {agentFupBreakdown.map((a) => (
                <Fragment key={a.id}>
                  <tr className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedAgent(expandedAgent === a.id ? null : a.id)}>
                    <td className="py-3">
                      {expandedAgent === a.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </td>
                    <td className="py-3 font-medium">{a.nome}</td>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                      const d = a.byNumber[n];
                      return (
                        <td key={n} className="py-3 text-center text-xs">
                          {d.pending + d.completed > 0 ? (
                            <span>
                              <span className="text-success">{d.completed}</span>
                              <span className="text-muted-foreground">/</span>
                              <span className="text-warning">{d.pending}</span>
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                      );
                    })}
                    <td className="py-3 text-center text-success font-semibold">{a.processesConcluidosFull.length}</td>
                    <td className="py-3 text-center">
                      {a.processesPending.length > 0 ? (
                        <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">{a.processesPending.length}</Badge>
                      ) : <span className="text-success">0</span>}
                    </td>
                    <td className="py-3 text-center text-primary font-semibold">{a.totalFupsDone}</td>
                    <td className="py-3 text-center text-primary font-semibold">{a.totalFupsDoneToday}</td>
                    <td className="py-3 text-center">
                      {a.carrosGanhosDispensado.length > 0 ? (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                          <Car className="h-3 w-3 mr-1" />{a.carrosGanhosDispensado.length}
                        </Badge>
                      ) : <span className="text-muted-foreground">0</span>}
                    </td>
                  </tr>
                  {expandedAgent === a.id && (
                    <tr>
                      <td colSpan={14} className="p-0">
                        <div className="bg-muted/20 p-4">
                          <Tabs defaultValue="concluidos" className="w-full">
                            <TabsList className="mb-3">
                              <TabsTrigger value="concluidos">Processos Concluídos ({a.processesConcluidosFull.length})</TabsTrigger>
                              <TabsTrigger value="pendentes">Pendentes ({a.processesPending.length})</TabsTrigger>
                              {a.carrosGanhosDispensado.length > 0 && (
                                <TabsTrigger value="carros">Carros Ganhos ({a.carrosGanhosDispensado.length})</TabsTrigger>
                              )}
                            </TabsList>
                            <TabsContent value="concluidos" className="space-y-2">
                              {a.processesConcluidosFull.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">Nenhum processo concluído.</p>
                              ) : a.processesConcluidosFull.map((lead) => {
                                const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
                                const leadFups = allFollowUps.filter((e) => e.id_lead === lead.id);
                                const done = leadFups.filter((e) => e.concluido).length;
                                return (
                                  <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border cursor-pointer hover:bg-muted/50" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm">{lead.nome}</span>
                                        <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(lead.etapa)}`}>{etapa?.label || lead.etapa}</Badge>
                                        <Badge variant="outline" className="text-xs">{done} FUPs feitos</Badge>
                                        {lead.fup_concluido_numero && (
                                          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                                            Concluído no F{lead.fup_concluido_numero}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                        <span>{formatPhone(lead.telefone)}</span>
                                        {lead.numero_os && <span>OS: {lead.numero_os}</span>}
                                        <span>{getUnitName(lead.id_unidade)}</span>
                                        {lead.fup_motivo_conclusao && <span className="italic">"{lead.fup_motivo_conclusao}"</span>}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </TabsContent>
                            <TabsContent value="pendentes" className="space-y-2">
                              {a.processesPending.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">Nenhum processo pendente.</p>
                              ) : a.processesPending.map((lead) => {
                                const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
                                const leadFups = allFollowUps.filter((e) => e.id_lead === lead.id);
                                const done = leadFups.filter((e) => e.concluido).length;
                                const pending = leadFups.filter((e) => !e.concluido).length;
                                return (
                                  <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border cursor-pointer hover:bg-muted/50" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                                    <Clock className="h-4 w-4 text-warning shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm">{lead.nome}</span>
                                        <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(lead.etapa)}`}>{etapa?.label || lead.etapa}</Badge>
                                        <Badge variant="secondary" className="text-xs">{done} feitos / {pending} pendentes</Badge>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                        <span>{formatPhone(lead.telefone)}</span>
                                        {lead.numero_os && <span>OS: {lead.numero_os}</span>}
                                        <span>{getUnitName(lead.id_unidade)}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </TabsContent>
                            {a.carrosGanhosDispensado.length > 0 && (
                              <TabsContent value="carros" className="space-y-2">
                                {a.carrosGanhosDispensado.map((lead) => {
                                  const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
                                  return (
                                    <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border cursor-pointer hover:bg-muted/50" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                                      <Car className="h-4 w-4 text-primary shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium text-sm">{lead.nome}</span>
                                          <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(lead.etapa)}`}>{etapa?.label || lead.etapa}</Badge>
                                          {lead.fup_concluido_numero && (
                                            <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">F{lead.fup_concluido_numero}</Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                          <span>{formatPhone(lead.telefone)}</span>
                                          {lead.numero_os && <span>OS: {lead.numero_os}</span>}
                                          <span>{getUnitName(lead.id_unidade)}</span>
                                          {lead.fup_motivo_conclusao && <span className="italic">"{lead.fup_motivo_conclusao}"</span>}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </TabsContent>
                            )}
                          </Tabs>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filters + Fichas list */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={agenteFilter} onValueChange={setAgenteFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Agentes</SelectItem>
            {agentes.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="completed">Processos Concluídos</SelectItem>
            <SelectItem value="pending">Processos Pendentes</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filteredLeadsList.length} fichas</span>
      </div>

      <div className="space-y-2">
        {filteredLeadsList.map(renderLeadCard)}
        {filteredLeadsList.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum processo de follow-up encontrado.</p>
        )}
      </div>

      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};
