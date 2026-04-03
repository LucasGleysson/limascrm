import { useMemo, useState } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { ETAPAS_FUNIL, Lead } from "@/data/mockData";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPhone } from "@/lib/phoneUtils";
import { getStatusBadgeClass } from "@/lib/leadUtils";
import { CheckCircle2, Clock, Skull, XCircle } from "lucide-react";
import { appendNota } from "@/lib/notasUtils";

export const DispensaReportPanel = () => {
  const { leads, eventos, profiles, unidades, updateLead } = useLeads();
  const agentes = useMemo(() => profiles.filter((p) => p.cargo === "agente"), [profiles]);

  const [agenteFilter, setAgenteFilter] = useState("todos");
  const [processoFilter, setProcessoFilter] = useState<"todos" | "concluido" | "pendente" | "analise">("todos");
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const dispensaFollowups = useMemo(
    () => eventos.filter((e) => e.tipo === "followup" && (e.descricao || "").toLowerCase().includes("dispensado")),
    [eventos],
  );

  const dispensaFollowupsByLead = useMemo(() => {
    const map = new Map<string, typeof dispensaFollowups>();
    for (const evento of dispensaFollowups) {
      const list = map.get(evento.id_lead) || [];
      list.push(evento);
      map.set(evento.id_lead, list);
    }
    return map;
  }, [dispensaFollowups]);

  const dispensaLeadIds = useMemo(() => {
    const ids = new Set<string>();
    for (const lead of leads) {
      if (["dispensado", "perdido", "analise_supervisor"].includes(lead.etapa)) ids.add(lead.id);
    }
    for (const evento of dispensaFollowups) {
      ids.add(evento.id_lead);
    }
    return ids;
  }, [leads, dispensaFollowups]);

  const allDispensaLeads = useMemo(
    () => leads.filter((lead) => dispensaLeadIds.has(lead.id)),
    [leads, dispensaLeadIds],
  );

  const filteredLeads = useMemo(() => {
    return allDispensaLeads.filter((lead) => {
      if (agenteFilter !== "todos" && lead.id_agente !== agenteFilter) return false;
      if (processoFilter === "concluido" && !lead.fup_concluido) return false;
      if (processoFilter === "pendente" && lead.fup_concluido) return false;
      if (processoFilter === "analise" && lead.etapa !== "analise_supervisor") return false;
      return true;
    });
  }, [allDispensaLeads, agenteFilter, processoFilter]);

  const totals = useMemo(() => {
    const concluidos = allDispensaLeads.filter((lead) => lead.fup_concluido).length;
    const pendentes = allDispensaLeads.length - concluidos;
    const analise = allDispensaLeads.filter((lead) => lead.etapa === "analise_supervisor").length;
    return { total: allDispensaLeads.length, concluidos, pendentes, analise };
  }, [allDispensaLeads]);

  const getAgentName = (id: string) => profiles.find((p) => p.id === id)?.nome || "—";
  const getUnitName = (id?: string | null) => (id ? unidades.find((u) => u.id === id)?.nome || "—" : "—");

  const handleDecision = async (lead: Lead, decision: "perdido" | "desqualificado_agendado") => {
    const label = decision === "perdido" ? "Perda" : "Desqualificado";
    const notas = appendNota(lead.notas, `Supervisor: ${label}`, `Decisão do supervisor após análise`);
    await updateLead(lead.id, { etapa: decision, notas });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Análise de Leads</h1>
        <p className="text-muted-foreground text-sm">Dispensados, perdas e leads aguardando decisão do supervisor</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{totals.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-xl border border-warning/30 bg-card p-4 text-center">
          <p className="text-2xl font-bold text-warning">{totals.analise}</p>
          <p className="text-xs text-muted-foreground">Aguardando Análise</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-success">{totals.concluidos}</p>
          <p className="text-xs text-muted-foreground">Processos concluídos</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{totals.pendentes}</p>
          <p className="text-xs text-muted-foreground">Processos pendentes</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={agenteFilter} onValueChange={setAgenteFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filtrar por agente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os agentes</SelectItem>
            {agentes.map((ag) => (
              <SelectItem key={ag.id} value={ag.id}>{ag.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={processoFilter} onValueChange={(v) => setProcessoFilter(v as any)}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="analise">Aguardando Análise</SelectItem>
            <SelectItem value="concluido">Processos concluídos</SelectItem>
            <SelectItem value="pendente">Processos pendentes</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground">{filteredLeads.length} fichas</span>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CLIENTE</TableHead>
              <TableHead>AGENTE</TableHead>
              <TableHead>LOJA</TableHead>
              <TableHead>STATUS ATUAL</TableHead>
              <TableHead className="text-center">FUP DISPENSA</TableHead>
              <TableHead className="text-center">AÇÕES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Nenhum cliente encontrado para este filtro.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads
                .sort((a, b) => {
                  if (a.etapa === "analise_supervisor" && b.etapa !== "analise_supervisor") return -1;
                  if (b.etapa === "analise_supervisor" && a.etapa !== "analise_supervisor") return 1;
                  return 0;
                })
                .map((lead) => {
                  const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
                  const leadDispensaFups = dispensaFollowupsByLead.get(lead.id) || [];
                  const done = leadDispensaFups.filter((e) => e.concluido).length;
                  const pending = leadDispensaFups.filter((e) => !e.concluido).length;

                  return (
                    <TableRow
                      key={lead.id}
                      className={`cursor-pointer hover:bg-muted/50 ${lead.etapa === "analise_supervisor" ? "bg-warning/5" : ""}`}
                      onClick={() => { setDetailLead(lead); setDetailOpen(true); }}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{lead.nome}</p>
                          <p className="text-xs text-muted-foreground">{formatPhone(lead.telefone)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{getAgentName(lead.id_agente)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{getUnitName(lead.id_unidade)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(lead.etapa)}`}>
                          {etapa?.label || lead.etapa}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {done} ✓ / {pending} ⏳
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {lead.etapa === "analise_supervisor" ? (
                          <div className="flex items-center gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm" variant="outline"
                              onClick={() => handleDecision(lead, "perdido")}
                              className="gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                            >
                              <Skull className="h-3.5 w-3.5" /> Perda
                            </Button>
                            <Button
                              size="sm" variant="outline"
                              onClick={() => handleDecision(lead, "desqualificado_agendado")}
                              className="gap-1 text-xs"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Desq.
                            </Button>
                          </div>
                        ) : lead.fup_concluido ? (
                          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />Concluído
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-muted">
                            <Clock className="h-3 w-3 mr-1" />Pendente
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </div>

      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};
