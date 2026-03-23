import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLeads } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  ChevronLeft, ChevronRight, Save, BarChart3, Award, MapPin,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { toast } from "sonner";
import { isCarroDoAgente, isCarroParaMeta } from "@/lib/leadUtils";

interface Meta {
  id?: string;
  id_unidade: string;
  mes_ref: string;
  meta_carros: number;
}

interface Props {
  profiles: { id: string; nome: string; cargo: string; unidade_padrao?: string | null }[];
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function getMonthRef(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function getMonthRange(mesRef: string) {
  const d = new Date(mesRef + "T00:00:00");
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: start.toISOString().split("T")[0], to: end.toISOString().split("T")[0] };
}

function businessDaysInMonth(mesRef: string) {
  const d = new Date(mesRef + "T00:00:00");
  const year = d.getFullYear(); const month = d.getMonth();
  let count = 0;
  const last = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= last; day++) {
    const dow = new Date(year, month, day).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

function businessDaysElapsed(mesRef: string) {
  const d = new Date(mesRef + "T00:00:00");
  const year = d.getFullYear(); const month = d.getMonth();
  const today = new Date();
  const lastDay = today.getMonth() === month && today.getFullYear() === year
    ? today.getDate() : new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= lastDay; day++) {
    const dow = new Date(year, month, day).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export const MetasUnidadesPanel = ({ profiles }: Props) => {
  const { leads, unidades } = useLeads();
  const agentes = useMemo(() => profiles.filter((p) => p.cargo === "agente"), [profiles]);

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now);
  const mesRef = getMonthRef(currentMonth);

  const [metas, setMetas] = useState<Meta[]>([]);
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  const fetchMetas = useCallback(async () => {
    const { data } = await supabase
      .from("metas_unidades")
      .select("*")
      .eq("mes_ref", mesRef);
    if (data) {
      setMetas(data as Meta[]);
      const d: Record<string, number> = {};
      data.forEach((m: any) => { d[m.id_unidade] = m.meta_carros; });
      setDrafts(d);
    }
  }, [mesRef]);

  useEffect(() => { fetchMetas(); }, [fetchMetas]);

  const monthRange = useMemo(() => getMonthRange(mesRef), [mesRef]);
  const totalBizDays = useMemo(() => businessDaysInMonth(mesRef), [mesRef]);
  const elapsedBizDays = useMemo(() => businessDaysElapsed(mesRef), [mesRef]);
  const isCurrentMonth = now.getMonth() === currentMonth.getMonth() && now.getFullYear() === currentMonth.getFullYear();

  const unitData = useMemo(() => {
    return unidades.map((u) => {
      const meta = metas.find((m) => m.id_unidade === u.id);
      const metaVal = meta?.meta_carros || 0;

      const monthLeads = leads.filter(
        (l) => l.id_unidade === u.id && l.data_entrada >= monthRange.from && l.data_entrada <= monthRange.to
      );
      const carrosNaLoja = monthLeads.filter((l) => isCarroDoAgente(l.etapa)).length;
      const carrosParaMeta = monthLeads.filter((l) => isCarroParaMeta(l.etapa)).length;
      const concluidos = monthLeads.filter((l) => l.etapa === "concluido").length;
      const perdidos = monthLeads.filter((l) => l.etapa === "perdido").length;

      const pct = metaVal > 0 ? Math.round((carrosParaMeta / metaVal) * 100) : 0;
      const faltam = Math.max(0, metaVal - carrosParaMeta);
      const mediaDiaria = elapsedBizDays > 0 ? carrosParaMeta / elapsedBizDays : 0;
      const diasRestantes = totalBizDays - elapsedBizDays;
      const necessarioPorDia = diasRestantes > 0 ? faltam / diasRestantes : faltam;

      // Agent breakdown for this unit
      const unitAgents = agentes.filter((a) => a.unidade_padrao === u.id);
      const agentBreakdown = unitAgents.map((ag) => {
        const agLeads = monthLeads.filter((l) => l.id_agente === ag.id);
        return {
          nome: ag.nome,
          total: agLeads.length,
          carrosNaLoja: agLeads.filter((l) => isCarroDoAgente(l.etapa)).length,
          carrosParaMeta: agLeads.filter((l) => isCarroParaMeta(l.etapa)).length,
          concluidos: agLeads.filter((l) => l.etapa === "concluido").length,
          perdidos: agLeads.filter((l) => l.etapa === "perdido").length,
        };
      });

      let status: "on_track" | "at_risk" | "behind" | "achieved" = "on_track";
      if (pct >= 100) status = "achieved";
      else if (isCurrentMonth && elapsedBizDays > 0) {
        const expectedPct = (elapsedBizDays / totalBizDays) * 100;
        if (pct < expectedPct * 0.6) status = "behind";
        else if (pct < expectedPct * 0.85) status = "at_risk";
      }

      return {
        ...u, metaVal, carrosNaLoja, carrosParaMeta, concluidos, perdidos, pct, faltam,
        mediaDiaria, necessarioPorDia, status, diasRestantes,
        totalLeads: monthLeads.length, agentBreakdown,
      };
    });
  }, [unidades, metas, leads, monthRange, elapsedBizDays, totalBizDays, isCurrentMonth, agentes]);

  const globalStats = useMemo(() => {
    const totalMeta = unitData.reduce((s, u) => s + u.metaVal, 0);
    const totalCarros = unitData.reduce((s, u) => s + u.carrosParaMeta, 0);
    const totalPct = totalMeta > 0 ? Math.round((totalCarros / totalMeta) * 100) : 0;
    const achieved = unitData.filter((u) => u.status === "achieved").length;
    const behind = unitData.filter((u) => u.status === "behind").length;
    return { totalMeta, totalCarros, totalPct, achieved, behind };
  }, [unitData]);

  const handleSave = async () => {
    setSaving(true);
    for (const u of unidades) {
      const val = drafts[u.id] ?? 0;
      const existing = metas.find((m) => m.id_unidade === u.id);
      if (existing) {
        await supabase.from("metas_unidades").update({ meta_carros: val }).eq("id", existing.id);
      } else if (val > 0) {
        await supabase.from("metas_unidades").insert({ id_unidade: u.id, mes_ref: mesRef, meta_carros: val });
      }
    }
    await fetchMetas();
    setSaving(false);
    toast.success("Metas salvas com sucesso!");
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const statusConfig = {
    achieved: { label: "Atingida", color: "bg-success/10 text-success border-success/30", icon: CheckCircle },
    on_track: { label: "No ritmo", color: "bg-primary/10 text-primary border-primary/30", icon: TrendingUp },
    at_risk: { label: "Atenção", color: "bg-warning/10 text-warning border-warning/30", icon: AlertTriangle },
    behind: { label: "Atrasado", color: "bg-destructive/10 text-destructive border-destructive/30", icon: TrendingDown },
  };

  const barData = useMemo(() => {
    return unitData.map((u) => ({
      name: u.nome,
      carros: u.carrosParaMeta,
      meta: u.metaVal,
    }));
  }, [unitData]);

  const sel = selectedUnit ? unitData.find((u) => u.id === selectedUnit) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Metas por Loja
          </h1>
          <p className="text-muted-foreground text-sm">Defina e acompanhe as metas mensais de carros por unidade</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-semibold text-sm min-w-[140px] text-center">
            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Target className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-bold">{globalStats.totalMeta}</p>
          <p className="text-xs text-muted-foreground">Meta Total</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <BarChart3 className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-primary">{globalStats.totalCarros}</p>
          <p className="text-xs text-muted-foreground">Meta (Concl.+Perd.)</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <TrendingUp className="h-5 w-5 mx-auto text-success mb-1" />
          <p className="text-2xl font-bold text-success">{globalStats.totalPct}%</p>
          <p className="text-xs text-muted-foreground">Atingimento</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Award className="h-5 w-5 mx-auto text-warning mb-1" />
          <p className="text-2xl font-bold">{globalStats.achieved}</p>
          <p className="text-xs text-muted-foreground">Metas Batidas</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <AlertTriangle className="h-5 w-5 mx-auto text-destructive mb-1" />
          <p className="text-2xl font-bold text-destructive">{globalStats.behind}</p>
          <p className="text-xs text-muted-foreground">Lojas Atrasadas</p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-3">Meta vs Realizado (Concluídos + Perdidos)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="carros" name="Concluídos + Perdidos" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="meta" name="Meta" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} opacity={0.4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Define Metas */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Definir Metas — {MONTH_NAMES[currentMonth.getMonth()]}</h3>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> Salvar Metas
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {unidades.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{u.nome}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Carros:</span>
                <Input
                  type="number" min={0} className="w-20 h-8 text-center"
                  value={drafts[u.id] ?? 0}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [u.id]: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unit Performance Cards */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Progresso por Loja</h3>
        {unitData.filter((u) => u.metaVal > 0).map((u) => {
          const sc = statusConfig[u.status];
          const StatusIcon = sc.icon;
          const isSelected = selectedUnit === u.id;

          return (
            <div key={u.id}>
              <div
                className={`rounded-xl border bg-card p-4 cursor-pointer transition-all ${isSelected ? "border-primary shadow-sm" : "border-border hover:border-primary/30"}`}
                onClick={() => setSelectedUnit(isSelected ? null : u.id)}
              >
                <div className="flex items-center gap-4">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{u.nome}</span>
                      <Badge variant="outline" className={`text-xs ${sc.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />{sc.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Progress value={Math.min(u.pct, 100)} className="flex-1 h-2.5" />
                      <span className="text-sm font-bold min-w-[48px] text-right">{u.pct}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {u.carrosParaMeta} de {u.metaVal} carros — Faltam {u.faltam}
                    </p>
                  </div>
                  <div className="hidden sm:grid grid-cols-3 gap-4 text-center shrink-0">
                    <div>
                      <p className="text-lg font-bold">{u.mediaDiaria.toFixed(1)}</p>
                      <p className="text-[10px] text-muted-foreground">Média/dia</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{u.concluidos}</p>
                      <p className="text-[10px] text-muted-foreground">Concluídos</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${u.necessarioPorDia > u.mediaDiaria * 1.3 ? "text-destructive" : "text-success"}`}>
                        {u.necessarioPorDia.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Precisa/dia</p>
                    </div>
                  </div>
                </div>
              </div>

              {isSelected && sel && (
                <div className="mt-2 rounded-xl border border-primary/20 bg-card p-5 animate-slide-in space-y-4">
                  <h4 className="font-semibold">{sel.nome} — Detalhamento</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-xl font-bold">{sel.totalLeads}</p>
                      <p className="text-[10px] text-muted-foreground">Leads no Mês</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                       <p className="text-xl font-bold text-warning">{sel.carrosParaMeta}</p>
                      <p className="text-[10px] text-muted-foreground">Concl.+Perd.</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-xl font-bold text-success">{sel.concluidos}</p>
                      <p className="text-[10px] text-muted-foreground">Concluídos</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-xl font-bold text-primary">{sel.pct}%</p>
                      <p className="text-[10px] text-muted-foreground">Atingimento</p>
                    </div>
                  </div>
                  {sel.agentBreakdown.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium text-muted-foreground mb-2">Contribuição dos Agentes</h5>
                      <div className="space-y-1">
                        {sel.agentBreakdown.map((ag) => (
                          <div key={ag.nome} className="flex items-center gap-3 text-sm p-2 rounded bg-muted/30">
                            <span className="font-medium flex-1">{ag.nome}</span>
                            <span>{ag.total} leads</span>
                            <span className="text-success">{ag.concluidos} concl.</span>
                            <span className="text-destructive">{ag.perdidos} perd.</span>
                            <span className="text-primary font-semibold">{ag.carrosParaMeta} meta</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-muted-foreground text-xs mb-1">Ritmo Atual</p>
                      <p className="font-semibold">{sel.mediaDiaria.toFixed(1)} carros/dia útil</p>
                      <p className="text-xs text-muted-foreground">{elapsedBizDays} de {totalBizDays} dias úteis</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-muted-foreground text-xs mb-1">Para Bater a Meta</p>
                      <p className={`font-semibold ${sel.necessarioPorDia > sel.mediaDiaria * 1.3 ? "text-destructive" : "text-success"}`}>
                        {sel.necessarioPorDia.toFixed(1)} carros/dia útil
                      </p>
                      <p className="text-xs text-muted-foreground">{sel.diasRestantes} dias úteis restantes</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {unitData.filter((u) => u.metaVal > 0).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma meta definida para este mês. Use o formulário acima para definir as metas.
          </p>
        )}
      </div>
    </div>
  );
};
