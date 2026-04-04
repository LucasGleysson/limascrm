import { useMemo, useState } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { ETAPAS_FUNIL, Lead } from "@/data/mockData";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { formatPhone } from "@/lib/phoneUtils";
import { getStatusBadgeClass } from "@/lib/leadUtils";
import { CheckCircle2, Clock, Skull, XCircle, Search, AlertCircle } from "lucide-react";
import { appendNota } from "@/lib/notasUtils";

export const DispensaReportPanel = () => {
  const { leads, profiles, unidades, updateLead } = useLeads();
  const agentes = useMemo(() => profiles.filter((p) => p.cargo === "agente"), [profiles]);

  const [agenteFilter, setAgenteFilter] = useState("todos");
  const [etapaFilter, setEtapaFilter] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // All leads that should appear in Análise: dispensado, perdido, desq_agendado, desq_novo, analise_supervisor
  const allAnaliseLeads = useMemo(
    () => leads.filter((lead) =>
      ["dispensado", "perdido", "desqualificado_agendado", "desqualificado_novo", "analise_supervisor"].includes(lead.etapa)
    ),
    [leads],
  );

  const filteredLeads = useMemo(() => {
    return allAnaliseLeads.filter((lead) => {
      if (agenteFilter !== "todos" && lead.id_agente !== agenteFilter) return false;
      if (etapaFilter !== "todos" && lead.etapa !== etapaFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchNome = lead.nome.toLowerCase().includes(q);
        const matchTel = lead.telefone.includes(q);
        const matchOs = (lead.numero_os || "").toLowerCase().includes(q);
        if (!matchNome && !matchTel && !matchOs) return false;
      }
      return true;
    });
  }, [allAnaliseLeads, agenteFilter, etapaFilter, searchQuery]);

  // Sort: analise_supervisor first
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      if (a.etapa === "analise_supervisor" && b.etapa !== "analise_supervisor") return -1;
      if (b.etapa === "analise_supervisor" && a.etapa !== "analise_supervisor") return 1;
      return 0;
    });
  }, [filteredLeads]);

  const pagination = usePagination(sortedLeads, { pageSize: 15 });

  const totals = useMemo(() => {
    const analise = allAnaliseLeads.filter((l) => l.etapa === "analise_supervisor").length;
    const dispensados = allAnaliseLeads.filter((l) => l.etapa === "dispensado").length;
    const perdidos = allAnaliseLeads.filter((l) => l.etapa === "perdido").length;
    const desqAgendados = allAnaliseLeads.filter((l) => l.etapa === "desqualificado_agendado").length;
    const desqNovos = allAnaliseLeads.filter((l) => l.etapa === "desqualificado_novo").length;
    return { total: allAnaliseLeads.length, analise, dispensados, perdidos, desqAgendados, desqNovos };
  }, [allAnaliseLeads]);

  const getAgentName = (id: string) => profiles.find((p) => p.id === id)?.nome || "—";
  const getUnitName = (id?: string | null) => (id ? unidades.find((u) => u.id === id)?.nome || "—" : "—");

  const handleDecision = async (lead: Lead, decision: "perdido" | "desqualificado_agendado") => {
    const label = decision === "perdido" ? "Perda" : "Desqualificado";
    const notas = appendNota(lead.notas, `Supervisor: ${label}`, `Decisão do supervisor após análise`);
    await updateLead(lead.id, { etapa: decision, notas });
  };

  // Verification status: analise_supervisor = Pendente, otherwise = Analisado
  const getVerification = (lead: Lead) => {
    if (lead.etapa === "analise_supervisor") {
      return (
        <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
          <Clock className="h-3 w-3 mr-1" /> Pendente
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Analisado
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Análise de Leads</h1>
        <p className="text-muted-foreground text-sm">Dispensados, perdas e leads aguardando decisão do supervisor</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{totals.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-xl border border-warning/30 bg-card p-4 text-center">
          <p className="text-2xl font-bold text-warning">{totals.analise}</p>
          <p className="text-xs text-muted-foreground">Aguard. Análise</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{totals.dispensados}</p>
          <p className="text-xs text-muted-foreground">Dispensados</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{totals.perdidos}</p>
          <p className="text-xs text-muted-foreground">Perdidos</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{totals.desqAgendados + totals.desqNovos}</p>
          <p className="text-xs text-muted-foreground">Desqualificados</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou OS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
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

        <Select value={etapaFilter} onValueChange={setEtapaFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="analise_supervisor">Aguardando Análise</SelectItem>
            <SelectItem value="dispensado">Dispensado</SelectItem>
            <SelectItem value="perdido">Perdido</SelectItem>
            <SelectItem value="desqualificado_agendado">Desq. Agendado</SelectItem>
            <SelectItem value="desqualificado_novo">Desq. Novo</SelectItem>
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
              <TableHead>OS</TableHead>
              <TableHead className="text-center">VERIFICAÇÃO</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Nenhum cliente encontrado para este filtro.
                </TableCell>
              </TableRow>
            ) : (
              pagination.paginatedItems.map((lead) => {
                const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
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
                    <TableCell className="text-xs text-muted-foreground">{lead.numero_os || "—"}</TableCell>
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
                      ) : (
                        getVerification(lead)
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.goToPage}
          hasNextPage={pagination.hasNextPage}
          hasPrevPage={pagination.hasPrevPage}
        />
      </div>

      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};
