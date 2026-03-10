import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { Badge } from "@/components/ui/badge";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { Lead, ETAPAS_FUNIL } from "@/data/mockData";
import { formatPhone } from "@/lib/phoneUtils";
import { formatDateBR, getStatusBadgeClass } from "@/lib/leadUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, User, ChevronRight, FileText, Phone } from "lucide-react";

export const FollowUpTrackingPanel = () => {
  const { leads, eventos, profiles, unidades } = useLeads();
  const agentes = useMemo(() => profiles.filter((p) => p.cargo === "agente"), [profiles]);
  const [agenteFilter, setAgenteFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Group follow-up events by lead
  const followUpData = useMemo(() => {
    const followUps = eventos.filter((e) => e.tipo === "followup");
    const leadMap = new Map<string, { lead: Lead; total: number; concluidos: number; pendentes: number; lastAgent: string }>();

    for (const ev of followUps) {
      const lead = leads.find((l) => l.id === ev.id_lead);
      if (!lead) continue;

      const entry = leadMap.get(lead.id) || { lead, total: 0, concluidos: 0, pendentes: 0, lastAgent: "" };
      entry.total++;
      if (ev.concluido) {
        entry.concluidos++;
        if (ev.id_usuario) entry.lastAgent = ev.id_usuario;
      } else {
        entry.pendentes++;
      }
      leadMap.set(lead.id, entry);
    }

    let result = Array.from(leadMap.values());

    if (agenteFilter !== "todos") {
      result = result.filter((r) => r.lead.id_agente === agenteFilter);
    }

    if (statusFilter === "completed") {
      result = result.filter((r) => r.pendentes === 0);
    } else if (statusFilter === "pending") {
      result = result.filter((r) => r.pendentes > 0);
    }

    return result.sort((a, b) => b.total - a.total);
  }, [eventos, leads, agenteFilter, statusFilter]);

  // Summary stats
  const summary = useMemo(() => {
    const completed = followUpData.filter((d) => d.pendentes === 0);
    const pending = followUpData.filter((d) => d.pendentes > 0);
    const totalProcessos = followUpData.length;
    const totalEventos = followUpData.reduce((s, d) => s + d.concluidos, 0);
    return { totalProcessos, completed: completed.length, pending: pending.length, totalEventos };
  }, [followUpData]);

  // Per-agent follow-up summary
  const agentSummary = useMemo(() => {
    return agentes.map((ag) => {
      const agData = followUpData.filter((d) => d.lead.id_agente === ag.id);
      return {
        ...ag,
        total: agData.length,
        completed: agData.filter((d) => d.pendentes === 0).length,
        pending: agData.filter((d) => d.pendentes > 0).length,
        totalEventos: agData.reduce((s, d) => s + d.concluidos, 0),
      };
    }).filter((a) => a.total > 0).sort((a, b) => b.totalEventos - a.totalEventos);
  }, [followUpData, agentes]);

  const getAgentName = (id: string) => profiles.find((p) => p.id === id)?.nome || "—";
  const getUnitName = (id?: string | null) => id ? unidades.find((u) => u.id === id)?.nome || "—" : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Acompanhamento de Follow-ups</h1>
        <p className="text-muted-foreground text-sm">Processos de follow-up concluídos e pendentes por agente</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{summary.totalProcessos}</p>
          <p className="text-xs text-muted-foreground">Total de Processos</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-success">{summary.completed}</p>
          <p className="text-xs text-muted-foreground">Processos Concluídos</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-warning">{summary.pending}</p>
          <p className="text-xs text-muted-foreground">Processos Pendentes</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{summary.totalEventos}</p>
          <p className="text-xs text-muted-foreground">Follow-ups Realizados</p>
        </div>
      </div>

      {/* Agent breakdown */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold mb-4">Resumo por Agente</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                <th className="text-center py-2 font-medium text-muted-foreground">PROCESSOS</th>
                <th className="text-center py-2 font-medium text-muted-foreground">CONCLUÍDOS</th>
                <th className="text-center py-2 font-medium text-muted-foreground">PENDENTES</th>
                <th className="text-center py-2 font-medium text-muted-foreground">FOLLOW-UPS FEITOS</th>
              </tr>
            </thead>
            <tbody>
              {agentSummary.map((a) => (
                <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => setAgenteFilter(agenteFilter === a.id ? "todos" : a.id)}>
                  <td className="py-3 font-medium">{a.nome}</td>
                  <td className="py-3 text-center">{a.total}</td>
                  <td className="py-3 text-center text-success">{a.completed}</td>
                  <td className="py-3 text-center text-warning">{a.pending}</td>
                  <td className="py-3 text-center text-primary font-semibold">{a.totalEventos}</td>
                </tr>
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
        <span className="text-sm text-muted-foreground">{followUpData.length} processos</span>
      </div>

      <div className="space-y-2">
        {followUpData.map((item) => {
          const etapa = ETAPAS_FUNIL.find((e) => e.id === item.lead.etapa);
          const isComplete = item.pendentes === 0;
          return (
            <div
              key={item.lead.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border cursor-pointer hover:bg-muted/50 transition-all"
              onClick={() => { setDetailLead(item.lead); setDetailOpen(true); }}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isComplete ? "bg-success/10" : "bg-warning/10"}`}>
                {isComplete ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Clock className="h-5 w-5 text-warning" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{item.lead.nome}</span>
                  <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(item.lead.etapa)}`}>
                    {etapa?.label || item.lead.etapa}
                  </Badge>
                  <Badge variant={isComplete ? "default" : "secondary"} className="text-xs">
                    {item.concluidos}/{item.total} follow-ups
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{formatPhone(item.lead.telefone)}</span>
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{getAgentName(item.lead.id_agente)}</span>
                  <span>{getUnitName(item.lead.id_unidade)}</span>
                  {item.lead.numero_os && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />OS: {item.lead.numero_os}</span>}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          );
        })}
        {followUpData.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum processo de follow-up encontrado.</p>
        )}
      </div>

      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};
