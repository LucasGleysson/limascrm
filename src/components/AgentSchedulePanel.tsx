import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, CalendarDays, AlertTriangle } from "lucide-react";
import { format, addDays, subDays, isToday, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDataSegura } from "@/lib/leadUtils";
import type { Lead } from "@/data/mockData";

export const AgentSchedulePanel = () => {
  const { leads, unidades, agentUnidades } = useLeads();
  const { currentUser } = useRole();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const myUnitIds = useMemo(
    () => new Set(
      agentUnidades.filter((au) => au.id_agente === currentUser.id).map((au) => au.id_unidade)
    ),
    [agentUnidades, currentUser.id]
  );

  const myLeads = useMemo(
    () => leads.filter(
      (l) => l.id_agente === currentUser.id || (l.id_unidade && myUnitIds.has(l.id_unidade))
    ),
    [leads, currentUser.id, myUnitIds]
  );

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const agendamentosDoDia = useMemo(
    () => myLeads.filter((l) => ["agendado", "reagendado"].includes(l.etapa) && l.data_agendamento === selectedDateStr),
    [myLeads, selectedDateStr]
  );

  const proximosAgendamentos = useMemo(
    () =>
      myLeads
        .filter((l) => ["agendado", "reagendado"].includes(l.etapa) && l.data_agendamento && l.data_agendamento > selectedDateStr)
        .sort((a, b) => (a.data_agendamento || "").localeCompare(b.data_agendamento || "")),
    [myLeads, selectedDateStr]
  );

  const pendentes = useMemo(
    () =>
      myLeads
        .filter((l) => ["agendado", "reagendado"].includes(l.etapa) && l.data_agendamento && l.data_agendamento < todayStr)
        .sort((a, b) => (a.data_agendamento || "").localeCompare(b.data_agendamento || "")),
    [myLeads, todayStr]
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const getUnidadeNome = (id?: string | null) =>
    id ? unidades.find((u) => u.id === id)?.nome || "—" : "—";

  const formatDateLabel = () => {
    if (isToday(selectedDate)) return "Hoje";
    const tomorrow = addDays(new Date(), 1);
    if (format(selectedDate, "yyyy-MM-dd") === format(tomorrow, "yyyy-MM-dd")) return "Amanhã";
    return format(selectedDate, "EEEE", { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase());
  };

  const openDetail = (lead: Lead) => {
    setDetailLead(lead);
    setDetailOpen(true);
  };

  const LeadRow = ({ lead, showDate = false }: { lead: Lead; showDate?: boolean }) => (
    <div
      onClick={() => openDetail(lead)}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
    >
      <Avatar className="h-10 w-10 bg-primary/15 text-primary">
        <AvatarFallback className="text-sm font-semibold bg-primary/15 text-primary">
          {getInitials(lead.nome)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{lead.nome}</p>
        <p className="text-xs text-muted-foreground">
          {showDate && lead.data_agendamento
            ? formatDataSegura(lead.data_agendamento, "dd/MM/yyyy")
            : getUnidadeNome(lead.id_unidade)}
          {lead.numero_os && ` · OS: ${lead.numero_os}`}
        </p>
      </div>
      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 shrink-0">
        <span className="mr-1">●</span> Agendado
      </Badge>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Day navigator */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => subDays(d, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center min-w-[140px]">
          <p className="text-lg font-bold">{formatDateLabel()}</p>
          <p className="text-sm text-muted-foreground">
            {format(selectedDate, "dd/MM/yyyy")}
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => addDays(d, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Agendamentos do dia */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Agendamentos do dia ({agendamentosDoDia.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agendamentosDoDia.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum agendamento para este dia
            </p>
          ) : (
            <div className="space-y-1">
              {agendamentosDoDia.map((l) => (
                <LeadRow key={l.id} lead={l} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pendentes (atrasados) */}
      {pendentes.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Agendamentos Pendentes ({pendentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {pendentes.map((l) => (
                <LeadRow key={l.id} lead={l} showDate />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próximos */}
      {proximosAgendamentos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Próximos Agendamentos ({proximosAgendamentos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {proximosAgendamentos.map((l) => (
                <LeadRow key={l.id} lead={l} showDate />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};
