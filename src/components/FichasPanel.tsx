import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { ETAPAS_FUNIL, Lead } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPhone } from "@/lib/phoneUtils";
import { formatDateBR, getStatusBadgeClass } from "@/lib/leadUtils";
import { PeriodFilter, PeriodKey, getDateRangeForPeriod } from "@/components/PeriodFilter";
import { Search, Trash2, Filter } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const FichasPanel = () => {
  const { leads, unidades, profiles, deleteLead } = useLeads();
  const agentes = useMemo(() => profiles.filter((p) => p.cargo === "agente"), [profiles]);

  const [search, setSearch] = useState("");
  const [unidadeFilter, setUnidadeFilter] = useState("todas");
  const [agenteFilter, setAgenteFilter] = useState("todos");
  const [etapaFilter, setEtapaFilter] = useState("todos");
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    let result = leads;
    if (unidadeFilter !== "todas") result = result.filter((l) => l.id_unidade === unidadeFilter);
    if (agenteFilter !== "todos") result = result.filter((l) => l.id_agente === agenteFilter);
    if (etapaFilter !== "todos") result = result.filter((l) => l.etapa === etapaFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((l) => l.nome.toLowerCase().includes(q) || l.telefone.includes(q) || (l.numero_os && l.numero_os.toLowerCase().includes(q)));
    }
    const { from } = getDateRangeForPeriod(period);
    if (from) result = result.filter((l) => l.data_entrada >= from);
    return result;
  }, [leads, unidadeFilter, agenteFilter, etapaFilter, search, period]);

  const pagination = usePagination(filtered, { pageSize: 20 });

  const getAgentName = (id: string) => profiles.find((p) => p.id === id)?.nome || "—";
  const getUnitName = (id?: string | null) => id ? unidades.find((u) => u.id === id)?.nome || "—" : "—";

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLead(deleteTarget.id);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fichas dos Clientes</h1>
          <p className="text-muted-foreground text-sm">Visão completa — {filtered.length} fichas</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Nome, telefone ou OS..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas Lojas</SelectItem>
            {unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={agenteFilter} onValueChange={setAgenteFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Agentes</SelectItem>
            {agentes.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={etapaFilter} onValueChange={setEtapaFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Status</SelectItem>
            {ETAPAS_FUNIL.map((e) => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CLIENTE</TableHead>
              <TableHead>CONTATO</TableHead>
              <TableHead>AGENTE</TableHead>
              <TableHead>LOJA</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead>AGEND.</TableHead>
              <TableHead>ENTRADA</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.paginatedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  Nenhuma ficha encontrada com os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              pagination.paginatedItems.map((lead) => {
                const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
                return (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                    <TableCell className="font-medium">{lead.nome}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatPhone(lead.telefone)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{getAgentName(lead.id_agente)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{getUnitName(lead.id_unidade)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(lead.etapa)}`}>
                        {etapa?.label || lead.etapa}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{lead.data_agendamento ? <span className="text-primary font-medium">{formatDateBR(lead.data_agendamento)}</span> : "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDateBR(lead.data_entrada)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(lead); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
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

      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>? Todos os eventos relacionados também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
