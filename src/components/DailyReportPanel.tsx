import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Users, CalendarCheck, Car, CheckCircle2, XCircle, Wrench, MapPin } from "lucide-react";
import { isCarroDoAgente, isPerdidoAntesLoja, isPerdidoDepoisLoja, formatDateBR } from "@/lib/leadUtils";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const DailyReportPanel = () => {
  const { leads, unidades, profiles } = useLeads();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = selectedDate.toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  const agentes = useMemo(() => profiles.filter((p) => p.cargo === "agente"), [profiles]);

  const dayLeads = useMemo(() => leads.filter((l) => l.data_entrada === dateStr), [leads, dateStr]);

  const globalStats = useMemo(() => ({
    total: dayLeads.length,
    agendados: dayLeads.filter((l) => ["agendado", "reagendado"].includes(l.etapa)).length,
    confirmados: dayLeads.filter((l) => isCarroDoAgente(l.etapa)).length,
    dispensados: dayLeads.filter((l) => l.etapa === "dispensado").length,
    concluidos: dayLeads.filter((l) => l.etapa === "concluido").length,
    perdidosAntes: dayLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length,
  }), [dayLeads]);

  // Leads com agendamento para este dia (independente de data_entrada)
  const agendadosNoDia = useMemo(() => leads.filter((l) => l.data_agendamento === dateStr), [leads, dateStr]);

  const unitStats = useMemo(() => {
    return unidades.map((u) => {
      const uLeads = dayLeads.filter((l) => l.id_unidade === u.id);
      const agendados = agendadosNoDia.filter((l) => l.id_unidade === u.id);
      return {
        ...u,
        novos: uLeads.length,
        agendados: agendados.length,
        confirmados: agendados.filter((l) => isCarroDoAgente(l.etapa)).length,
        dispensados: agendados.filter((l) => l.etapa === "dispensado").length,
        concluidos: agendados.filter((l) => l.etapa === "concluido").length,
      };
    }).filter((u) => u.novos > 0 || u.agendados > 0);
  }, [dayLeads, agendadosNoDia, unidades]);

  const agentStats = useMemo(() => {
    return agentes.map((a) => {
      const aLeads = dayLeads.filter((l) => l.id_agente === a.id);
      const aAgendados = agendadosNoDia.filter((l) => l.id_agente === a.id);
      const unidade = unidades.find((u) => u.id === a.unidade_padrao);
      return {
        ...a,
        unidadeNome: unidade?.nome || "—",
        novos: aLeads.length,
        agendados: aAgendados.length,
        confirmados: aAgendados.filter((l) => isCarroDoAgente(l.etapa)).length,
        dispensados: aAgendados.filter((l) => l.etapa === "dispensado").length,
        concluidos: aAgendados.filter((l) => l.etapa === "concluido").length,
      };
    }).filter((a) => a.novos > 0 || a.agendados > 0);
  }, [dayLeads, agendadosNoDia, agentes, unidades]);

  const prevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); };
  const nextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); };
  const isToday = dateStr === today;

  const dateLabel = isToday ? "Hoje" : `${WEEKDAYS[selectedDate.getDay()]}, ${selectedDate.toLocaleDateString("pt-BR")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Relatório do Dia</h1>
          <p className="text-muted-foreground text-sm">Resumo de atividades por cidade e agente</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevDay}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-semibold text-sm min-w-[180px] text-center">{dateLabel}</span>
          <Button variant="outline" size="icon" onClick={nextDay}><ChevronRight className="h-4 w-4" /></Button>
          {!isToday && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>Hoje</Button>
          )}
        </div>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatsCard title="Novos Leads" value={globalStats.total} icon={Users} variant="info" />
        <StatsCard title="Agendamentos" value={agendadosNoDia.length} icon={CalendarCheck} variant="primary" />
        <StatsCard title="Confirmados" value={globalStats.confirmados} icon={Car} variant="warning" />
        <StatsCard title="Dispensados" value={globalStats.dispensados} icon={XCircle} variant="destructive" />
        <StatsCard title="Concluídos" value={globalStats.concluidos} icon={CheckCircle2} variant="success" />
        <StatsCard title="Perdidos s/ Loja" value={globalStats.perdidosAntes} icon={XCircle} variant="destructive" />
      </div>

      {/* By city */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground" /> Por Cidade
        </h2>
        {unitStats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade registrada nesta data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-muted-foreground">CIDADE</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">NOVOS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">AGENDADOS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">CONFIRMADOS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">DISPENSADOS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">CONCLUÍDOS</th>
                </tr>
              </thead>
              <tbody>
                {unitStats.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 font-medium">{u.nome}</td>
                    <td className="py-3 text-center">{u.novos}</td>
                    <td className="py-3 text-center text-primary">{u.agendados}</td>
                    <td className="py-3 text-center text-warning">{u.confirmados}</td>
                    <td className="py-3 text-center text-destructive">{u.dispensados}</td>
                    <td className="py-3 text-center text-success">{u.concluidos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* By agent */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" /> Por Agente
        </h2>
        {agentStats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade de agentes nesta data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">CIDADE</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">NOVOS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">AGENDADOS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">CONFIRMADOS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">DISPENSADOS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">CONCLUÍDOS</th>
                </tr>
              </thead>
              <tbody>
                {agentStats.map((a) => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 font-medium">{a.nome}</td>
                    <td className="py-3 text-muted-foreground">{a.unidadeNome}</td>
                    <td className="py-3 text-center">{a.novos}</td>
                    <td className="py-3 text-center text-primary">{a.agendados}</td>
                    <td className="py-3 text-center text-warning">{a.confirmados}</td>
                    <td className="py-3 text-center text-destructive">{a.dispensados}</td>
                    <td className="py-3 text-center text-success">{a.concluidos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
