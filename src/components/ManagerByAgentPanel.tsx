import React, { useEffect, useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, Flame, AlertTriangle, Target, Users, CalendarCheck, CheckCircle2,
  Car, XCircle, RefreshCw, ClipboardCheck, MapPin, Skull, CheckCheck, RotateCcw, Search,
  Wallet, Rocket,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isPerdidoAntesLoja, comissaoRate, COMISSAO_RATE_MAX, META_AGENTE_PADRAO } from "@/lib/leadUtils";
import { AgentDailyChart } from "@/components/AgentDailyChart";

const DEFAULT_META = META_AGENTE_PADRAO;
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function countBusinessDays(from: Date, to: Date): number {
  let count = 0;
  const d = new Date(from);
  while (d <= to) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

interface AgenteStat {
  id: string;
  nome: string;
  unidadeNome: string;
  total: number;
  passaramNaLoja: number;
  concluidos: number;
  totalAgendamentos: number;
  dispensados: number;
  perdidos: number;
  desqNovos: number;
  desqAgendados: number;
  perdidosAntes: number;
  txConversao: number;
  txAgendamento: number;
  fupConcluidos: number;
  fupPendentes: number;
  leads: any[];
  naLojaConfirmado?: number;
  naLojaReagendado?: number;
  naLojaAnalise?: number;
  porUnidade?: Array<{
    id: string;
    nome: string;
    naLoja: number;
    concluidos: number;
    perdidos: number;
    dispensados: number;
    agendamentos: number;
  }>;
}

interface Props {
  agenteStats: AgenteStat[];
  period: string;
  mesRef: string;
  periodRange: { from: string; to: string };
  headerActions: React.ReactNode;
}

export const ManagerByAgentPanel: React.FC<Props> = ({
  agenteStats, period, mesRef, periodRange, headerActions,
}) => {
  const [metasMap, setMetasMap] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("metas_agentes")
        .select("id_agente, meta_carros")
        .eq("mes_ref", mesRef);
      if (!active) return;
      const map: Record<string, number> = {};
      (data || []).forEach((r: any) => { map[r.id_agente] = r.meta_carros || 0; });
      setMetasMap(map);
    })();
    return () => { active = false; };
  }, [mesRef]);

  const bizDays = useMemo(() => {
    const start = new Date(periodRange.from + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(Math.min(new Date(periodRange.to + "T00:00:00").getTime(), today.getTime()));
    const total = new Date(periodRange.to + "T00:00:00");
    return {
      elapsed: Math.max(countBusinessDays(start, end), 1),
      total: Math.max(countBusinessDays(start, total), 1),
    };
  }, [periodRange]);

  const enriched = useMemo(() => {
    return agenteStats.map((a) => {
      const meta = metasMap[a.id] ?? DEFAULT_META;
      const progresso = a.concluidos + a.perdidos;
      const pct = meta > 0 ? Math.min(Math.round((progresso / meta) * 100), 100) : 0;
      const restante = Math.max(meta - progresso, 0);
      const mediaAtual = progresso / bizDays.elapsed;
      const ritmoEsperado = (meta / bizDays.total) * bizDays.elapsed;
      // Ancorados ao check-in (mês da visita real), consistente com Concluídos/Perdidos/Dispensados.
      const confirmados = a.naLojaConfirmado ?? a.leads.filter((l: any) => l.etapa === "confirmado").length;
      const reagendados = a.naLojaReagendado ?? a.leads.filter((l: any) => l.etapa === "reagendado").length;
      const emAnalise = a.naLojaAnalise ?? a.leads.filter((l: any) => l.etapa === "analise_supervisor").length;

      // Bonificação por faixa: 0-50 sem bônus, 51-60 R$5, 61-70 R$6, 71-80 R$7, 81-90 R$8, 91+ R$10
      const rate = comissaoRate(progresso);
      const passouMeta = progresso >= meta;
      const RATE_POT = COMISSAO_RATE_MAX;
      // Potenciais: agendamentos feitos, carros que passaram na loja e leads produtivos.
      const nEmLojaCom = a.passaramNaLoja;
      const nAgendadosCom = a.totalAgendamentos;
      const nProdutivos = Math.max(a.total - (a.desqNovos || 0), 0);
      const ganhoMeta = progresso * rate;
      const ganhoLoja = nEmLojaCom * RATE_POT;
      const ganhoAgendados = nAgendadosCom * RATE_POT;
      const ganhoProdutivos = nProdutivos * RATE_POT;
      const aproveitamentoSafra = nProdutivos > 0 ? Math.round((a.passaramNaLoja / nProdutivos) * 100) : 0;


      let badge: { label: string; icon: any; cls: string };
      if (progresso >= meta) {
        badge = { label: "Meta batida!", icon: Trophy, cls: "bg-success/20 text-success border-success/40" };
      } else if (progresso >= ritmoEsperado) {
        badge = { label: "No ritmo", icon: Flame, cls: "bg-warning/20 text-warning border-warning/40" };
      } else {
        badge = { label: "Acelerar", icon: AlertTriangle, cls: "bg-destructive/20 text-destructive border-destructive/40" };
      }
      return {
        ...a, meta, progresso, pct, restante, mediaAtual, confirmados, reagendados, emAnalise, badge,
        rate, passouMeta, ganhoMeta, ganhoLoja, ganhoAgendados, ganhoProdutivos, nEmLojaCom, nAgendadosCom, nProdutivos, aproveitamentoSafra,
      };
    }).sort((a, b) => b.pct - a.pct);
  }, [agenteStats, metasMap, bizDays]);

  const totals = useMemo(() => {
    const meta = enriched.reduce((s, a) => s + a.meta, 0);
    const prog = enriched.reduce((s, a) => s + a.progresso, 0);
    const naLoja = enriched.reduce((s, a) => s + a.passaramNaLoja, 0);
    const concl = enriched.reduce((s, a) => s + a.concluidos, 0);
    const comissao = enriched.reduce((s, a) => s + a.ganhoMeta, 0);
    const comissaoPot = enriched.reduce((s, a) => s + a.ganhoProdutivos, 0);
    return { meta, prog, naLoja, concl, pct: meta > 0 ? Math.round((prog / meta) * 100) : 0, comissao, comissaoPot };
  }, [enriched]);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Desempenho por Agente
          </h1>
          <p className="text-muted-foreground text-sm">Visão geral gamificada — ordenado por % da meta</p>
        </div>
        {headerActions}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryTile icon={Users} label="Agentes" value={enriched.length} color="text-info" />
        <SummaryTile icon={Target} label="Meta total" value={totals.meta} color="text-primary" />
        <SummaryTile icon={CheckCircle2} label="Progresso" value={`${totals.prog} (${totals.pct}%)`} color="text-success" />
        <SummaryTile icon={Car} label="Na loja" value={totals.naLoja} color="text-warning" />
        <SummaryTile icon={Wallet} label="Comissão total" value={brl(totals.comissao)} color="text-success" />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {enriched.map((a) => {
          const BIcon = a.badge.icon;
          return (
            <div key={a.id} className="rounded-2xl border-2 border-border bg-card p-5 space-y-3 hover:border-primary/40 transition-colors">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-base truncate">{a.nome}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 shrink-0" /> {a.unidadeNome}
                  </p>
                </div>
                <Badge variant="outline" className={`gap-1 shrink-0 ${a.badge.cls}`}>
                  <BIcon className="h-3.5 w-3.5" /> {a.badge.label}
                </Badge>
              </div>

              {/* Meta */}
              <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meta do mês</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-primary leading-none">{a.progresso}</span>
                    <span className="text-sm text-muted-foreground font-bold"> / {a.meta}</span>
                  </div>
                </div>
                <Progress value={a.pct} className="h-2.5" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{a.pct}% atingido</span>
                  <span className={a.restante === 0 ? "text-success font-semibold" : "text-muted-foreground"}>
                    {a.restante === 0 ? "🏆 Meta atingida!" : `Faltam ${a.restante}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50">
                  <span className="text-muted-foreground">Média/dia: <strong className="text-foreground">{a.mediaAtual.toFixed(1)}</strong></span>
                  <span className="text-muted-foreground" title="Agendamentos ÷ leads produtivos">Conv. agend.: <strong className="text-foreground">{a.txConversao}%</strong></span>
                  <span className="text-muted-foreground" title="Carros na loja ÷ leads produtivos">
                    Safra: <strong className="text-info">{a.aproveitamentoSafra}%</strong>
                    <span className="text-muted-foreground"> ({a.passaramNaLoja}/{a.nProdutivos})</span>
                  </span>
                </div>
              </div>

              {/* Status grid */}
              <div className="grid grid-cols-3 gap-2">
                <StatTile icon={Users} label="Leads" value={a.total} color="text-foreground" />
                <StatTile icon={CalendarCheck} label="Agend." value={a.totalAgendamentos} color="text-primary" />
                <StatTile icon={CheckCheck} label="Confirm." value={a.confirmados} color="text-info" />
                <StatTile icon={RotateCcw} label="Reagend." value={a.reagendados} color="text-purple-500" />
                <StatTile icon={Car} label="Na Loja" value={a.passaramNaLoja} color="text-warning" />
                <StatTile icon={CheckCircle2} label="Concl." value={a.concluidos} color="text-success" />
                <StatTile icon={XCircle} label="Disp." value={a.dispensados} color="text-purple-500" />
                <StatTile icon={Skull} label="Perd." value={a.perdidos} color="text-destructive" />
                <StatTile icon={Search} label="Análise" value={a.emAnalise} color="text-warning" />
              </div>

              {/* FUP row */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                <span className="flex items-center gap-1 text-success">
                  <ClipboardCheck className="h-3.5 w-3.5" /> {a.fupConcluidos} FUP feitos
                </span>
                {a.fupPendentes > 0 ? (
                  <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30 gap-1">
                    <RefreshCw className="h-3 w-3" /> {a.fupPendentes} pendentes
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">0 pendentes</span>
                )}
              </div>

              {/* Split por loja — resolve a confusão de agente multi-loja */}
              {a.porUnidade && a.porUnidade.length > 1 && (
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-info" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Divisão por loja
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-md border border-border/60">
                    <table className="w-full text-[11px]">
                      <thead className="bg-muted/40 text-muted-foreground">
                        <tr>
                          <th className="text-left px-2 py-1 font-semibold">Loja</th>
                          <th className="text-center px-1 py-1 font-semibold" title="Agendamentos">Ag.</th>
                          <th className="text-center px-1 py-1 font-semibold" title="Na Loja">NL</th>
                          <th className="text-center px-1 py-1 font-semibold text-success" title="Concluídos">Cn</th>
                          <th className="text-center px-1 py-1 font-semibold text-purple-500" title="Dispensados">Ds</th>
                          <th className="text-center px-1 py-1 font-semibold text-destructive" title="Perdidos">Pd</th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.porUnidade.map((u) => (
                          <tr key={u.id} className="border-t border-border/60">
                            <td className="px-2 py-1 font-medium truncate">{u.nome}</td>
                            <td className="text-center px-1 py-1">{u.agendamentos}</td>
                            <td className="text-center px-1 py-1 font-bold text-warning">{u.naLoja}</td>
                            <td className="text-center px-1 py-1 text-success">{u.concluidos}</td>
                            <td className="text-center px-1 py-1 text-purple-500">{u.dispensados}</td>
                            <td className="text-center px-1 py-1 text-destructive">{u.perdidos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Comissão */}
              <div className="rounded-xl border border-success/30 bg-gradient-to-br from-success/15 to-transparent p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-success" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Comissão</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${a.rate >= 8 ? "bg-success/20 text-success border-success/40" : a.rate > 0 ? "bg-primary/15 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border"}`}>
                      {a.rate > 0 ? `R$ ${a.rate}/carro` : "Sem bonificação"} {a.passouMeta && "🔥"}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-success leading-none">{brl(a.ganhoMeta)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <ComTile icon={CalendarCheck} label="Agendados" value={brl(a.ganhoAgendados)} sub={`${a.nAgendadosCom} × R$ 10`} color="text-purple-500" />
                  <ComTile icon={Car} label="Na loja" value={brl(a.ganhoLoja)} sub={`${a.nEmLojaCom} × R$ 10`} color="text-warning" />
                  <ComTile icon={Rocket} label="Produtivos" value={brl(a.ganhoProdutivos)} sub={`${a.nProdutivos} × R$ 10`} color="text-primary" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

function SummaryTile({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      <div className={`rounded-lg bg-muted/40 p-2 ${color}`}><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-extrabold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2 text-center">
      <div className={`flex items-center justify-center gap-1 ${color}`}>
        <Icon className="h-3 w-3" />
        <span className="text-lg font-extrabold leading-none">{value}</span>
      </div>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function ComTile({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-2">
      <div className={`flex items-center gap-1 ${color}`}>
        <Icon className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className={`text-sm font-extrabold ${color} leading-tight mt-0.5`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{sub}</p>
    </div>
  );
}

export default ManagerByAgentPanel;