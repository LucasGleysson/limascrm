import { Fragment, useMemo, useState, useCallback } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { TablePagination } from "@/components/TablePagination";
import { Lead, ETAPAS_FUNIL } from "@/data/mockData";
import { formatPhone } from "@/lib/phoneUtils";
import { getStatusBadgeClass } from "@/lib/leadUtils";
import { appendNota } from "@/lib/notasUtils";
import { usePagination } from "@/hooks/usePagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  CheckCircle2, Clock, User, ChevronRight, ChevronDown, FileText, Phone, Car, Flag, Search,
  XSquare, Skull,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const FollowUpTrackingPanel = () => {
  const { leads, eventos, profiles, unidades, updateLead } = useLeads();
  const { currentUser } = useRole();
  const agentes = useMemo(() => profiles.filter((p) => p.cargo === "agente"), [profiles]);
  const [agenteFilter, setAgenteFilter] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchConcluded, setSearchConcluded] = useState("");
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  // Encerrar FUP dialog state
  const [encerrarOpen, setEncerrarOpen] = useState(false);
  const [encerrarLead, setEncerrarLead] = useState<Lead | null>(null);
  const [encerrarMotivo, setEncerrarMotivo] = useState("");
  const [encerrarLoading, setEncerrarLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const isConcludedOnDay = (iso?: string | null) => !!iso && iso.slice(0, 10) === today;

  const allFollowUps = useMemo(() => eventos.filter((e) => e.tipo === "followup"), [eventos]);

  const categorizeLead = (lead: Lead): string => {
    if (lead.etapa === "novo" || lead.etapa === "desqualificado_novo") return "novo";
    if (["agendado", "reagendado", "desqualificado_agendado"].includes(lead.etapa)) return "agendado";
    if (["dispensado", "perdido"].includes(lead.etapa)) return "dispensado";
    if (["confirmado", "na_loja", "concluido"].includes(lead.etapa)) return "loja";
    return "outro";
  };

  // Smart status logic when closing FUP
  const getEncerrarStatus = useCallback((lead: Lead): string => {
    // Post-store: na_loja, dispensado, confirmado → analise_supervisor (not directly perdido)
    if (["na_loja", "dispensado", "confirmado"].includes(lead.etapa)) return "analise_supervisor";
    // Scheduled but no visit → desqualificado_agendado
    if (["agendado", "reagendado"].includes(lead.etapa)) return "desqualificado_agendado";
    // New lead → desqualificado_novo
    if (["novo", "desqualificado"].includes(lead.etapa)) return "desqualificado_novo";
    // Already terminal
    return lead.etapa;
  }, []);

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

  const isLeadPendingForToday = useCallback((lead: Lead) => {
    if (lead.fup_concluido) return false;
    if (lead.etapa === "dispensado") return true;
    if (lead.etapa === "novo") return true;
    if (["agendado", "reagendado"].includes(lead.etapa)) {
      // Include tomorrow for day-before reminders
      return !!lead.data_agendamento && lead.data_agendamento <= tomorrowStr;
    }
    return false;
  }, [today, tomorrowStr]);

  const handleEncerrarFup = useCallback(async () => {
    if (!encerrarLead || !encerrarMotivo.trim() || encerrarLoading) return;
    setEncerrarLoading(true);
    try {
      const newStatus = getEncerrarStatus(encerrarLead);
      const statusLabel = ETAPAS_FUNIL.find((e) => e.id === newStatus)?.label || newStatus;
      const notas = appendNota(encerrarLead.notas, "Processo FUP Encerrado", `${encerrarMotivo.trim()} → Status: ${statusLabel}`);
      await updateLead(encerrarLead.id, {
        fup_concluido: true,
        fup_concluido_em: new Date().toISOString(),
        fup_concluido_numero: allFollowUps.filter((e) => e.id_lead === encerrarLead.id && e.concluido).length,
        fup_motivo_conclusao: encerrarMotivo.trim(),
        etapa: newStatus,
        notas,
      });
      setEncerrarOpen(false);
      setEncerrarLead(null);
      setEncerrarMotivo("");
    } finally {
      setEncerrarLoading(false);
    }
  }, [encerrarLead, encerrarMotivo, encerrarLoading, getEncerrarStatus, updateLead, allFollowUps]);

  const openEncerrar = useCallback((lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    setEncerrarLead(lead);
    setEncerrarMotivo("");
    setEncerrarOpen(true);
  }, []);

  const agentFupBreakdown = useMemo(() => {
    return agentes
      .map((ag) => {
        const agLeads = leads.filter((l) => l.id_agente === ag.id);
        const leadById = new Map(agLeads.map((l) => [l.id, l]));
        const agLeadIds = new Set(agLeads.map((l) => l.id));
        const agFups = allFollowUps.filter((e) => agLeadIds.has(e.id_lead));
        const pendingFupsToday = agFups.filter((e) => {
          if (e.concluido || e.data_prevista > today) return false;
          const lead = leadById.get(e.id_lead);
          return !!lead && isLeadPendingForToday(lead);
        });

        const byNumber: Record<number, { pending: number; completed: number }> = {};
        for (let i = 1; i <= 7; i++) {
          const nFups = agFups.filter((e) => e.numero === i);
          const nPendingToday = pendingFupsToday.filter((e) => e.numero === i);
          byNumber[i] = {
            pending: nPendingToday.length,
            completed: nFups.filter((e) => e.concluido).length,
          };
        }

        const leadIdsWithFup = new Set(agFups.map((e) => e.id_lead));
        const leadsWithFup = agLeads.filter((l) => leadIdsWithFup.has(l.id));
        const processesConcluidosFull = leadsWithFup.filter((l) => l.fup_concluido);
        const processPendingIds = new Set(pendingFupsToday.map((e) => e.id_lead));
        const processesPending = Array.from(processPendingIds)
          .map((id) => leadById.get(id))
          .filter((lead): lead is Lead => !!lead);

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
          totalFupsPending: pendingFupsToday.length,
          totalFupsDoneToday: agFups.filter((e) => e.concluido && isConcludedOnDay(e.data_conclusao)).length,
          carrosGanhosDispensado,
          leadsWithFup,
        };
      })
      .filter((a) => a.totalProcesses > 0)
      .sort((a, b) => b.totalFupsDone - a.totalFupsDone);
  }, [agentes, leads, allFollowUps, today, isLeadPendingForToday]);

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
    const leadById = new Map(relevantLeads.map((l) => [l.id, l]));
    const concluded = relevantLeads.filter((l) => l.fup_concluido);
    const pending = relevantLeads.filter((l) => !l.fup_concluido && isLeadPendingForToday(l));
    const pendingFupsToday = allFollowUps.filter((e) => {
      if (e.concluido || e.data_prevista > today) return false;
      const lead = leadById.get(e.id_lead);
      return !!lead && isLeadPendingForToday(lead);
    });

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
      totalPending: pendingFupsToday.length,
      carrosDispensadoConcluido: concluded.filter((l) => dispensaLeadIds.has(l.id)).length,
    };
  }, [allFollowUps, leads, today, isLeadPendingForToday]);

  const getAgentName = (id: string) => profiles.find((p) => p.id === id)?.nome || "—";
  const getUnitName = (id?: string | null) => (id ? unidades.find((u) => u.id === id)?.nome || "—" : "—");

  // Pending leads (unified single list with inline encerrar button)
  const pendingLeadsList = useMemo(() => {
    let agentData = agentFupBreakdown;
    if (agenteFilter !== "todos") agentData = agentData.filter((a) => a.id === agenteFilter);

    const allPending: Lead[] = [];
    for (const ag of agentData) allPending.push(...ag.processesPending);
    const seen = new Set<string>();
    const unique = allPending.filter((l) => { if (seen.has(l.id)) return false; seen.add(l.id); return true; });

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return unique.filter((l) => l.nome.toLowerCase().includes(q) || l.telefone.includes(q));
    }
    return unique;
  }, [agentFupBreakdown, agenteFilter, searchQuery]);

  // Concluded leads (for accordion section)
  const concludedLeadsList = useMemo(() => {
    let agentData = agentFupBreakdown;
    if (agenteFilter !== "todos") agentData = agentData.filter((a) => a.id === agenteFilter);

    const allConcluded: Lead[] = [];
    for (const ag of agentData) allConcluded.push(...ag.processesConcluidosFull);
    const seen = new Set<string>();
    const unique = allConcluded.filter((l) => { if (seen.has(l.id)) return false; seen.add(l.id); return true; });

    if (searchConcluded.trim()) {
      const q = searchConcluded.trim().toLowerCase();
      return unique.filter((l) => l.nome.toLowerCase().includes(q) || l.telefone.includes(q));
    }
    return unique;
  }, [agentFupBreakdown, agenteFilter, searchConcluded]);

  const pendingPagination = usePagination(pendingLeadsList, { pageSize: 20 });
  const concludedPagination = usePagination(concludedLeadsList, { pageSize: 20 });

  const renderPendingCard = (lead: Lead) => {
    const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
    const leadFups = allFollowUps.filter((e) => e.id_lead === lead.id);
    const done = leadFups.filter((e) => e.concluido).length;
    const pending = leadFups.filter((e) => !e.concluido).length;
    const newStatus = getEncerrarStatus(lead);
    const newStatusLabel = ETAPAS_FUNIL.find((e) => e.id === newStatus)?.label || newStatus;

    return (
      <div
        key={lead.id}
        className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-all"
      >
        <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 bg-warning/10">
          <Clock className="h-4 w-4 text-warning" />
        </div>
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => { setDetailLead(lead); setDetailOpen(true); }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{lead.nome}</span>
            <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(lead.etapa)}`}>
              {etapa?.label || lead.etapa}
            </Badge>
            <Badge variant="secondary" className="text-xs">{done} feitos / {pending} pend.</Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{formatPhone(lead.telefone)}</span>
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{getAgentName(lead.id_agente)}</span>
            <span>{getUnitName(lead.id_unidade)}</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={(e) => openEncerrar(lead, e)}
          title={`Encerrar → ${newStatusLabel}`}
        >
          <XSquare className="h-3.5 w-3.5" /> Encerrar
        </Button>
      </div>
    );
  };

  const renderConcludedCard = (lead: Lead) => {
    const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
    const leadFups = allFollowUps.filter((e) => e.id_lead === lead.id);
    const done = leadFups.filter((e) => e.concluido).length;
    const category = categorizeLead(lead);

    return (
      <div
        key={lead.id}
        className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border cursor-pointer hover:bg-muted/50"
        onClick={() => { setDetailLead(lead); setDetailOpen(true); }}
      >
        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{lead.nome}</span>
            <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(lead.etapa)}`}>{etapa?.label || lead.etapa}</Badge>
            <Badge variant="outline" className="text-xs">{done} FUPs</Badge>
            {lead.fup_concluido_numero && (
              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                <Flag className="h-3 w-3 mr-1" />F{lead.fup_concluido_numero}
              </Badge>
            )}
            {category === "dispensado" && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                <Car className="h-3 w-3 mr-1" />Carro ganho
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
            <span>{formatPhone(lead.telefone)}</span>
            <span>{getAgentName(lead.id_agente)}</span>
            <span>{getUnitName(lead.id_unidade)}</span>
            {lead.fup_motivo_conclusao && <span className="italic">"{lead.fup_motivo_conclusao}"</span>}
          </div>
        </div>
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
          <p className="text-xs text-muted-foreground">Concluídos</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-warning">{globalTotals.pending}</p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{globalTotals.totalDone}</p>
          <p className="text-xs text-muted-foreground">FUPs Feitos</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{globalTotals.totalDoneToday}</p>
          <p className="text-xs text-muted-foreground">FUPs Hoje</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{globalTotals.totalPending}</p>
          <p className="text-xs text-muted-foreground">FUPs Pendentes</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{globalTotals.carrosDispensadoConcluido}</p>
          <p className="text-xs text-muted-foreground">Carros Ganhos</p>
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

      {/* Agent breakdown table */}
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
                <th className="text-center py-2 font-medium text-muted-foreground text-xs">PROC. ⏳ HOJE</th>
                <th className="text-center py-2 font-medium text-muted-foreground text-xs">FUPs ✓</th>
                <th className="text-center py-2 font-medium text-muted-foreground text-xs">FUPs HOJE</th>
                <th className="text-center py-2 font-medium text-muted-foreground text-xs">🚗</th>
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
                        <div className="bg-muted/20 p-4 space-y-2 max-h-[300px] overflow-y-auto">
                          {a.processesPending.map((lead) => renderPendingCard(lead))}
                          {a.processesConcluidosFull.length > 0 && (
                            <Accordion type="single" collapsible className="mt-2">
                              <AccordionItem value="concluded" className="border-none">
                                <AccordionTrigger className="text-xs text-muted-foreground py-2 hover:no-underline">
                                  Concluídos ({a.processesConcluidosFull.length})
                                </AccordionTrigger>
                                <AccordionContent className="space-y-2 pt-1">
                                  {a.processesConcluidosFull.map((lead) => renderConcludedCard(lead))}
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          )}
                          {a.processesPending.length === 0 && a.processesConcluidosFull.length === 0 && (
                            <p className="text-xs text-muted-foreground py-2">Nenhum processo.</p>
                          )}
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

      {/* Filters + Pending leads */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Processos Pendentes do Dia ({pendingLeadsList.length})</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={agenteFilter} onValueChange={setAgenteFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Agentes</SelectItem>
              {agentes.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{pendingLeadsList.length} fichas</span>
        </div>

        <div className="space-y-2">
          {pendingPagination.paginatedItems.map(renderPendingCard)}
          {pendingLeadsList.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum processo pendente.</p>
          )}
        </div>

        {pendingLeadsList.length > 20 && (
          <TablePagination
            currentPage={pendingPagination.currentPage}
            totalPages={pendingPagination.totalPages}
            totalItems={pendingPagination.totalItems}
            pageSize={pendingPagination.pageSize}
            onPageChange={pendingPagination.goToPage}
            hasNextPage={pendingPagination.hasNextPage}
            hasPrevPage={pendingPagination.hasPrevPage}
          />
        )}
      </div>

      {/* Concluded — collapsible accordion */}
      <Accordion type="single" collapsible>
        <AccordionItem value="concluded" className="rounded-xl border border-border bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <span className="flex items-center gap-2 text-lg font-semibold">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Processos Concluídos ({concludedLeadsList.length})
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar concluídos..."
                value={searchConcluded}
                onChange={(e) => setSearchConcluded(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="space-y-2">
              {concludedPagination.paginatedItems.map(renderConcludedCard)}
              {concludedLeadsList.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum processo concluído.</p>
              )}
            </div>
            {concludedLeadsList.length > 20 && (
              <TablePagination
                currentPage={concludedPagination.currentPage}
                totalPages={concludedPagination.totalPages}
                totalItems={concludedPagination.totalItems}
                pageSize={concludedPagination.pageSize}
                onPageChange={concludedPagination.goToPage}
                hasNextPage={concludedPagination.hasNextPage}
                hasPrevPage={concludedPagination.hasPrevPage}
              />
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Encerrar FUP Dialog */}
      <Dialog open={encerrarOpen} onOpenChange={(v) => { if (!v) { setEncerrarMotivo(""); } setEncerrarOpen(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XSquare className="h-5 w-5 text-destructive" /> Encerrar Follow-up
            </DialogTitle>
          </DialogHeader>
          {encerrarLead && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Encerrar processo de follow-up de <strong>{encerrarLead.nome}</strong>.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p>Status atual: <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(encerrarLead.etapa)}`}>{ETAPAS_FUNIL.find((e) => e.id === encerrarLead.etapa)?.label || encerrarLead.etapa}</Badge></p>
                <p>Novo status: <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(getEncerrarStatus(encerrarLead))}`}>{ETAPAS_FUNIL.find((e) => e.id === getEncerrarStatus(encerrarLead))?.label || getEncerrarStatus(encerrarLead)}</Badge></p>
              </div>
              <div>
                <Label>Motivo do encerramento</Label>
                <Textarea
                  value={encerrarMotivo}
                  onChange={(e) => setEncerrarMotivo(e.target.value)}
                  placeholder="Ex: Cliente não retornou após múltiplas tentativas..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEncerrarMotivo(""); setEncerrarOpen(false); }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleEncerrarFup} disabled={!encerrarMotivo.trim() || encerrarLoading} className="gap-2">
              <XSquare className="h-4 w-4" /> Confirmar Encerramento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};
