import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronDown, Users, CalendarCheck, Car, CheckCircle2, XCircle, MapPin, Skull, AlertTriangle, PieChart as PieChartIcon } from "lucide-react";
import { isCarroDoAgente, isCarroParaMeta, isPerdidoAntesLoja, isPerdidoDepoisLoja } from "@/lib/leadUtils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--info))", "#8b5cf6", "#f97316"];

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const DailyReportPanel = () => {
  const { leads, unidades, profiles } = useLeads();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const dateStr = selectedDate.toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  const agentes = useMemo(() => profiles.filter((p) => p.cargo === "agente"), [profiles]);

  const createdToday = useMemo(() => leads.filter((l) => l.data_entrada === dateStr), [leads, dateStr]);
  const agendadosNoDia = useMemo(() => leads.filter((l) => l.data_agendamento === dateStr), [leads, dateStr]);
  // Anchor "Na Loja" to data_agendamento (the real event date), NOT checkin timestamp.
  // This ensures metrics are stable even when check-in is registered late (next day, etc.).
  const passaramNaLojaNoDia = useMemo(() => {
    return leads.filter((l) => {
      const naLojaEtapas = ["confirmado", "na_loja", "concluido", "dispensado", "perdido", "reagendado"];
      if (!naLojaEtapas.includes(l.etapa)) return false;
      // Primary: use data_agendamento as the real event date
      if (l.data_agendamento) return l.data_agendamento === dateStr;
      // Walk-ins without appointment: use checkin date, then data_entrada
      if (l.checkin) return l.checkin.slice(0, 10) === dateStr;
      return l.data_entrada === dateStr;
    });
  }, [leads, dateStr]);

  // Anchor "Concluídos" to data_agendamento for the same stability reason.
  const concluidosNoDia = useMemo(() => {
    return leads.filter((l) => {
      if (l.etapa !== "concluido") return false;
      if (l.data_agendamento) return l.data_agendamento === dateStr;
      if (l.checkout) return l.checkout.slice(0, 10) === dateStr;
      if (l.checkin) return l.checkin.slice(0, 10) === dateStr;
      return l.data_entrada === dateStr;
    });
  }, [leads, dateStr]);

  const dispensadosNoDia = useMemo(() => {
    return passaramNaLojaNoDia.filter((l) => l.etapa === "dispensado");
  }, [passaramNaLojaNoDia]);

  const globalStats = useMemo(() => {
    const desqNovos = createdToday.filter((l) => l.etapa === "desqualificado_novo").length;
    const desqOutraCidade = createdToday.filter((l) => l.etapa === "desqualificado_novo" && (l.notas || "").includes("[Outra Cidade]")).length;
    const desqAgendados = createdToday.filter((l) => l.etapa === "desqualificado_agendado").length;
    return {
      totalRegistros: createdToday.length,
      novos: createdToday.filter((l) => l.etapa === "novo").length,
      agendados: createdToday.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado"].includes(l.etapa)).length,
      naLoja: passaramNaLojaNoDia.length,
      concluidos: concluidosNoDia.length,
      dispensados: dispensadosNoDia.length,
      perdidos: passaramNaLojaNoDia.filter((l) => l.etapa === "perdido").length,
      desqNovos,
      desqOutraCidade,
      desqAgendados,
    };
  }, [createdToday, passaramNaLojaNoDia, concluidosNoDia, dispensadosNoDia]);

  const unitStats = useMemo(() => {
    return unidades.map((u) => {
      const uCreated = createdToday.filter((l) => l.id_unidade === u.id);
      const uAgendados = agendadosNoDia.filter((l) => l.id_unidade === u.id);
      const uPassaram = passaramNaLojaNoDia.filter((l) => l.id_unidade === u.id);
      const uConcluidos = concluidosNoDia.filter((l) => l.id_unidade === u.id);
      const passaramNaLoja = uPassaram.length;
      return {
        ...u,
        totalRegistros: uCreated.length,
        naoAgendados: uCreated.filter((l) => l.etapa === "novo").length,
        agendados: uAgendados.length,
        passaramNaLoja,
        concluidos: uConcluidos.length,
        perdidos: uPassaram.filter((l) => l.etapa === "perdido").length,
        txConversao: passaramNaLoja > 0 ? Math.round((uConcluidos.length / passaramNaLoja) * 100) : 0,
      };
    }).filter((u) => u.totalRegistros > 0 || u.agendados > 0);
  }, [createdToday, agendadosNoDia, unidades, passaramNaLojaNoDia, concluidosNoDia]);

  const agentStats = useMemo(() => {
    return agentes.map((a) => {
      const aCreated = createdToday.filter((l) => l.id_agente === a.id);
      const aAgendados = agendadosNoDia.filter((l) => l.id_agente === a.id);
      const unidade = unidades.find((u) => u.id === a.unidade_padrao);
      const aPassaram = passaramNaLojaNoDia.filter((l) => l.id_agente === a.id);
      const aConcluidos = concluidosNoDia.filter((l) => l.id_agente === a.id);
      const passaramNaLoja = aPassaram.length;
      const totalAgendamentos = aCreated.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado"].includes(l.etapa)).length;
      const desqNovos = aCreated.filter((l) => l.etapa === "desqualificado_novo").length;
      const desqOutraCidade = aCreated.filter((l) => l.etapa === "desqualificado_novo" && (l.notas || "").includes("[Outra Cidade]")).length;
      const desqAgendados = aCreated.filter((l) => l.etapa === "desqualificado_agendado").length;
      const txAgendamento = aCreated.length > 0 ? Math.round((totalAgendamentos / aCreated.length) * 100) : 0;
      const txNaLoja = passaramNaLoja > 0 ? Math.round((aConcluidos.length / passaramNaLoja) * 100) : 0;

      // Origin breakdown
      const origemMap: Record<string, number> = {};
      aCreated.forEach((l) => { origemMap[l.origem] = (origemMap[l.origem] || 0) + 1; });
      const origemData = Object.entries(origemMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

      return {
        ...a,
        unidadeNome: unidade?.nome || "—",
        totalRegistros: aCreated.length,
        totalAgendamentos,
        passaramNaLoja,
        perdidos: aPassaram.filter((l) => l.etapa === "perdido").length,
        concluidos: aConcluidos.length,
        desqNovos,
        desqOutraCidade,
        desqAgendados,
        txAgendamento,
        txNaLoja,
        origemData,
      };
    }).filter((a) => a.totalRegistros > 0 || a.totalAgendamentos > 0);
  }, [createdToday, agendadosNoDia, agentes, unidades, passaramNaLojaNoDia, concluidosNoDia]);

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

      {/* Registros e Funil */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard title="Total de Registros" value={globalStats.totalRegistros} icon={Users} variant="info" subtitle="Criados nesta data" />
        <StatsCard title="Agendados" value={globalStats.agendados} icon={CalendarCheck} variant="primary" />
        <StatsCard title="Novo Lead" value={globalStats.novos} icon={AlertTriangle} variant="warning" subtitle="Sendo trabalhados" />
      </div>
      {/* Na Loja */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Na Loja" value={globalStats.naLoja} icon={Car} variant="warning" subtitle="Conf+Concl+Disp+Perd+Reag" />
        <StatsCard title="Concluídos" value={globalStats.concluidos} icon={CheckCircle2} variant="success" />
        <StatsCard title="Dispensados" value={globalStats.dispensados} icon={XCircle} variant="warning" />
        <StatsCard title="Perdidos" value={globalStats.perdidos} icon={Skull} variant="destructive" />
      </div>
      {/* Desqualificados */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard title="Desq. Novo" value={globalStats.desqNovos} icon={AlertTriangle} variant="destructive" />
        <StatsCard title="Outra Cidade" value={globalStats.desqOutraCidade} icon={MapPin} variant="warning" />
        <StatsCard title="Desq. Agendado" value={globalStats.desqAgendados} icon={XCircle} variant="destructive" />
      </div>

      {/* Origin breakdown pie chart */}
      {(() => {
        const origemData = Object.entries(
          createdToday.reduce<Record<string, number>>((acc, l) => { acc[l.origem] = (acc[l.origem] || 0) + 1; return acc; }, {})
        ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        if (origemData.length === 0) return null;
        return (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-muted-foreground" /> Registros por Origem
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Distribuição dos {globalStats.totalRegistros} registros do dia</p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-48 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={origemData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                      {origemData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2">
                {origemData.map((o, i) => (
                  <div key={o.name} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-sm font-medium">{o.name}</span>
                    <span className="text-sm text-muted-foreground">{o.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* By agent - expandable */}
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
                  <th className="text-center py-2 font-medium text-muted-foreground">AGEND.</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">CONCL.</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">PERD.</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">DESQ.</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">% AGEND.</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">% LOJA</th>
                </tr>
              </thead>
              <tbody>
                {agentStats.map((a) => (
                  <>
                    <tr
                      key={a.id}
                      className={`border-b border-border/50 hover:bg-muted/30 cursor-pointer ${expandedAgent === a.id ? "bg-muted/30" : ""}`}
                      onClick={() => setExpandedAgent(expandedAgent === a.id ? null : a.id)}
                    >
                      <td className="py-3 font-medium flex items-center gap-1.5">
                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expandedAgent === a.id ? "rotate-0" : "-rotate-90"}`} />
                        {a.nome}
                      </td>
                      <td className="py-3 text-muted-foreground">{a.unidadeNome}</td>
                      <td className="py-3 text-center">{a.totalRegistros}</td>
                      <td className="py-3 text-center text-primary">{a.totalAgendamentos}</td>
                      <td className="py-3 text-center text-warning">{a.passaramNaLoja}</td>
                      <td className="py-3 text-center text-success">{a.concluidos}</td>
                      <td className="py-3 text-center text-destructive">{a.perdidos}</td>
                      <td className="py-3 text-center text-muted-foreground">{a.desqNovos + a.desqAgendados}</td>
                      <td className="py-3 text-center font-medium">{a.txAgendamento}%</td>
                      <td className="py-3 text-center font-medium">{a.txNaLoja}%</td>
                    </tr>
                    {expandedAgent === a.id && (
                      <tr key={`${a.id}-detail`}>
                        <td colSpan={10} className="p-0">
                          <div className="bg-muted/20 border-t border-border/30 p-4 space-y-4">
                            {/* Funnel */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="rounded-lg bg-card border border-border p-3 text-center">
                                <p className="text-xl font-bold">{a.totalRegistros}</p>
                                <p className="text-xs text-muted-foreground">Registros</p>
                              </div>
                              <div className="rounded-lg bg-card border border-border p-3 text-center">
                                <p className="text-xl font-bold text-primary">{a.totalAgendamentos}</p>
                                <p className="text-xs text-muted-foreground">Agendamentos</p>
                              </div>
                              <div className="rounded-lg bg-card border border-border p-3 text-center">
                                <p className="text-xl font-bold text-warning">{a.passaramNaLoja}</p>
                                <p className="text-xs text-muted-foreground">Na Loja</p>
                              </div>
                              <div className="rounded-lg bg-card border border-border p-3 text-center">
                                <p className="text-xl font-bold text-success">{a.concluidos}</p>
                                <p className="text-xs text-muted-foreground">Concluídos</p>
                              </div>
                            </div>
                            {/* Desq + conversions */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                              <div className="rounded-lg bg-card border border-border p-3 text-center">
                                <p className="text-xl font-bold text-warning">{a.desqNovos}</p>
                                <p className="text-xs text-muted-foreground">Desq. Novo</p>
                              </div>
                              <div className="rounded-lg bg-card border border-border p-3 text-center">
                                <p className="text-xl font-bold text-orange-500">{a.desqOutraCidade}</p>
                                <p className="text-xs text-muted-foreground">Outra Cidade</p>
                              </div>
                              <div className="rounded-lg bg-card border border-border p-3 text-center">
                                <p className="text-xl font-bold text-destructive">{a.desqAgendados}</p>
                                <p className="text-xs text-muted-foreground">Desq. Agendado</p>
                              </div>
                              <div className="rounded-lg bg-card border border-border p-3 text-center">
                                <p className="text-xl font-bold">{a.txAgendamento}%</p>
                                <p className="text-xs text-muted-foreground">Conv. Agend.</p>
                              </div>
                              <div className="rounded-lg bg-card border border-border p-3 text-center">
                                <p className="text-xl font-bold">{a.txNaLoja}%</p>
                                <p className="text-xs text-muted-foreground">Conv. Na Loja</p>
                              </div>
                            </div>
                            {/* Origin */}
                            {a.origemData.length > 0 && (
                              <div>
                                <p className="text-sm font-medium mb-2">Origem dos Registros</p>
                                <div className="flex flex-wrap gap-2">
                                  {a.origemData.map((o, i) => (
                                    <div key={o.name} className="flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-1.5">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                      <span className="text-sm font-medium">{o.name}</span>
                                      <span className="text-sm text-muted-foreground">{o.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
