import { useMemo } from "react";
import { StatsCard } from "@/components/StatsCard";
import {
  Car, DollarSign, TrendingUp, TrendingDown, Users, ArrowDownRight,
  Building2, Percent, Phone, Footprints, BarChart3, XCircle, CheckCircle2, AlertTriangle
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid
} from "recharts";
import type { Lead, Unidade } from "@/data/mockData";
import { foiNaLoja, isCarroDoAgente, isPerdidoAntesLoja, isPerdidoDepoisLoja } from "@/lib/leadUtils";

interface Props {
  filteredLeads: Lead[];
  unidades: Unidade[];
  profiles: { id: string; nome: string; cargo: string; unidade_padrao?: string | null }[];
}

const COLORS = {
  porta: "hsl(38, 92%, 50%)",
  tele: "hsl(217, 91%, 60%)",
  concluido: "hsl(142, 71%, 45%)",
  dispensado: "hsl(0, 72%, 51%)",
  perdido: "hsl(280, 65%, 60%)",
  naLoja: "hsl(190, 80%, 45%)",
  noShow: "hsl(0, 50%, 65%)",
  desqNovo: "hsl(0, 0%, 60%)",
  desqAgendado: "hsl(0, 40%, 55%)",
};

const BRL = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 100) : 0;

export const ManagerIntelligencePanel = ({ filteredLeads, unidades, profiles }: Props) => {
  // === Core segmentation ===
  const { porta, tele } = useMemo(() => {
    const porta = filteredLeads.filter((l) => l.is_porta);
    const tele = filteredLeads.filter((l) => !l.is_porta);
    return { porta, tele };
  }, [filteredLeads]);

  // === 1. Vehicle Flow Stats ===
  const flowStats = useMemo(() => {
    const foramNaLoja = filteredLeads.filter((l) => foiNaLoja(l.etapa));
    const portaPassaram = foramNaLoja.filter((l) => l.is_porta);
    const telePassaram = foramNaLoja.filter((l) => !l.is_porta);

    return {
      totalPassaram: foramNaLoja.length,
      portaPassaram: portaPassaram.length,
      telePassaram: telePassaram.length,
    };
  }, [filteredLeads]);

  // === 2. Revenue breakdown ===
  const revenue = useMemo(() => {
    const concluidos = filteredLeads.filter((l) => l.etapa === "concluido");
    const portaConcluidos = concluidos.filter((l) => l.is_porta);
    const teleConcluidos = concluidos.filter((l) => !l.is_porta);

    const fatTotal = concluidos.reduce((s, l) => s + (l.valor_servico || 0), 0);
    const fatPorta = portaConcluidos.reduce((s, l) => s + (l.valor_servico || 0), 0);
    const fatTele = teleConcluidos.reduce((s, l) => s + (l.valor_servico || 0), 0);

    const ticketPorta = portaConcluidos.length > 0 ? fatPorta / portaConcluidos.length : 0;
    const ticketTele = teleConcluidos.length > 0 ? fatTele / teleConcluidos.length : 0;
    const ticketGeral = concluidos.length > 0 ? fatTotal / concluidos.length : 0;

    return {
      total: fatTotal, porta: fatPorta, tele: fatTele,
      ticketPorta, ticketTele, ticketGeral,
      portaConcluidos: portaConcluidos.length,
      teleConcluidos: teleConcluidos.length,
      totalConcluidos: concluidos.length,
    };
  }, [filteredLeads]);

  // === 3. Loss analysis ===
  const lossAnalysis = useMemo(() => {
    const perdidosAntesLoja = filteredLeads.filter((l) => isPerdidoAntesLoja(l.etapa));
    const perdidosDepoisLoja = filteredLeads.filter((l) => isPerdidoDepoisLoja(l.etapa));
    const desqNovo = filteredLeads.filter((l) => l.etapa === "desqualificado_novo").length;
    const desqAgendado = filteredLeads.filter((l) => l.etapa === "desqualificado_agendado").length;
    const dispensados = filteredLeads.filter((l) => l.etapa === "dispensado").length;
    const perdidos = filteredLeads.filter((l) => l.etapa === "perdido").length;

    return {
      totalAntesLoja: perdidosAntesLoja.length,
      totalDepoisLoja: perdidosDepoisLoja.length,
      desqNovo,
      desqAgendado,
      dispensados,
      perdidos,
    };
  }, [filteredLeads]);

  // === 4. Conversion metrics ===
  const conversion = useMemo(() => {
    const teleEnviados = tele.length;
    const teleCheckin = tele.filter((l) => ["concluido", "confirmado", "dispensado", "perdido", "reagendado"].includes(l.etapa)).length;
    const teleNoShow = tele.filter((l) => isPerdidoAntesLoja(l.etapa)).length;
    const teleConcluidos = tele.filter((l) => l.etapa === "concluido").length;
    const teleDispensados = tele.filter((l) => l.etapa === "dispensado").length;
    const telePerdidos = tele.filter((l) => l.etapa === "perdido").length;

    const portaTotal = porta.length;
    const portaConcluidos = porta.filter((l) => l.etapa === "concluido").length;
    const portaDispensados = porta.filter((l) => l.etapa === "dispensado").length;
    const portaPerdidos = porta.filter((l) => l.etapa === "perdido").length;
    const portaEmServico = porta.filter((l) => ["na_loja", "concluido"].includes(l.etapa)).length;

    return {
      teleEnviados, teleCheckin, teleNoShow, teleConcluidos, teleDispensados, telePerdidos,
      portaTotal, portaConcluidos, portaDispensados, portaPerdidos, portaEmServico,
      taxaAprovPorta: pct(portaEmServico, portaTotal),
      taxaAprovTele: pct(teleConcluidos, teleCheckin || teleEnviados),
    };
  }, [filteredLeads, porta, tele]);

  // === 5. Per-unit vehicle flow ===
  const unitFlow = useMemo(() => {
    return unidades.map((u) => {
      const unitLeads = filteredLeads.filter((l) => l.id_unidade === u.id);
      const foramNaLoja = unitLeads.filter((l) => ["concluido", "confirmado", "dispensado", "perdido", "reagendado"].includes(l.etapa));
      const portaUnit = foramNaLoja.filter((l) => l.is_porta).length;
      const teleUnit = foramNaLoja.filter((l) => !l.is_porta).length;
      const concluidos = unitLeads.filter((l) => l.etapa === "concluido");
      const receita = concluidos.reduce((s, l) => s + (l.valor_servico || 0), 0);
      const dispensados = unitLeads.filter((l) => l.etapa === "dispensado").length;
      const perdidosAntes = unitLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length;
      const aproveitamento = foramNaLoja.length > 0 ? pct(concluidos.length, foramNaLoja.length) : 0;

      return {
        nome: u.nome,
        total: foramNaLoja.length,
        porta: portaUnit,
        tele: teleUnit,
        concluidos: concluidos.length,
        dispensados,
        perdidosAntes,
        receita,
        aproveitamento,
      };
    }).sort((a, b) => b.total - a.total);
  }, [filteredLeads, unidades]);

  // === 6. Revenue pie data ===
  const revenuePie = useMemo(() => [
    { name: "Porta", value: revenue.porta, fill: COLORS.porta },
    { name: "Tele (Agendamento)", value: revenue.tele, fill: COLORS.tele },
  ].filter((d) => d.value > 0), [revenue]);

  // === 7. Loss breakdown chart ===
  const lossChartData = useMemo(() => [
    { name: "Desq. Novo", value: lossAnalysis.desqNovo, fill: COLORS.desqNovo },
    { name: "Desq. Agendado", value: lossAnalysis.desqAgendado, fill: COLORS.desqAgendado },
    { name: "Dispensados", value: lossAnalysis.dispensados, fill: COLORS.dispensado },
    { name: "Perdidos", value: lossAnalysis.perdidos, fill: COLORS.perdido },
  ].filter((d) => d.value > 0), [lossAnalysis]);

  // === 8. Agent productivity ===
  const agentProductivity = useMemo(() => {
    const agents = profiles.filter((p) => p.cargo === "agente");
    return agents.map((a) => {
      const aLeads = filteredLeads.filter((l) => l.id_agente === a.id);
      const total = aLeads.length;
      const carrosNaLoja = aLeads.filter((l) => ["concluido", "confirmado", "dispensado", "perdido", "reagendado"].includes(l.etapa)).length;
      const concluidos = aLeads.filter((l) => l.etapa === "concluido").length;
      const perdidosAntes = aLeads.filter((l) => isPerdidoAntesLoja(l.etapa)).length;
      const perdidosDepois = aLeads.filter((l) => isPerdidoDepoisLoja(l.etapa)).length;
      const receita = aLeads.filter((l) => l.etapa === "concluido").reduce((s, l) => s + (l.valor_servico || 0), 0);

      return {
        nome: a.nome,
        total,
        carrosNaLoja,
        concluidos,
        perdidosAntes,
        perdidosDepois,
        receita,
        taxaLoja: pct(carrosNaLoja, total),
        taxaConversao: pct(concluidos, total),
      };
    }).filter((a) => a.total > 0).sort((a, b) => b.carrosNaLoja - a.carrosNaLoja);
  }, [filteredLeads, profiles]);

  return (
    <div className="space-y-6">
      {/* === HEADER STATS === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Carros na Loja"
          value={flowStats.totalPassaram}
          subtitle={`${flowStats.portaPassaram} porta · ${flowStats.telePassaram} agendamento`}
          icon={Car}
          variant="info"
        />
        <StatsCard
          title="Faturamento Total"
          value={BRL(revenue.total)}
          subtitle={`${revenue.totalConcluidos} serviços concluídos`}
          icon={DollarSign}
          variant="primary"
        />
        <StatsCard
          title="Perdidos s/ Loja"
          value={lossAnalysis.totalAntesLoja}
          subtitle={`${lossAnalysis.desqNovo} novos · ${lossAnalysis.desqAgendado} agendados`}
          icon={XCircle}
          variant="destructive"
        />
        <StatsCard
          title="Perdidos c/ Loja"
          value={lossAnalysis.totalDepoisLoja}
          subtitle={`${lossAnalysis.dispensados} dispensados · ${lossAnalysis.perdidos} perdidos`}
          icon={AlertTriangle}
          variant="warning"
        />
      </div>

      {/* === PORTA vs TELE CARDS === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Porta */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Footprints className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Porta (Walk-in)</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{conversion.portaTotal}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground">Concluídos</p>
              <p className="text-2xl font-bold text-success">{conversion.portaConcluidos}</p>
              <p className="text-xs text-muted-foreground">{conversion.taxaAprovPorta}% aproveitamento</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground">Dispensados</p>
              <p className="text-2xl font-bold text-destructive">{conversion.portaDispensados}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground">Faturamento</p>
              <p className="text-xl font-bold text-primary">{BRL(revenue.porta)}</p>
              <p className="text-xs text-muted-foreground">Ticket: {BRL(revenue.ticketPorta)}</p>
            </div>
          </div>
        </div>

        {/* Tele */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="h-5 w-5 text-info" />
            <h2 className="text-lg font-semibold">Tele (Agendamento)</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground">Total de Leads</p>
              <p className="text-2xl font-bold">{conversion.teleEnviados}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground">Foram na Loja</p>
              <p className="text-2xl font-bold text-warning">{conversion.teleCheckin}</p>
              <p className="text-xs text-muted-foreground">{pct(conversion.teleCheckin, conversion.teleEnviados)}% comparecimento</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground">Não Foram (Desq.)</p>
              <p className="text-2xl font-bold text-muted-foreground">{conversion.teleNoShow}</p>
              <p className="text-xs text-muted-foreground">{pct(conversion.teleNoShow, conversion.teleEnviados)}% perdidos s/ loja</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground">Faturamento</p>
              <p className="text-xl font-bold text-primary">{BRL(revenue.tele)}</p>
              <p className="text-xs text-muted-foreground">Ticket: {BRL(revenue.ticketTele)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* === LOSS BREAKDOWN + REVENUE PIE === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold mb-4">Análise de Perdas</h2>
          {lossChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={lossChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {lossChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Sem perdas no período.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold mb-4">Composição do Faturamento</h2>
          {revenuePie.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={revenuePie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${name}: ${BRL(value)}`}
                >
                  {revenuePie.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => BRL(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados de faturamento no período.</p>
          )}
        </div>
      </div>

      {/* === UNIT FLOW TABLE === */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold mb-4">Fluxo por Unidade</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">UNIDADE</th>
                <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                <th className="text-center py-2 font-medium text-muted-foreground">PORTA</th>
                <th className="text-center py-2 font-medium text-muted-foreground">TELE</th>
                <th className="text-center py-2 font-medium text-muted-foreground">CONCL.</th>
                <th className="text-center py-2 font-medium text-muted-foreground">DISP.</th>
                <th className="text-center py-2 font-medium text-muted-foreground">PERD. s/L</th>
                <th className="text-center py-2 font-medium text-muted-foreground">APROV.</th>
                <th className="text-right py-2 font-medium text-muted-foreground">RECEITA</th>
              </tr>
            </thead>
            <tbody>
              {unitFlow.map((u) => (
                <tr key={u.nome} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-3 font-medium">{u.nome}</td>
                  <td className="py-3 text-center font-bold">{u.total}</td>
                  <td className="py-3 text-center">{u.porta}</td>
                  <td className="py-3 text-center">{u.tele}</td>
                  <td className="py-3 text-center text-success">{u.concluidos}</td>
                  <td className="py-3 text-center text-destructive">{u.dispensados}</td>
                  <td className="py-3 text-center text-muted-foreground">{u.perdidosAntes}</td>
                  <td className="py-3 text-center">{u.aproveitamento}%</td>
                  <td className="py-3 text-right font-semibold text-primary">{BRL(u.receita)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* === AGENT PRODUCTIVITY === */}
      {agentProductivity.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-info" />
            <h2 className="text-lg font-semibold">Produtividade dos Agentes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-muted-foreground">AGENTE</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">LEADS</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">NA LOJA</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">CONCL.</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">PERD. s/L</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">PERD. c/L</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">% LOJA</th>
                  <th className="text-center py-2 font-medium text-muted-foreground">% CONV.</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">RECEITA</th>
                </tr>
              </thead>
              <tbody>
                {agentProductivity.map((a) => (
                  <tr key={a.nome} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 font-medium">{a.nome}</td>
                    <td className="py-3 text-center">{a.total}</td>
                    <td className="py-3 text-center text-warning font-semibold">{a.carrosNaLoja}</td>
                    <td className="py-3 text-center text-success">{a.concluidos}</td>
                    <td className="py-3 text-center text-muted-foreground">{a.perdidosAntes}</td>
                    <td className="py-3 text-center text-destructive">{a.perdidosDepois}</td>
                    <td className="py-3 text-center font-semibold">{a.taxaLoja}%</td>
                    <td className="py-3 text-center font-semibold">{a.taxaConversao}%</td>
                    <td className="py-3 text-right font-semibold text-primary">{BRL(a.receita)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === KEY INSIGHTS SUMMARY === */}
      <div className="rounded-xl border border-primary/20 bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Resumo de Indicadores</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <InsightCard
            icon={CheckCircle2}
            iconColor="text-success"
            title="Taxa de Aproveitamento"
            value={`${pct(revenue.totalConcluidos, flowStats.totalPassaram)}%`}
            detail={`${revenue.totalConcluidos} concluídos de ${flowStats.totalPassaram} que foram na loja`}
          />
          <InsightCard
            icon={Car}
            iconColor="text-warning"
            title="Carros dos Agentes"
            value={`${flowStats.totalPassaram}`}
            detail={`${pct(flowStats.totalPassaram, filteredLeads.length)}% dos leads chegaram na loja`}
          />
          <InsightCard
            icon={XCircle}
            iconColor="text-muted-foreground"
            title="Perdas Antes da Loja"
            value={`${lossAnalysis.totalAntesLoja}`}
            detail={`${lossAnalysis.desqNovo} nunca agendaram · ${lossAnalysis.desqAgendado} agendaram e não foram`}
          />
          <InsightCard
            icon={AlertTriangle}
            iconColor="text-destructive"
            title="Perdas Depois da Loja"
            value={`${lossAnalysis.totalDepoisLoja}`}
            detail={`${lossAnalysis.dispensados} dispensados · ${lossAnalysis.perdidos} perdidos definitivamente`}
          />
          <InsightCard
            icon={DollarSign}
            iconColor="text-primary"
            title="Receita por Canal"
            value={revenue.total > 0 ? `${pct(revenue.porta, revenue.total)}% Porta` : "—"}
            detail={`Porta: ${BRL(revenue.porta)} · Tele: ${BRL(revenue.tele)}`}
          />
          <InsightCard
            icon={Building2}
            iconColor="text-info"
            title="Melhor Unidade"
            value={unitFlow.length > 0 ? unitFlow.sort((a, b) => b.aproveitamento - a.aproveitamento)[0]?.nome || "—" : "—"}
            detail={unitFlow.length > 0 ? `${unitFlow.sort((a, b) => b.aproveitamento - a.aproveitamento)[0]?.aproveitamento}% de aproveitamento` : "Sem dados"}
          />
        </div>
      </div>
    </div>
  );
};

// Small insight card sub-component
const InsightCard = ({
  icon: Icon,
  iconColor,
  title,
  value,
  detail,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  value: string;
  detail: string;
}) => (
  <div className="flex gap-3 items-start p-3 rounded-lg bg-muted/40">
    <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${iconColor}`} />
    <div>
      <p className="text-muted-foreground text-xs">{title}</p>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  </div>
);
