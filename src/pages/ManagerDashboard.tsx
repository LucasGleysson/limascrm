import { useMemo, useState } from "react";
import { UserManagement } from "@/components/UserManagement";
import { useLeads } from "@/contexts/LeadContext";
import { ORIGENS, ETAPAS_FUNIL } from "@/data/mockData";
import { StatsCard } from "@/components/StatsCard";
import { AppSidebar } from "@/components/AppSidebar";
import { PeriodFilter, PeriodKey, getDateRangeForPeriod } from "@/components/PeriodFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, CalendarCheck, TrendingUp, LayoutDashboard, MapPin, Percent,
  RefreshCw, Car, XCircle, FileText, Calendar,
  ClipboardList, Target, CheckCircle2,
} from "lucide-react";
import { FichasPanel } from "@/components/FichasPanel";
import { DailyReportPanel } from "@/components/DailyReportPanel";
import { FollowUpTrackingPanel } from "@/components/FollowUpTrackingPanel";
import { MetasUnidadesPanel } from "@/components/MetasUnidadesPanel";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { isCarroDoAgente, isCarroParaMeta, isPerdidoAntesLoja, isPerdidoDepoisLoja } from "@/lib/leadUtils";

const SIDEBAR_TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "fichas", label: "Fichas", icon: FileText },
  { id: "diario", label: "Relatório Diário", icon: Calendar },
  { id: "followups", label: "Follow-ups", icon: ClipboardList },
  { id: "metas", label: "Metas", icon: Target },
  { id: "usuarios", label: "Usuários", icon: Users },
];

const PIE_COLORS = [
  "hsl(38, 92%, 50%)", "hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)",
  "hsl(0, 72%, 51%)", "hsl(280, 65%, 60%)", "hsl(190, 80%, 45%)", "hsl(45, 90%, 50%)",
];

export const ManagerDashboard = () => {
  const { leads, unidades, profiles, eventos, refreshAll } = useLeads();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [unidadeFilter, setUnidadeFilter] = useState("todas");
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => { setRefreshing(true); await refreshAll(); setRefreshing(false); };

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (unidadeFilter !== "todas") result = result.filter((l) => l.id_unidade === unidadeFilter);
    const { from } = getDateRangeForPeriod(period);
    if (from) result = result.filter((l) => l.data_entrada >= from);
    return result;
  }, [leads, unidadeFilter, period]);

  const stats = useMemo(() => {
    const carrosNaLoja = filteredLeads.filter((l) => isCarroDoAgente(l.etapa)).length;
    const concluidos = filteredLeads.filter((l) => l.etapa === "concluido").length;
    const agendados = filteredLeads.filter((l) => ["agendado", "reagendado"].includes(l.etapa)).length;
    const perdidosAntes = filteredLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length;
    const taxaConversao = filteredLeads.length > 0 ? Math.round((carrosNaLoja / filteredLeads.length) * 100) : 0;
    return { totalLeads: filteredLeads.length, carrosNaLoja, concluidos, agendados, perdidosAntes, taxaConversao };
  }, [filteredLeads]);

  const porOrigem = useMemo(() => {
    return ORIGENS.map((origem) => {
      const oLeads = filteredLeads.filter((l) => l.origem === origem);
      return { origem, total: oLeads.length, concluidos: oLeads.filter((l) => l.etapa === "concluido").length };
    }).filter((o) => o.total > 0).sort((a, b) => b.total - a.total);
  }, [filteredLeads]);

  const funnelData = useMemo(() => {
    return ETAPAS_FUNIL.map((etapa) => ({
      name: etapa.label, value: filteredLeads.filter((l) => l.etapa === etapa.id).length,
    })).filter((d) => d.value > 0);
  }, [filteredLeads]);

  const porUnidade = useMemo(() => {
    return unidades.map((u) => {
      const uLeads = filteredLeads.filter((l) => l.id_unidade === u.id);
      const carrosNaLoja = uLeads.filter((l) => isCarroDoAgente(l.etapa)).length;
      return {
        ...u, total: uLeads.length, carrosNaLoja,
        agendados: uLeads.filter((l) => ["agendado", "reagendado"].includes(l.etapa)).length,
        concluidos: uLeads.filter((l) => l.etapa === "concluido").length,
        perdidos: uLeads.filter((l) => l.etapa === "perdido").length,
      };
    });
  }, [filteredLeads, unidades]);

  const agentes = profiles.filter((u) => u.cargo === "agente");
  const agenteTable = useMemo(() => {
    return agentes.map((agente) => {
      const aLeads = filteredLeads.filter((l) => l.id_agente === agente.id);
      const unidade = unidades.find((u) => u.id === agente.unidade_padrao);
      const carrosNaLoja = aLeads.filter((l) => isCarroDoAgente(l.etapa)).length;
      const agFollowUps = eventos.filter((e) => e.tipo === "followup" && aLeads.some((l) => l.id === e.id_lead));
      return {
        nome: agente.nome, unidade: unidade?.nome || "—",
        novo: aLeads.filter((l) => l.etapa === "novo").length,
        agendado: aLeads.filter((l) => ["agendado", "reagendado"].includes(l.etapa)).length,
        carrosNaLoja,
        concluido: aLeads.filter((l) => l.etapa === "concluido").length,
        dispensados: aLeads.filter((l) => l.etapa === "dispensado").length,
        perdidosAntes: aLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length,
        total: aLeads.length,
        taxa: aLeads.length > 0 ? Math.round((carrosNaLoja / aLeads.length) * 100) : 0,
        fupDone: agFollowUps.filter((e) => e.concluido).length,
        fupPending: agFollowUps.filter((e) => !e.concluido).length,
      };
    });
  }, [filteredLeads, agentes, unidades, eventos]);

  const origemPieData = useMemo(() => {
    return porOrigem.map((o, i) => ({ name: o.origem, value: o.total, fill: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [porOrigem]);

  const RefreshButton = (
    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
      <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
    </Button>
  );

  const UnidadeFilterSelect = (
    <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="todas">Todas as Unidades</SelectItem>
        {unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
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
                <p className="text-muted-foreground text-sm">Visão estratégica de desempenho</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {RefreshButton}
                <PeriodFilter value={period} onChange={setPeriod} />
                {UnidadeFilterSelect}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <StatsCard title="Total de Leads" value={stats.totalLeads} icon={Users} variant="info" />
              <StatsCard title="Agendados" value={stats.agendados} icon={CalendarCheck} variant="primary" />
              <StatsCard title="Foram na Loja" value={stats.carrosNaLoja} icon={Car} variant="warning" />
              <StatsCard title="Concluídos" value={stats.concluidos} icon={CheckCircle2} variant="success" />
              <StatsCard title="Perdidos s/ Loja" value={stats.perdidosAntes} icon={XCircle} variant="destructive" />
              <StatsCard title="Conversão" value={`${stats.taxaConversao}%`} icon={Percent} variant="primary" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold mb-4">Funil de Status</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={funnelData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(38, 92%, 50%)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold mb-4">Distribuição por Origem</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={origemPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                      {origemPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold mb-4">Desempenho por Loja</h2>
                <div className="space-y-3">
                  {porUnidade.map((u) => (
                    <div key={u.id} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-28 shrink-0">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{u.nome}</span>
                      </div>
                      <div className="flex gap-3 text-sm flex-1 justify-end">
                        <span>{u.total} leads</span>
                        <span className="text-warning">{u.carrosNaLoja} loja</span>
                        <span className="text-success">{u.concluidos} ✓</span>
                        <span className="text-destructive">{u.dispensados} disp.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-lg font-semibold mb-4">Top Agentes</h2>
                <div className="space-y-3">
                  {[...agenteTable].sort((a, b) => b.carrosNaLoja - a.carrosNaLoja).map((a) => (
                    <div key={a.nome} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-32 shrink-0">{a.nome}</span>
                      <div className="flex gap-3 text-sm flex-1 justify-end">
                        <span>{a.total} leads</span>
                        <span className="text-warning">{a.carrosNaLoja} loja</span>
                        <span className="text-success">{a.taxa}% conv.</span>
                        <span className="text-primary">{a.fupDone} FUP ✓</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-lg font-semibold mb-4">Desempenho Detalhado por Agente</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                      <th className="text-left py-2 font-medium text-muted-foreground">CIDADE</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">NOVO</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">AGEND.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">CONCL.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">DISP.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">PERD. s/L</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">CONV.</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">FUP ✓</th>
                      <th className="text-center py-2 font-medium text-muted-foreground">FUP ⏳</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agenteTable.map((a) => (
                      <tr key={a.nome} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 font-medium">{a.nome}</td>
                        <td className="py-3 text-muted-foreground">{a.unidade}</td>
                        <td className="py-3 text-center">{a.novo}</td>
                        <td className="py-3 text-center text-primary">{a.agendado}</td>
                        <td className="py-3 text-center text-warning">{a.carrosNaLoja}</td>
                        <td className="py-3 text-center text-success">{a.concluido}</td>
                        <td className="py-3 text-center text-destructive">{a.dispensados}</td>
                        <td className="py-3 text-center text-muted-foreground">{a.perdidosAntes}</td>
                        <td className="py-3 text-center font-medium">{a.taxa}%</td>
                        <td className="py-3 text-center text-success">{a.fupDone}</td>
                        <td className="py-3 text-center">
                          {a.fupPending > 0 ? (
                            <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">{a.fupPending}</Badge>
                          ) : <span className="text-success">0</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                    </tr>
                  </thead>
                  <tbody>
                    {porOrigem.map((o) => (
                      <tr key={o.origem} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 font-medium">{o.origem}</td>
                        <td className="py-3 text-center">{o.total}</td>
                        <td className="py-3 text-center text-success">{o.concluidos}</td>
                        <td className="py-3 text-center">{o.total > 0 ? Math.round((o.concluidos / o.total) * 100) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === "fichas" && <FichasPanel />}
        {activeTab === "diario" && <DailyReportPanel />}
        {activeTab === "followups" && <FollowUpTrackingPanel />}
        {activeTab === "metas" && <MetasUnidadesPanel profiles={profiles} />}
        {activeTab === "usuarios" && <UserManagement />}
      </main>
    </div>
  );
};

export default ManagerDashboard;
