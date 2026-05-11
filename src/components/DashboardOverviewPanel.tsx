import React, { useMemo, useState } from "react";
import { ORIGENS, Lead } from "@/data/mockData";
import { foiNaLoja, isPerdidoAntesLoja } from "@/lib/leadUtils";
import { StatsCard } from "@/components/StatsCard";
import { Badge } from "@/components/ui/badge";
import {
  Users, CalendarCheck, TrendingUp, MapPin, Car, XCircle, Calendar,
  ClipboardList, CheckCircle2, ChevronRight, AlertTriangle, Skull,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const PIE_COLORS = [
  "hsl(38, 92%, 50%)", "hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)",
  "hsl(0, 72%, 51%)", "hsl(280, 65%, 60%)", "hsl(190, 80%, 45%)", "hsl(45, 90%, 50%)",
];

interface Props {
  filteredLeads: Lead[];
  unidades: { id: string; nome: string }[];
  profiles: { id: string; nome: string; cargo: string; unidade_padrao?: string | null }[];
  eventos: { id: string; id_lead: string; tipo: string; concluido: boolean; data_prevista: string }[];
  agentUnidades: { id_agente: string; id_unidade: string }[];
  periodRange: { from: string | null; to: string | null };
}

export const DashboardOverviewPanel: React.FC<Props> = ({
  filteredLeads, unidades, profiles, eventos, agentUnidades, periodRange,
}) => {
  const [expandedAgente, setExpandedAgente] = useState<string | null>(null);

  const agentes = useMemo(() => profiles.filter((u) => u.cargo === "agente"), [profiles]);

  const agentUnitMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    agentUnidades.forEach((au) => {
      if (!map[au.id_agente]) map[au.id_agente] = [];
      map[au.id_agente].push(au.id_unidade);
    });
    return map;
  }, [agentUnidades]);

  const stats = useMemo(() => {
    const carrosNaLoja = filteredLeads.filter((l) => foiNaLoja(l)).length;
    const concluidos = filteredLeads.filter((l) => l.etapa === "concluido").length;
    const totalAgendamentos = filteredLeads.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado", "analise_supervisor"].includes(l.etapa)).length;
    const novos = filteredLeads.filter((l) => l.etapa === "novo").length;
    const dispensados = filteredLeads.filter((l) => l.etapa === "dispensado").length;
    const perdidos = filteredLeads.filter((l) => l.etapa === "perdido").length;
    const reagendados = filteredLeads.filter((l) => l.etapa === "reagendado").length;
    const desqNovos = filteredLeads.filter((l) => l.etapa === "desqualificado_novo").length;
    const desqOutraCidade = filteredLeads.filter((l) => l.etapa === "desqualificado_novo" && (l.notas || "").includes("[Outra Cidade]")).length;
    const desqAgendados = filteredLeads.filter((l) => l.etapa === "desqualificado_agendado").length;
    const trabalhados = filteredLeads.filter((l) => l.etapa === "trabalhado").length;
    const taxaConversao = carrosNaLoja > 0 ? Math.round((concluidos / carrosNaLoja) * 100) : 0;
    const naLojaConfirmado = filteredLeads.filter((l) => l.etapa === "confirmado").length;
    const naLojaEmLoja = filteredLeads.filter((l) => l.etapa === "na_loja").length;
    const naLojaAnalise = filteredLeads.filter((l) => l.etapa === "analise_supervisor").length;
    const NA_LOJA_ETAPAS = ["confirmado","na_loja","analise_supervisor","reagendado","concluido","dispensado","perdido"];
    const naLojaOutros = filteredLeads.filter((l) => foiNaLoja(l) && !NA_LOJA_ETAPAS.includes(l.etapa)).length;
    return { totalLeads: filteredLeads.length, carrosNaLoja, concluidos, totalAgendamentos, novos, dispensados, perdidos, reagendados, desqNovos, desqOutraCidade, desqAgendados, trabalhados, taxaConversao, naLojaConfirmado, naLojaEmLoja, naLojaAnalise, naLojaOutros };
  }, [filteredLeads]);

  const porOrigem = useMemo(() => {
    return ORIGENS.map((origem) => {
      const oLeads = filteredLeads.filter((l) => l.origem === origem);
      return { origem, total: oLeads.length, concluidos: oLeads.filter((l) => l.etapa === "concluido").length };
    }).filter((o) => o.total > 0).sort((a, b) => b.total - a.total);
  }, [filteredLeads]);

  const funnelData = useMemo(() => {
    const total = filteredLeads.length;
    const agendamentos = filteredLeads.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado", "analise_supervisor"].includes(l.etapa)).length;
    const naLoja = filteredLeads.filter((l) => foiNaLoja(l)).length;
    const concluidos = filteredLeads.filter((l) => l.etapa === "concluido").length;
    const dispensados = filteredLeads.filter((l) => l.etapa === "dispensado").length;
    const reagendados = filteredLeads.filter((l) => l.etapa === "reagendado").length;
    const perdidos = filteredLeads.filter((l) => l.etapa === "perdido").length;
    return [
      { name: "Leads Produtivos", value: total - filteredLeads.filter((l) => l.etapa === "desqualificado_novo").length },
      { name: "Agendamentos", value: agendamentos },
      { name: "Na Loja", value: naLoja },
      { name: "Concluídos", value: concluidos },
      { name: "Dispensados", value: dispensados },
      { name: "Reagendados", value: reagendados },
      { name: "Perdidos", value: perdidos },
    ].filter((d) => d.value > 0);
  }, [filteredLeads]);

  const porUnidade = useMemo(() => {
    return unidades.map((u) => {
      const unitAgentIds = new Set(agentUnidades.filter((au) => au.id_unidade === u.id).map((au) => au.id_agente));
      const uAgents = agentes.filter((a) => unitAgentIds.has(a.id));
      const uLeads = filteredLeads.filter((l) => l.id_unidade === u.id);
      const carrosNaLoja = uLeads.filter((l) => foiNaLoja(l)).length;
      const naLojaConfirmado = uLeads.filter((l) => l.etapa === "confirmado").length;
      const naLojaEmLoja = uLeads.filter((l) => l.etapa === "na_loja").length;
      const naLojaAnalise = uLeads.filter((l) => l.etapa === "analise_supervisor").length;
      const reagendados = uLeads.filter((l) => l.etapa === "reagendado").length;
      const NA_LOJA_ETAPAS_U = ["confirmado","na_loja","analise_supervisor","reagendado","concluido","dispensado","perdido"];
      const naLojaOutros = uLeads.filter((l) => foiNaLoja(l) && !NA_LOJA_ETAPAS_U.includes(l.etapa)).length;
      const totalAgendamentos = uLeads.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado", "analise_supervisor"].includes(l.etapa)).length;
      const desqNovos = uLeads.filter((l) => l.etapa === "desqualificado_novo").length;
      const desqOutraCidade = uLeads.filter((l) => l.etapa === "desqualificado_novo" && (l.notas || "").includes("[Outra Cidade]")).length;
      const desqAgendados = uLeads.filter((l) => l.etapa === "desqualificado_agendado").length;
      const dispensados = uLeads.filter((l) => l.etapa === "dispensado").length;
      const perdidos = uLeads.filter((l) => l.etapa === "perdido").length;
      const concluidos = uLeads.filter((l) => l.etapa === "concluido").length;
      const txConversao = carrosNaLoja > 0 ? Math.round((concluidos / carrosNaLoja) * 100) : 0;
      return {
        ...u, total: uLeads.length, carrosNaLoja, totalAgendamentos,
        concluidos, dispensados, perdidos, desqNovos, desqOutraCidade, desqAgendados,
        txConversao, unitAgents: uAgents,
        naLojaConfirmado, naLojaEmLoja, naLojaAnalise, reagendados, naLojaOutros,
      };
    });
  }, [filteredLeads, unidades, agentes, agentUnidades]);

  const agenteTable = useMemo(() => {
    return agentes.map((agente) => {
      const aLeads = filteredLeads.filter((l) => l.id_agente === agente.id);
      const agUnitIds = agentUnitMap[agente.id] || (agente.unidade_padrao ? [agente.unidade_padrao] : []);
      const unidadeNome = agUnitIds.map((id) => unidades.find((u) => u.id === id)?.nome).filter(Boolean).join(" / ") || "—";
      const carrosNaLoja = aLeads.filter((l) => foiNaLoja(l)).length;
      const agFollowUps = eventos.filter((e) => e.tipo === "followup" && aLeads.some((l) => l.id === e.id_lead));
      const totalAgendamentos = aLeads.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado", "analise_supervisor"].includes(l.etapa)).length;
      return {
        nome: agente.nome, unidade: unidadeNome, agenteId: agente.id,
        novo: aLeads.filter((l) => l.etapa === "novo").length,
        agendado: totalAgendamentos,
        carrosNaLoja,
        concluido: aLeads.filter((l) => l.etapa === "concluido").length,
        perdidos: aLeads.filter((l) => l.etapa === "perdido").length,
        perdidosAntes: aLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length,
        total: aLeads.length,
        taxa: aLeads.length > 0 ? Math.round((carrosNaLoja / aLeads.length) * 100) : 0,
        fupDone: agFollowUps.filter((e) => e.concluido).length,
        fupPending: agFollowUps.filter((e) => !e.concluido).length,
      };
    });
  }, [filteredLeads, agentes, unidades, eventos, agentUnitMap]);

  const origemPieData = useMemo(() => {
    return porOrigem.map((o, i) => ({ name: o.origem, value: o.total, fill: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [porOrigem]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  return (
    <>
      {/* Registros e Funil */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total de Registros" value={stats.totalLeads} icon={Users} variant="info" />
        <StatsCard title="Agendamentos" value={stats.totalAgendamentos} icon={CalendarCheck} variant="primary" />
        <StatsCard title="Leads Produtivos" value={stats.totalLeads - stats.desqNovos} icon={Users} variant="success" subtitle="Total - Desq. Novos" />
        <StatsCard title="Aproveitamento" value={`${(stats.totalLeads - stats.desqNovos) > 0 ? Math.round((stats.carrosNaLoja / (stats.totalLeads - stats.desqNovos)) * 100) : 0}%`} icon={TrendingUp} variant="primary" subtitle="Na Loja / Produtivos" />
      </div>
      {/* Na Loja */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Na Loja" value={stats.carrosNaLoja} icon={Car} variant="warning" subtitle="Conf+Concl+Disp+Perd+Reag" />
        <StatsCard title="Concluídos" value={stats.concluidos} icon={CheckCircle2} variant="success" />
        <StatsCard title="Dispensados" value={stats.dispensados} icon={XCircle} variant="warning" />
        <StatsCard title="Perdidos" value={stats.perdidos} icon={Skull} variant="destructive" />
      </div>
      {/* Detalhamento Na Loja */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Detalhamento "Na Loja"</h2>
          <p className="text-xs text-muted-foreground">Total {stats.carrosNaLoja} = soma das etapas abaixo</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          <StatsCard title="Confirmados" value={stats.naLojaConfirmado} icon={CalendarCheck} variant="info" subtitle="Apareceu, aguardando" />
          <StatsCard title="Em loja agora" value={stats.naLojaEmLoja} icon={Car} variant="warning" subtitle="Em atendimento" />
          <StatsCard title="Em análise" value={stats.naLojaAnalise} icon={AlertTriangle} variant="warning" subtitle="Análise do supervisor" />
          <StatsCard title="Reagendados" value={stats.reagendados} icon={Calendar} variant="info" subtitle="Dispensado e reagendado" />
          <StatsCard title="Concluídos" value={stats.concluidos} icon={CheckCircle2} variant="success" />
          <StatsCard title="Dispensados" value={stats.dispensados} icon={XCircle} variant="warning" />
          <StatsCard title="Perdidos" value={stats.perdidos} icon={Skull} variant="destructive" />
          <StatsCard title="Fantasmas" value={stats.naLojaOutros} icon={AlertTriangle} variant="destructive" subtitle="Check-in mas saiu do funil" />
        </div>
      </div>
      {/* Desqualificados */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Desq. Novo" value={stats.desqNovos} icon={XCircle} variant="destructive" />
        <StatsCard title="Outra Cidade" value={stats.desqOutraCidade} icon={MapPin} variant="warning" />
        <StatsCard title="Desq. Agendado" value={stats.desqAgendados} icon={XCircle} variant="destructive" />
        <StatsCard title="Trabalhados" value={stats.trabalhados} icon={ClipboardList} variant="info" subtitle="FUP encerrado sem agendar" />
        <StatsCard title="Conversão (Loja→Concl.)" value={`${stats.taxaConversao}%`} icon={TrendingUp} variant="primary" />
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
                  <span className="text-destructive">{u.perdidos} perd.</span>
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
                <th className="text-center py-2 font-medium text-muted-foreground">PERD.</th>
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
                  <td className="py-3 text-center text-destructive">{a.perdidos}</td>
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
                <th className="text-center py-2 font-medium text-muted-foreground">DESQ. NOVO</th>
                <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                <th className="text-center py-2 font-medium text-muted-foreground">DISP.</th>
                <th className="text-center py-2 font-medium text-muted-foreground">AGEND.</th>
                <th className="text-center py-2 font-medium text-muted-foreground">NO-SHOW</th>
                <th className="text-center py-2 font-medium text-muted-foreground">PERD.</th>
                <th className="text-center py-2 font-medium text-muted-foreground">CONCL.</th>
                <th className="text-center py-2 font-medium text-muted-foreground">CONV.</th>
              </tr>
            </thead>
            <tbody>
              {ORIGENS.map((origem) => {
                const oLeads = filteredLeads.filter((l) => l.origem === origem);
                if (oLeads.length === 0) return null;
                const desqNovo = oLeads.filter((l) => l.etapa === "desqualificado_novo").length;
                const naLoja = oLeads.filter((l) => foiNaLoja(l)).length;
                const dispensados = oLeads.filter((l) => l.etapa === "dispensado").length;
                const agendados = oLeads.filter((l) => ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado"].includes(l.etapa)).length;
                const noShow = oLeads.filter((l: Lead) => ["agendado", "reagendado"].includes(l.etapa) && l.data_agendamento && l.data_agendamento < todayStr).length;
                const perdidos = oLeads.filter((l) => l.etapa === "perdido").length;
                const concluidos = oLeads.filter((l) => l.etapa === "concluido").length;
                const conv = naLoja > 0 ? Math.round((concluidos / naLoja) * 100) : 0;
                return (
                  <tr key={origem} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 font-medium">{origem}</td>
                    <td className="py-3 text-center">{oLeads.length}</td>
                    <td className="py-3 text-center text-muted-foreground">{desqNovo}</td>
                    <td className="py-3 text-center text-warning">{naLoja}</td>
                    <td className="py-3 text-center text-purple-500">{dispensados}</td>
                    <td className="py-3 text-center text-primary">{agendados}</td>
                    <td className="py-3 text-center text-destructive">{noShow}</td>
                    <td className="py-3 text-center text-destructive">{perdidos}</td>
                    <td className="py-3 text-center text-success">{concluidos}</td>
                    <td className="py-3 text-center font-medium">{conv}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relatório por Loja com fantasmas */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold mb-1">Relatório por Loja</h2>
        <p className="text-xs text-muted-foreground mb-4">Detalhamento "Na Loja" por etapa (mesma lógica do card global). Fantasmas = check-in registrado mas saiu para outra etapa fora do funil.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">LOJA</th>
                <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                <th className="text-center py-2 font-medium text-muted-foreground">CONF.</th>
                <th className="text-center py-2 font-medium text-muted-foreground">EM LOJA</th>
                <th className="text-center py-2 font-medium text-muted-foreground">ANÁLISE</th>
                <th className="text-center py-2 font-medium text-muted-foreground">REAG.</th>
                <th className="text-center py-2 font-medium text-muted-foreground">CONCL.</th>
                <th className="text-center py-2 font-medium text-muted-foreground">DISP.</th>
                <th className="text-center py-2 font-medium text-muted-foreground">PERD.</th>
                <th className="text-center py-2 font-medium text-muted-foreground">FANTASMAS</th>
              </tr>
            </thead>
            <tbody>
              {porUnidade.map((u) => {
                const soma = u.naLojaConfirmado + u.naLojaEmLoja + u.naLojaAnalise + u.reagendados + u.concluidos + u.dispensados + u.perdidos + u.naLojaOutros;
                return (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 font-medium flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{u.nome}</td>
                    <td className="py-3 text-center text-warning font-bold" title={`Soma das etapas: ${soma}`}>{u.carrosNaLoja}</td>
                    <td className="py-3 text-center text-info">{u.naLojaConfirmado}</td>
                    <td className="py-3 text-center text-warning">{u.naLojaEmLoja}</td>
                    <td className="py-3 text-center text-warning">{u.naLojaAnalise}</td>
                    <td className="py-3 text-center text-info">{u.reagendados}</td>
                    <td className="py-3 text-center text-success">{u.concluidos}</td>
                    <td className="py-3 text-center text-purple-500">{u.dispensados}</td>
                    <td className="py-3 text-center text-destructive">{u.perdidos}</td>
                    <td className="py-3 text-center text-destructive font-medium">{u.naLojaOutros}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relatório por Agente com expansão */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold mb-4">Relatório por Agente</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                <th className="text-center py-2 font-medium text-muted-foreground">LEADS</th>
                <th className="text-center py-2 font-medium text-muted-foreground">PRODUTIVOS</th>
                <th className="text-center py-2 font-medium text-muted-foreground">AGEND.</th>
                <th className="text-center py-2 font-medium text-muted-foreground">MÉD. AGEND./DIA</th>
                <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                <th className="text-center py-2 font-medium text-muted-foreground">MÉD. LOJA/DIA</th>
                <th className="text-center py-2 font-medium text-muted-foreground">NO-SHOW</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rangeStart = new Date((periodRange.from || todayStr) + "T00:00:00");
                const rangeEnd = new Date(Math.min(new Date((periodRange.to || todayStr) + "T00:00:00").getTime(), new Date().setHours(0,0,0,0)));
                let bizDays = 0;
                for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
                  const dow = d.getDay();
                  if (dow !== 0 && dow !== 6) bizDays++;
                }
                const elapsed = Math.max(bizDays, 1);
                return agenteTable.map((a) => {
                  const aLeads = filteredLeads.filter((l) => l.id_agente === a.agenteId);
                  const desqNovos = aLeads.filter((l) => l.etapa === "desqualificado_novo").length;
                  const desqAgendados = aLeads.filter((l) => l.etapa === "desqualificado_agendado").length;
                  const produtivos = aLeads.length - desqNovos;
                  const noShow = aLeads.filter((l: Lead) => ["agendado", "reagendado"].includes(l.etapa) && l.data_agendamento && l.data_agendamento < todayStr).length;
                  const mediaAgend = (a.agendado / elapsed).toFixed(1);
                  const mediaLoja = (a.carrosNaLoja / elapsed).toFixed(1);
                  const isExpanded = expandedAgente === a.agenteId;
                  const dispensados = aLeads.filter((l) => l.etapa === "dispensado").length;
                  const resgatados = aLeads.filter((l) => l.etapa === "reagendado").length;
                  const ganhosFup = aLeads.filter((l) => l.etapa === "concluido" && l.fup_concluido).length;
                  const txComparecimento = a.agendado > 0 ? Math.round((a.carrosNaLoja / a.agendado) * 100) : 0;
                  const txAproveitamento = produtivos > 0 ? Math.round((a.carrosNaLoja / produtivos) * 100) : 0;
                  return (
                    <React.Fragment key={a.nome}>
                      <tr className={`border-b border-border/50 hover:bg-muted/30 cursor-pointer ${isExpanded ? "bg-muted/20" : ""}`} onClick={() => setExpandedAgente(isExpanded ? null : a.agenteId)}>
                        <td className="py-3 font-medium flex items-center gap-1">
                          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          {a.nome}
                        </td>
                        <td className="py-3 text-center">{a.total}</td>
                        <td className="py-3 text-center text-primary">{produtivos}</td>
                        <td className="py-3 text-center text-primary">{a.agendado}</td>
                        <td className="py-3 text-center text-muted-foreground">{mediaAgend}</td>
                        <td className="py-3 text-center text-warning">{a.carrosNaLoja}</td>
                        <td className="py-3 text-center text-muted-foreground">{mediaLoja}</td>
                        <td className="py-3 text-center text-destructive">{noShow}</td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="p-4 bg-muted/10 border-b border-border">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="rounded-lg border border-border bg-card p-3 text-center"><p className="text-xs text-muted-foreground">Leads Recebidos</p><p className="text-lg font-bold">{a.total}</p></div>
                              <div className="rounded-lg border border-border bg-card p-3 text-center"><p className="text-xs text-muted-foreground">Desqualificados</p><p className="text-lg font-bold text-destructive">{desqNovos + desqAgendados}</p></div>
                              <div className="rounded-lg border border-border bg-card p-3 text-center"><p className="text-xs text-muted-foreground">Produtivos</p><p className="text-lg font-bold text-primary">{produtivos}</p></div>
                              <div className="rounded-lg border border-border bg-card p-3 text-center"><p className="text-xs text-muted-foreground">Agendamentos</p><p className="text-lg font-bold text-primary">{a.agendado}</p></div>
                              <div className="rounded-lg border border-border bg-card p-3 text-center"><p className="text-xs text-muted-foreground">Méd. Loja/Dia</p><p className="text-lg font-bold text-warning">{mediaLoja}</p></div>
                              <div className="rounded-lg border border-border bg-card p-3 text-center"><p className="text-xs text-muted-foreground">Na Loja</p><p className="text-lg font-bold text-warning">{a.carrosNaLoja}</p></div>
                              <div className="rounded-lg border border-border bg-card p-3 text-center"><p className="text-xs text-muted-foreground">No-Show</p><p className="text-lg font-bold text-destructive">{noShow}</p></div>
                              <div className="rounded-lg border border-border bg-card p-3 text-center"><p className="text-xs text-muted-foreground">Tx Comparecimento</p><p className="text-lg font-bold">{txComparecimento}%</p></div>
                              <div className="rounded-lg border border-border bg-card p-3 text-center"><p className="text-xs text-muted-foreground">Aproveitamento</p><p className="text-lg font-bold">{txAproveitamento}%</p></div>
                              <div className="rounded-lg border border-border bg-card p-3 text-center"><p className="text-xs text-muted-foreground">Resgatados</p><p className="text-lg font-bold text-info">{resgatados}</p></div>
                              <div className="rounded-lg border border-border bg-card p-3 text-center"><p className="text-xs text-muted-foreground">Ganhos c/ FUP</p><p className="text-lg font-bold text-success">{ganhosFup}</p></div>
                              <div className="rounded-lg border border-border bg-card p-3 text-center"><p className="text-xs text-muted-foreground">Dispensados</p><p className="text-lg font-bold text-destructive">{dispensados}</p></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};