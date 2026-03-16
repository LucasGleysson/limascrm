import { useMemo, useState } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { ETAPAS_FUNIL, Lead } from "@/data/mockData";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPhone } from "@/lib/phoneUtils";
import { getStatusBadgeClass } from "@/lib/leadUtils";
import { CheckCircle2, Clock, Car } from "lucide-react";

export const DispensaReportPanel = () => {
  const { leads, eventos, profiles, unidades } = useLeads();
  const agentes = useMemo(() => profiles.filter((p) => p.cargo === "agente"), [profiles]);

  const [agenteFilter, setAgenteFilter] = useState("todos");
  const [processoFilter, setProcessoFilter] = useState<"todos" | "concluido" | "pendente">("todos");
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const dispensaFollowups = useMemo(
    () =>
      eventos.filter(
        (e) => e.tipo === "followup" && (e.descricao || "").toLowerCase().includes("dispensado"),
      ),
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
      if (["dispensado", "perdido"].includes(lead.etapa)) ids.add(lead.id);
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
      return true;
    });
  }, [allDispensaLeads, agenteFilter, processoFilter]);

  const totals = useMemo(() => {
    const concluidos = filteredLeads.filter((lead) => lead.fup_concluido).length;
    const pendentes = filteredLeads.length - concluidos;

    const fupsConcluidos = dispensaFollowups.filter((e) => e.concluido).length;
    const today = new Date().toISOString().split("T")[0];
    const fupsConcluidosHoje = dispensaFollowups.filter(
      (e) => e.concluido && e.data_conclusao && e.data_conclusao.slice(0, 10) === today,
    ).length;

    return {
      total: filteredLeads.length,
      concluidos,
      pendentes,
      fupsConcluidos,
      fupsConcluidosHoje,
    };
  }, [filteredLeads, dispensaFollowups]);

  const getAgentName = (id: string) => profiles.find((p) => p.id === id)?.nome || "—";
  const getUnitName = (id?: string | null) => (id ? unidades.find((u) => u.id === id)?.nome || "—" : "—");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatório de dispensa</h1>
        <p className="text-muted-foreground text-sm">Clientes dispensados e status do processo de follow-up</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{totals.total}</p>
          <p className="text-xs text-muted-foreground">Clientes dispensados</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-success">{totals.concluidos}</p>
          <p className="text-xs text-muted-foreground">Processos concluídos</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-warning">{totals.pendentes}</p>
          <p className="text-xs text-muted-foreground">Processos pendentes</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{totals.fupsConcluidos}</p>
          <p className="text-xs text-muted-foreground">FUPs concluídos (dispensa)</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{totals.fupsConcluidosHoje}</p>
          <p className="text-xs text-muted-foreground">FUPs concluídos hoje</p>
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
              <SelectItem key={ag.id} value={ag.id}>
                {ag.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={processoFilter} onValueChange={(v) => setProcessoFilter(v as "todos" | "concluido" | "pendente")}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Status do processo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os processos</SelectItem>
            <SelectItem value="concluido">Somente concluídos</SelectItem>
            <SelectItem value="pendente">Somente pendentes</SelectItem>
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
              <TableHead className="text-center">PROCESSO</TableHead>
              <TableHead>DETALHE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Nenhum cliente encontrado para este filtro.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads
                .sort((a, b) => Number(Boolean(b.fup_concluido)) - Number(Boolean(a.fup_concluido)))
                .map((lead) => {
                  const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
                  const leadDispensaFups = dispensaFollowupsByLead.get(lead.id) || [];
                  const done = leadDispensaFups.filter((e) => e.concluido).length;
                  const pending = leadDispensaFups.filter((e) => !e.concluido).length;

                  return (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setDetailLead(lead);
                        setDetailOpen(true);
                      }}
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
                        {lead.fup_concluido ? (
                          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />Concluído
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                            <Clock className="h-3 w-3 mr-1" />Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {lead.fup_concluido_numero && (
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                              <Car className="h-3 w-3 mr-1" />Concluído no F{lead.fup_concluido_numero}
                            </Badge>
                          )}
                          {lead.fup_motivo_conclusao && <span className="italic">"{lead.fup_motivo_conclusao}"</span>}
                        </div>
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