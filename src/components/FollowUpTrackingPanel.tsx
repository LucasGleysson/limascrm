import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { Badge } from "@/components/ui/badge";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { Lead, ETAPAS_FUNIL } from "@/data/mockData";
import { formatPhone } from "@/lib/phoneUtils";
import { formatDateBR, getStatusBadgeClass } from "@/lib/leadUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, User, ChevronRight, ChevronDown, FileText, Phone } from "lucide-react";

export const FollowUpTrackingPanel = () => {
  const { leads, eventos, profiles, unidades } = useLeads();
  const agentes = useMemo(() => profiles.filter((p) => p.cargo === "agente"), [profiles]);
  const [agenteFilter, setAgenteFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  // All followup events (including dispensados now)
  const allFollowUps = useMemo(() => eventos.filter((e) => e.tipo === "followup"), [eventos]);

  // Per-agent detailed FUP breakdown (F1-F7 pending/completed)
  const agentFupBreakdown = useMemo(() => {
    return agentes.map((ag) => {
      const agLeadIds = new Set(leads.filter((l) => l.id_agente === ag.id).map((l) => l.id));
      const agFups = allFollowUps.filter((e) => agLeadIds.has(e.id_lead));

      // Per-number breakdown
      const byNumber: Record<number, { pending: number; completed: number }> = {};
      for (let i = 1; i <= 7; i++) {
        const nFups = agFups.filter((e) => e.numero === i);
        byNumber[i] = {
          pending: nFups.filter((e) => !e.concluido).length,
          completed: nFups.filter((e) => e.concluido).length,
        };
      }

      // Unique leads with followups
      const leadIdsWithFup = new Set(agFups.map((e) => e.id_lead));
      const leadsWithFup = leads.filter((l) => leadIdsWithFup.has(l.id));

      // Process-level stats: a "process" is complete when ALL its followups are concluded
      const processMap = new Map<string, { total: number; done: number }>();
      for (const e of agFups) {
        const entry = processMap.get(e.id_lead) || { total: 0, done: 0 };
        entry.total++;
        if (e.concluido) entry.done++;
        processMap.set(e.id_lead, entry);
      }

      const processesComplete = Array.from(processMap.values()).filter((p) => p.done === p.total && p.total > 0).length;
      const processesPending = Array.from(processMap.values()).filter((p) => p.done < p.total).length;
      const totalFupsDone = agFups.filter((e) => e.concluido).length;
      const totalFupsPending = agFups.filter((e) => !e.concluido).length;

      return {
        ...ag,
        byNumber,
        processesComplete,
        processesPending,
        totalProcesses: processMap.size,
        totalFupsDone,
        totalFupsPending,
        completedLeads: leadsWithFup.filter((l) => {
          const p = processMap.get(l.id);
          return p && p.done === p.total && p.total > 0;
        }),
        pendingLeads: leadsWithFup.filter((l) => {
          const p = processMap.get(l.id);
          return p && p.done < p.total;
        }),
      };
    }).filter((a) => a.totalProcesses > 0).sort((a, b) => b.totalFupsDone - a.totalFupsDone);
  }, [agentes, leads, allFollowUps]);

  // Global metrics by FUP number
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
    const leadMap = new Map<string, { total: number; done: number }>();
    for (const e of allFollowUps) {
      const entry = leadMap.get(e.id_lead) || { total: 0, done: 0 };
      entry.total++;
      if (e.concluido) entry.done++;
      leadMap.set(e.id_lead, entry);
    }
    return {
      totalProcesses: leadMap.size,
      complete: Array.from(leadMap.values()).filter((p) => p.done === p.total && p.total > 0).length,
      pending: Array.from(leadMap.values()).filter((p) => p.done < p.total).length,
      totalDone: allFollowUps.filter((e) => e.concluido).length,
      totalPending: allFollowUps.filter((e) => !e.concluido).length,
    };
  }, [allFollowUps]);

  const getAgentName = (id: string) => profiles.find((p) => p.id === id)?.nome || "—";
  const getUnitName = (id?: string | null) => id ? unidades.find((u) => u.id === id)?.nome || "—" : "—";

  // Filtered leads list for the bottom section
  const filteredLeadsList = useMemo(() => {
    let agentData = agentFupBreakdown;
    if (agenteFilter !== "todos") agentData = agentData.filter((a) => a.id === agenteFilter);

    let allLeads: Lead[] = [];
    for (const ag of agentData) {
      if (statusFilter === "completed") allLeads.push(...ag.completedLeads);
      else if (statusFilter === "pending") allLeads.push(...ag.pendingLeads);
      else allLeads.push(...ag.completedLeads, ...ag.pendingLeads);
    }
    // Deduplicate
    const seen = new Set<string>();
    return allLeads.filter((l) => { if (seen.has(l.id)) return false; seen.add(l.id); return true; });
  }, [agentFupBreakdown, agenteFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Acompanhamento de Follow-ups</h1>
        <p className="text-muted-foreground text-sm">Processos de follow-up por agente e etapa</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
          <p className="text-xs text-muted-foreground">Follow-ups Feitos</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{globalTotals.totalPending}</p>
          <p className="text-xs text-muted-foreground">Follow-ups Pendentes</p>
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

      {/* Agent breakdown with expandable detail */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold mb-4">Detalhamento por Agente</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground"></th>
                <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <th key={n} className="text-center py-2 font-medium text-muted-foreground text-xs">F{n}</th>
                ))}
                <th className="text-center py-2 font-medium text-muted-foreground">PROC. ✓</th>
                <th className="text-center py-2 font-medium text-muted-foreground">PROC. ⏳</th>
                <th className="text-center py-2 font-medium text-muted-foreground">TOTAL FUP</th>
              </tr>
            </thead>
            <tbody>
              {agentFupBreakdown.map((a) => (
                <>
                  <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedAgent(expandedAgent === a.id ? null : a.id)}>
                    <td className="py-3 w-8">
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
                    <td className="py-3 text-center text-success font-semibold">{a.processesComplete}</td>
                    <td className="py-3 text-center">
                      {a.processesPending > 0 ? (
                        <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">{a.processesPending}</Badge>
                      ) : <span className="text-success">0</span>}
                    </td>
                    <td className="py-3 text-center text-primary font-semibold">{a.totalFupsDone}</td>
                  </tr>
                  {expandedAgent === a.id && a.completedLeads.length > 0 && (
                    <tr key={`${a.id}-fichas`}>
                      <td colSpan={12} className="p-0">
                        <div className="bg-muted/20 p-4 space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Fichas com processos concluídos ({a.completedLeads.length})</p>
                          {a.completedLeads.map((lead) => {
                            const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
                            return (
                              <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border cursor-pointer hover:bg-muted/50" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{lead.nome}</span>
                                    <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(lead.etapa)}`}>{etapa?.label || lead.etapa}</Badge>
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
                        </div>
                      </td>
                    </tr>
                  )}
                </>
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
            <SelectItem value="completed">Concluídos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filteredLeadsList.length} fichas</span>
      </div>

      <div className="space-y-2">
        {filteredLeadsList.map((lead) => {
          const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
          const leadFups = allFollowUps.filter((e) => e.id_lead === lead.id);
          const done = leadFups.filter((e) => e.concluido).length;
          const total = leadFups.length;
          const isComplete = done === total && total > 0;
          return (
            <div
              key={lead.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border cursor-pointer hover:bg-muted/50 transition-all"
              onClick={() => { setDetailLead(lead); setDetailOpen(true); }}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isComplete ? "bg-success/10" : "bg-warning/10"}`}>
                {isComplete ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Clock className="h-5 w-5 text-warning" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{lead.nome}</span>
                  <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(lead.etapa)}`}>
                    {etapa?.label || lead.etapa}
                  </Badge>
                  <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
                    {done}/{total} follow-ups
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{formatPhone(lead.telefone)}</span>
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{getAgentName(lead.id_agente)}</span>
                  <span>{getUnitName(lead.id_unidade)}</span>
                  {lead.numero_os && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />OS: {lead.numero_os}</span>}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          );
        })}
        {filteredLeadsList.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum processo de follow-up encontrado.</p>
        )}
      </div>

      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};
