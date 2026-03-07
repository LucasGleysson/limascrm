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
import { Plus, Search, Users, CalendarDays, Calendar, CalendarCheck, LogIn } from "lucide-react";
import { TablePagination } from "@/components/TablePagination";
import { AgentSchedulePanel } from "@/components/AgentSchedulePanel";
import { AgentReceptionPanel } from "@/components/AgentReceptionPanel";
import { formatPhone } from "@/lib/phoneUtils";
import { getStatusBadgeClass, formatDateBR } from "@/lib/leadUtils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const SIDEBAR_TABS = [
  { id: "leads", label: "Leads", icon: Users },
  { id: "agendamentos", label: "Agendamentos", icon: CalendarCheck },
  { id: "recepcao", label: "Recepção", icon: LogIn },
  { id: "eventos", label: "Eventos", icon: CalendarDays },
];

export const AgentDashboard = () => {
  const { leads, updateLead, eventos, unidades } = useLeads();
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

  const myLeads = useMemo(() => {
    return leads
      .filter((l) => l.id_agente === currentUser.id)
      .filter((l) => etapaFilter === "todos" || l.etapa === etapaFilter)
      .filter((l) => !search || l.nome.toLowerCase().includes(search.toLowerCase()) || l.telefone.includes(search))
      .filter((l) => {
        if (!dateStart) return true;
        const d = new Date(l.data_entrada);
        return d >= dateStart;
      })
      .filter((l) => {
        if (!dateEnd) return true;
        const d = new Date(l.data_entrada);
        const end = new Date(dateEnd);
        end.setHours(23, 59, 59);
        return d <= end;
      });
  }, [leads, currentUser.id, etapaFilter, search, dateStart, dateEnd]);

  const pagination = usePagination(myLeads, { pageSize: 15 });

  const etapaCounts = useMemo(() => {
    const mine = leads.filter((l) => l.id_agente === currentUser.id);
    const counts: Record<string, number> = { todos: mine.length };
    ETAPAS_FUNIL.forEach((e) => {
      counts[e.id] = mine.filter((l) => l.etapa === e.id).length;
    });
    return counts;
  }, [leads, currentUser.id]);

  const handleMoveEtapa = async (lead: Lead, novaEtapa: string) => {
    if (novaEtapa === "agendado") {
      setScheduleLead({ id: lead.id, nome: lead.nome });
      setScheduleOpen(true);
      return;
    }
    await updateLead(lead.id, { etapa: novaEtapa });
  };

  const getStatusBadge = getStatusBadgeClass;

  const pendingEvents = useMemo(() => {
    return eventos.filter((e) => !e.concluido && e.id_usuario === currentUser.id);
  }, [eventos, currentUser.id]);

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
                  etapaFilter === "todos"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground hover:border-primary/30"
                }`}
              >
                Todos ({etapaCounts.todos})
              </button>
              {ETAPAS_FUNIL.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEtapaFilter(e.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    etapaFilter === e.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground hover:border-primary/30"
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
                  <CalendarComponent mode="single" selected={dateStart} onSelect={setDateStart} locale={ptBR} />
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
                  <CalendarComponent mode="single" selected={dateEnd} onSelect={setDateEnd} locale={ptBR} />
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
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{formatDateBR(lead.data_entrada)}</TableCell>
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
          </div>
        )}

        {activeTab === "agendamentos" && <AgentSchedulePanel />}
        {activeTab === "recepcao" && <AgentReceptionPanel />}
        {activeTab === "eventos" && <EventoPanel />}
      </main>

      <NewLeadModal open={newLeadOpen} onOpenChange={setNewLeadOpen} />
      {scheduleLead && (
        <ScheduleModal open={scheduleOpen} onOpenChange={setScheduleOpen} leadId={scheduleLead.id} leadNome={scheduleLead.nome} />
      )}
      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};

export default AgentDashboard;