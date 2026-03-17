import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Users, CalendarCheck, Car, CheckCircle2, XCircle, MapPin, Skull, AlertTriangle } from "lucide-react";
import { isCarroDoAgente, isPerdidoAntesLoja, isPerdidoDepoisLoja } from "@/lib/leadUtils";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const DailyReportPanel = () => {
  const { leads, unidades, profiles } = useLeads();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = selectedDate.toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  const agentes = useMemo(() => profiles.filter((p) => p.cargo === "agente"), [profiles]);

  // ALL leads created on this date (regardless of current status)
  const createdToday = useMemo(() => leads.filter((l) => l.data_entrada === dateStr), [leads, dateStr]);
  // All leads scheduled for this date
  const agendadosNoDia = useMemo(() => leads.filter((l) => l.data_agendamento === dateStr), [leads, dateStr]);

  const globalStats = useMemo(() => {
    // Leads linked to a unit (for unit-based reports use all leads)
    const allLeads = leads;
    return {
      totalRegistros: createdToday.length, // Total NEW registrations today (regardless of current status)
      totalLeads: allLeads.length,
      naoAgendados: createdToday.filter((l) => ["novo", "desqualificado_novo"].includes(l.etapa)).length,
      agendados: createdToday.filter((l) => ["agendado", "reagendado"].includes(l.etapa)).length,
      passaramNaLoja: createdToday.filter((l) => ["dispensado", "concluido", "confirmado", "na_loja"].includes(l.etapa)).length,
      dispensados: createdToday.filter((l) => l.etapa === "dispensado").length,
      concluidos: createdToday.filter((l) => l.etapa === "concluido").length,
      perdidos: createdToday.filter((l) => l.etapa === "perdido").length,
      perdidosAntes: createdToday.filter((l) => isPerdidoAntesLoja(l.etapa)).length,
    };
  }, [createdToday, leads]);

  const unitStats = useMemo(() => {
    return unidades.map((u) => {
      const uCreated = createdToday.filter((l) => l.id_unidade === u.id);
      const uAgendados = agendadosNoDia.filter((l) => l.id_unidade === u.id);
      const passaramNaLoja = uCreated.filter((l) => ["dispensado", "concluido", "confirmado", "na_loja"].includes(l.etapa)).length;
      return {
        ...u,
        totalRegistros: uCreated.length,
        naoAgendados: uCreated.filter((l) => ["novo", "desqualificado_novo"].includes(l.etapa)).length,
        agendados: uAgendados.length,
        passaramNaLoja,
        dispensados: uCreated.filter((l) => l.etapa === "dispensado").length,
        concluidos: uCreated.filter((l) => l.etapa === "concluido").length,
        perdidos: uCreated.filter((l) => l.etapa === "perdido").length,
        txConversao: passaramNaLoja > 0 ? Math.round((uCreated.filter((l) => l.etapa === "concluido").length / passaramNaLoja) * 100) : 0,
      };
    }).filter((u) => u.totalRegistros > 0 || u.agendados > 0);
  }, [createdToday, agendadosNoDia, unidades]);

  const agentStats = useMemo(() => {
    return agentes.map((a) => {
      const aCreated = createdToday.filter((l) => l.id_agente === a.id);
      const aAgendados = agendadosNoDia.filter((l) => l.id_agente === a.id);
      const unidade = unidades.find((u) => u.id === a.unidade_padrao);
      const passaramNaLoja = aCreated.filter((l) => ["dispensado", "concluido", "confirmado", "na_loja"].includes(l.etapa)).length;
      return {
        ...a,
        unidadeNome: unidade?.nome || "—",
        totalRegistros: aCreated.length,
        naoAgendados: aCreated.filter((l) => ["novo", "desqualificado_novo"].includes(l.etapa)).length,
        agendados: aAgendados.length,
        passaramNaLoja,
        dispensados: aCreated.filter((l) => l.etapa === "dispensado").length,
        concluidos: aCreated.filter((l) => l.etapa === "concluido").length,
        perdidos: aCreated.filter((l) => l.etapa === "perdido").length,
      };
    }).filter((a) => a.totalRegistros > 0 || a.agendados > 0);
  }, [createdToday, agendadosNoDia, agentes, unidades]);

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Registros Novos" value={globalStats.totalRegistros} icon={Users} variant="info" subtitle="Criados nesta data" />
        <StatsCard title="Não Agendados" value={globalStats.naoAgendados} icon={AlertTriangle} variant="warning" />
        <StatsCard title="Agendados" value={globalStats.agendados} icon={CalendarCheck} variant="primary" />
        <StatsCard title="Passaram na Loja" value={globalStats.passaramNaLoja} icon={Car} variant="warning" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Dispensados" value={globalStats.dispensados} icon={XCircle} variant="destructive" />
        <StatsCard title="Serviço Concluído" value={globalStats.concluidos} icon={CheckCircle2} variant="success" />
        <StatsCard title="Perdidos" value={globalStats.perdidos} icon={Skull} variant="destructive" />
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
                  <th className="text-center py-2 font-medium text-muted-foreground">REGISTROS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">NÃO AGEND.</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">AGENDADOS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">DISPENSADOS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">CONCLUÍDOS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">PERDIDOS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">TX CONV.</th>
                </tr>
              </thead>
              <tbody>
                {unitStats.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 font-medium">{u.nome}</td>
                    <td className="py-3 text-center">{u.totalRegistros}</td>
                    <td className="py-3 text-center text-warning">{u.naoAgendados}</td>
                    <td className="py-3 text-center text-primary">{u.agendados}</td>
                    <td className="py-3 text-center text-warning">{u.passaramNaLoja}</td>
                    <td className="py-3 text-center text-destructive">{u.dispensados}</td>
                    <td className="py-3 text-center text-success">{u.concluidos}</td>
                    <td className="py-3 text-center text-destructive">{u.perdidos}</td>
                    <td className="py-3 text-center font-medium">{u.txConversao}%</td>
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
                  <th className="text-center py-2 font-medium text-muted-foreground">REGISTROS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">NÃO AGEND.</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">AGENDADOS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">DISPENSADOS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">CONCLUÍDOS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">PERDIDOS</th>
                </tr>
              </thead>
              <tbody>
                {agentStats.map((a) => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 font-medium">{a.nome}</td>
                    <td className="py-3 text-muted-foreground">{a.unidadeNome}</td>
                    <td className="py-3 text-center">{a.totalRegistros}</td>
                    <td className="py-3 text-center text-warning">{a.naoAgendados}</td>
                    <td className="py-3 text-center text-primary">{a.agendados}</td>
                    <td className="py-3 text-center text-warning">{a.passaramNaLoja}</td>
                    <td className="py-3 text-center text-destructive">{a.dispensados}</td>
                    <td className="py-3 text-center text-success">{a.concluidos}</td>
                    <td className="py-3 text-center text-destructive">{a.perdidos}</td>
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
