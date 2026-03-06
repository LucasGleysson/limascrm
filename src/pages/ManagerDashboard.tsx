import { useMemo, useState } from "react";
import { UserManagement } from "@/components/UserManagement";
import { useLeads } from "@/contexts/LeadContext";
import { ORIGENS, ETAPAS_FUNIL } from "@/data/mockData";
import { StatsCard } from "@/components/StatsCard";
import { AppSidebar } from "@/components/AppSidebar";
import { PeriodFilter, PeriodKey, getDateRangeForPeriod } from "@/components/PeriodFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, CalendarCheck, TrendingUp, DollarSign, LayoutDashboard, BarChart3, MapPin, Percent, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { formatPhone } from "@/lib/phoneUtils";

const SIDEBAR_TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: Users },
  { id: "agendamentos", label: "Agendamentos", icon: CalendarCheck },
  { id: "usuarios", label: "Usuários", icon: Users },
];

const PIE_COLORS = [
  "hsl(38, 92%, 50%)",
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(0, 72%, 51%)",
  "hsl(280, 65%, 60%)",
  "hsl(190, 80%, 45%)",
];

export const ManagerDashboard = () => {
  const { leads, unidades, profiles } = useLeads();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [unidadeFilter, setUnidadeFilter] = useState("todas");
  const [period, setPeriod] = useState<PeriodKey>("mes");

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (unidadeFilter !== "todas") {
      result = result.filter((l) => l.id_unidade === unidadeFilter);
    }
    const { from } = getDateRangeForPeriod(period);
    if (from) {
      result = result.filter((l) => l.data_entrada >= from);
    }
    return result;
  }, [leads, unidadeFilter, period]);

  const stats = useMemo(() => {
    const concluidos = filteredLeads.filter((l) => l.etapa === "concluido");
    const faturamentoTotal = concluidos.reduce((s, l) => s + (l.valor_servico || 0), 0);
    const agendados = filteredLeads.filter((l) => ["agendado", "na_loja", "concluido"].includes(l.etapa)).length;
    const perdidos = filteredLeads.filter((l) => ["perdido", "dispensado", "desqualificado"].includes(l.etapa)).length;
    const taxaConversao = filteredLeads.length > 0 ? Math.round((concluidos.length / filteredLeads.length) * 100) : 0;
    return { totalLeads: filteredLeads.length, agendados, concluidos: concluidos.length, perdidos, receita: faturamentoTotal, taxaConversao };
  }, [filteredLeads]);

  const porOrigem = useMemo(() => {
    return ORIGENS.map((origem) => {
      const originLeads = filteredLeads.filter((l) => l.origem === origem);
      const concluidos = originLeads.filter((l) => l.etapa === "concluido");
      const receita = concluidos.reduce((s, l) => s + (l.valor_servico || 0), 0);
      return { origem, total: originLeads.length, concluidos: concluidos.length, receita };
    }).filter((o) => o.total > 0).sort((a, b) => b.total - a.total);
  }, [filteredLeads]);

  const funnelData = useMemo(() => {
    return ETAPAS_FUNIL.map((etapa) => ({
      name: etapa.label,
      value: filteredLeads.filter((l) => l.etapa === etapa.id).length,
    })).filter((d) => d.value > 0);
  }, [filteredLeads]);

  const porUnidade = useMemo(() => {
    return unidades.map((u) => {
      const unitLeads = leads.filter((l) => l.id_unidade === u.id);
      const concluidos = unitLeads.filter((l) => l.etapa === "concluido");
      const perdidos = unitLeads.filter((l) => ["perdido", "dispensado", "desqualificado"].includes(l.etapa)).length;
      const receita = concluidos.reduce((s, l) => s + (l.valor_servico || 0), 0);
      return { ...u, total: unitLeads.length, concluidos: concluidos.length, perdidos, receita };
    });
  }, [leads, unidades]);

  const agentes = profiles.filter((u) => u.cargo === "agente");
  const agenteTable = useMemo(() => {
    return agentes.map((agente) => {
      const aLeads = filteredLeads.filter((l) => l.id_agente === agente.id);
      const unidade = unidades.find((u) => u.id === agente.unidade_padrao);
      const concluidos = aLeads.filter((l) => l.etapa === "concluido");
      return {
        nome: agente.nome,
        unidade: unidade?.nome || "—",
        novo: aLeads.filter((l) => l.etapa === "novo").length,
        agendado: aLeads.filter((l) => l.etapa === "agendado").length,
        na_loja: aLeads.filter((l) => l.etapa === "na_loja").length,
        dispensado: aLeads.filter((l) => l.etapa === "dispensado").length,
        concluido: concluidos.length,
        perdido: aLeads.filter((l) => ["perdido", "desqualificado"].includes(l.etapa)).length,
        total: aLeads.length,
        receita: concluidos.reduce((s, l) => s + (l.valor_servico || 0), 0),
        taxa: aLeads.length > 0 ? Math.round((concluidos.length / aLeads.length) * 100) : 0,
      };
    });
  }, [filteredLeads, agentes, unidades]);

  const todayStr = new Date().toISOString().split("T")[0];
  const agendamentos = useMemo(() => {
    return filteredLeads
      .filter((l) => ["agendado", "na_loja"].includes(l.etapa) && l.data_agendamento)
      .sort((a, b) => (a.data_agendamento || "").localeCompare(b.data_agendamento || ""));
  }, [filteredLeads]);

  const agendHoje = agendamentos.filter((l) => l.data_agendamento === todayStr);
  const agendFuturos = agendamentos.filter((l) => l.data_agendamento! > todayStr);
  const agendAtrasados = agendamentos.filter((l) => l.data_agendamento! < todayStr);

  const origemPieData = useMemo(() => {
    return porOrigem.map((o, i) => ({ name: o.origem, value: o.total, fill: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [porOrigem]);

  const UnidadeFilterSelect = (
    <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todas">Todas as Unidades</SelectItem>
        {unidades.map((u) => (
          <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} tabs={SIDEBAR_TABS} />

      <main className="flex-1 overflow-auto p-6 space-y-6">

        {activeTab === "dashboard" && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground text-sm">Visão estratégica do desempenho</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <PeriodFilter value={period} onChange={setPeriod} />
                {UnidadeFilterSelect}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatsCard title="Total de Leads" value={stats.totalLeads} icon={Users} variant="info" />
              <StatsCard title="Agendados" value={stats.agendados} icon={CalendarCheck} variant="warning" />
              <StatsCard title="Concluídos" value={stats.concluidos} icon={TrendingUp} variant="success" />
              <StatsCard title="Taxa de Conversão" value={`${stats.taxaConversao}%`} icon={Percent} variant="primary" />
              <StatsCard title="Faturamento" value={`R$ ${stats.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} variant="primary" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold mb-4">Funil de Vendas</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={funnelData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold mb-4">Distribuição por Origem</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={origemPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                      {origemPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold mb-4">Faturamento por Unidade</h2>
                <div className="space-y-3">
                  {porUnidade.map((u) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-28 shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{u.nome}</span>
                      </div>
                      <div className="flex gap-4 text-sm flex-1 justify-end">
                        <span>{u.total} leads</span>
                        <span className="text-success">{u.concluidos} ✓</span>
                        <span className="text-destructive">{u.perdidos} ✗</span>
                        <span className="font-semibold text-primary">R$ {u.receita.toLocaleString("pt-BR")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold mb-4">Top Agentes</h2>
                <div className="space-y-3">
                  {[...agenteTable].sort((a, b) => b.receita - a.receita).map((a) => (
                    <div key={a.nome} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-32 shrink-0">{a.nome}</span>
                      <div className="flex gap-4 text-sm flex-1 justify-end">
                        <span>{a.total} leads</span>
                        <span className="text-success">{a.taxa}% conv.</span>
                        <span className="font-semibold text-primary">R$ {a.receita.toLocaleString("pt-BR")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "leads" && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Análise de Leads</h1>
                <p className="text-muted-foreground text-sm">ROI por canal e performance detalhada</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <PeriodFilter value={period} onChange={setPeriod} />
                {UnidadeFilterSelect}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold mb-4">Performance por Origem</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">ORIGEM</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">LEADS</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">CONCLUÍDOS</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">CONVERSÃO</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">FATURAMENTO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porOrigem.map((o) => (
                      <tr key={o.origem} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 font-medium">{o.origem}</td>
                        <td className="py-3 text-center">{o.total}</td>
                        <td className="py-3 text-center text-success">{o.concluidos}</td>
                        <td className="py-3 text-center">{o.total > 0 ? Math.round((o.concluidos / o.total) * 100) : 0}%</td>
                        <td className="py-3 text-right font-semibold text-primary">R$ {o.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold mb-4">Desempenho por Agente</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">UNIDADE</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">NOVO</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">AGENDADO</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">CONCLUÍDO</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">PERDIDO</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">TOTAL</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">CONV.</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">RECEITA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agenteTable.map((a) => (
                      <tr key={a.nome} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 font-medium">{a.nome}</td>
                        <td className="py-3 text-muted-foreground">{a.unidade}</td>
                        <td className="py-3 text-center">{a.novo}</td>
                        <td className="py-3 text-center">{a.agendado}</td>
                        <td className="py-3 text-center">{a.na_loja}</td>
                        <td className="py-3 text-center text-success">{a.concluido}</td>
                        <td className="py-3 text-center text-destructive">{a.perdido}</td>
                        <td className="py-3 text-center font-bold">{a.total}</td>
                        <td className="py-3 text-center">{a.taxa}%</td>
                        <td className="py-3 text-right font-semibold text-primary">R$ {a.receita.toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === "agendamentos" && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">Agendamentos</h1>
                <p className="text-muted-foreground text-sm">Acompanhamento de agenda por unidade</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <PeriodFilter value={period} onChange={setPeriod} />
                {UnidadeFilterSelect}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatsCard title="Atrasados" value={agendAtrasados.length} icon={CalendarCheck} variant="warning" />
              <StatsCard title="Hoje" value={agendHoje.length} icon={CalendarCheck} variant="info" />
              <StatsCard title="Futuros" value={agendFuturos.length} icon={CalendarCheck} variant="success" />
            </div>

            {agendAtrasados.length > 0 && (
              <div className="rounded-xl border border-destructive/20 bg-card p-5">
                <h2 className="text-lg font-semibold mb-3 text-destructive">Agendamentos Atrasados</h2>
                <div className="space-y-2">
                  {agendAtrasados.map((l) => {
                    const agente = profiles.find((u) => u.id === l.id_agente);
                    const unidade = unidades.find((u) => u.id === l.id_unidade);
                    return (
                      <div key={l.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                        <div className="flex-1">
                          <span className="font-medium">{l.nome}</span>
                          <p className="text-sm text-muted-foreground">
                            {formatPhone(l.telefone)} · {unidade?.nome} · {l.data_agendamento} · Agente: {agente?.nome}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">
                          {l.etapa === "na_loja" ? "Na Loja" : "Atrasado"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold mb-3">Agendados para Hoje</h2>
              {agendHoje.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum agendamento para hoje.</p>
              ) : (
                <div className="space-y-2">
                  {agendHoje.map((l) => {
                    const agente = profiles.find((u) => u.id === l.id_agente);
                    const unidade = unidades.find((u) => u.id === l.id_unidade);
                    return (
                      <div key={l.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                        <div className="flex-1">
                          <span className="font-medium">{l.nome}</span>
                          <p className="text-sm text-muted-foreground">
                            {formatPhone(l.telefone)} · {unidade?.nome} · OS: {l.numero_os} · Agente: {agente?.nome}
                          </p>
                        </div>
                        <Badge variant={l.etapa === "na_loja" ? "default" : "secondary"} className="text-xs">
                          {l.etapa === "na_loja" ? "Na Loja" : "Aguardando"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {agendFuturos.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold mb-3">Próximos Agendamentos</h2>
                <div className="space-y-2">
                  {agendFuturos.map((l) => {
                    const agente = profiles.find((u) => u.id === l.id_agente);
                    const unidade = unidades.find((u) => u.id === l.id_unidade);
                    return (
                      <div key={l.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                        <div className="flex-1">
                          <span className="font-medium">{l.nome}</span>
                          <p className="text-sm text-muted-foreground">
                            {formatPhone(l.telefone)} · {unidade?.nome} · {l.data_agendamento} · Agente: {agente?.nome}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">{l.data_agendamento}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "usuarios" && <UserManagement />}
      </main>
    </div>
  );
};

export default ManagerDashboard;
