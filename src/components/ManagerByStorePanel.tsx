import React, { useEffect, useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, Flame, AlertTriangle, Target, Users, CalendarCheck, CheckCircle2,
  Car, XCircle, MapPin, TrendingUp, Skull, LogIn,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_META = 75;

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

interface UnidadeStat {
  id: string;
  nome: string;
  total: number;
  carrosNaLoja: number;
  totalAgendamentos: number;
  concluidos: number;
  dispensados: number;
  perdidos: number;
  desqNovos: number;
  desqAgendados: number;
  emAnalise: number;
  recepcionista?: { nome: string } | null;
  txConversao: number;
  unitAgents: any[];
  naLojaConfirmado: number;
  naLojaEmLoja: number;
  reagendados: number;
  leads: any[];
}

interface Props {
  porUnidade: UnidadeStat[];
  mesRef: string;
  periodRange: { from: string; to: string };
  headerActions: React.ReactNode;
}

export const ManagerByStorePanel: React.FC<Props> = ({ porUnidade, mesRef, periodRange, headerActions }) => {
  const [metasMap, setMetasMap] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("metas_unidades")
        .select("id_unidade, meta_carros")
        .eq("mes_ref", mesRef);
      if (!active) return;
      const map: Record<string, number> = {};
      (data || []).forEach((r: any) => { map[r.id_unidade] = r.meta_carros || 0; });
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
    return porUnidade.map((u) => {
      const meta = metasMap[u.id] ?? DEFAULT_META;
      const progresso = u.concluidos + u.perdidos;
      const pct = meta > 0 ? Math.min(Math.round((progresso / meta) * 100), 100) : 0;
      const restante = Math.max(meta - progresso, 0);
      const mediaAtual = progresso / bizDays.elapsed;
      const ritmoEsperado = (meta / bizDays.total) * bizDays.elapsed;

      let badge: { label: string; icon: any; cls: string };
      if (progresso >= meta) {
        badge = { label: "Meta batida!", icon: Trophy, cls: "bg-success/20 text-success border-success/40" };
      } else if (progresso >= ritmoEsperado) {
        badge = { label: "No ritmo", icon: Flame, cls: "bg-warning/20 text-warning border-warning/40" };
      } else {
        badge = { label: "Acelerar", icon: AlertTriangle, cls: "bg-destructive/20 text-destructive border-destructive/40" };
      }
      return { ...u, meta, progresso, pct, restante, mediaAtual, badge };
    }).sort((a, b) => b.pct - a.pct);
  }, [porUnidade, metasMap, bizDays]);

  const totals = useMemo(() => {
    const meta = enriched.reduce((s, u) => s + u.meta, 0);
    const prog = enriched.reduce((s, u) => s + u.progresso, 0);
    const naLoja = enriched.reduce((s, u) => s + u.carrosNaLoja, 0);
    return { meta, prog, naLoja, pct: meta > 0 ? Math.round((prog / meta) * 100) : 0 };
  }, [enriched]);

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" /> Desempenho por Loja
          </h1>
          <p className="text-muted-foreground text-sm">Visão geral gamificada — ordenado por % da meta</p>
        </div>
        {headerActions}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryTile icon={MapPin} label="Lojas" value={enriched.length} color="text-info" />
        <SummaryTile icon={Target} label="Meta total" value={totals.meta} color="text-primary" />
        <SummaryTile icon={CheckCircle2} label="Progresso" value={`${totals.prog} (${totals.pct}%)`} color="text-success" />
        <SummaryTile icon={Car} label="Na loja" value={totals.naLoja} color="text-warning" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {enriched.map((u) => {
          const BIcon = u.badge.icon;
          return (
            <div key={u.id} className="rounded-2xl border-2 border-border bg-card p-5 space-y-3 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-base truncate flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-primary" /> {u.nome}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Users className="h-3 w-3" /> {u.unitAgents.length} agente{u.unitAgents.length === 1 ? "" : "s"}
                    </Badge>
                    {u.recepcionista && (
                      <Badge variant="outline" className="text-[10px] gap-1 bg-warning/10 text-warning border-warning/20">
                        <LogIn className="h-3 w-3" /> {u.recepcionista.nome}
                      </Badge>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={`gap-1 shrink-0 ${u.badge.cls}`}>
                  <BIcon className="h-3.5 w-3.5" /> {u.badge.label}
                </Badge>
              </div>

              <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meta do mês</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-primary leading-none">{u.progresso}</span>
                    <span className="text-sm text-muted-foreground font-bold"> / {u.meta}</span>
                  </div>
                </div>
                <Progress value={u.pct} className="h-2.5" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{u.pct}% atingido</span>
                  <span className={u.restante === 0 ? "text-success font-semibold" : "text-muted-foreground"}>
                    {u.restante === 0 ? "🏆 Meta atingida!" : `Faltam ${u.restante}`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50">
                  <span className="text-muted-foreground">Média/dia: <strong className="text-foreground">{u.mediaAtual.toFixed(1)}</strong></span>
                  <span className="text-muted-foreground">Conv: <strong className="text-foreground">{u.txConversao}%</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <StatTile icon={Users} label="Leads" value={u.total} color="text-foreground" />
                <StatTile icon={CalendarCheck} label="Agend." value={u.totalAgendamentos} color="text-primary" />
                <StatTile icon={Car} label="Na Loja" value={u.carrosNaLoja} color="text-warning" />
                <StatTile icon={CheckCircle2} label="Concl." value={u.concluidos} color="text-success" />
                <StatTile icon={XCircle} label="Disp." value={u.dispensados} color="text-purple-500" />
                <StatTile icon={Skull} label="Perd." value={u.perdidos} color="text-destructive" />
                <StatTile icon={AlertTriangle} label="Análise" value={u.emAnalise} color="text-info" />
                <StatTile icon={TrendingUp} label="Desq." value={u.desqNovos + u.desqAgendados} color="text-muted-foreground" />
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

export default ManagerByStorePanel;