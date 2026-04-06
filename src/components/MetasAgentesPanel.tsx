import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLeads } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  ChevronLeft, ChevronRight, Save, BarChart3, Award, Flame,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { toast } from "sonner";

interface Meta {
  id?: string;
  id_agente: string;
  mes_ref: string;
  meta_carros: number;
}

interface Props {
  profiles: { id: string; nome: string; cargo: string }[];
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
  return {
    from: start.toISOString().split("T")[0],
    to: end.toISOString().split("T")[0],
  };
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    from: monday.toISOString().split("T")[0],
    to: sunday.toISOString().split("T")[0],
  };
}

function businessDaysInMonth(mesRef: string) {
  const d = new Date(mesRef + "T00:00:00");
  const year = d.getFullYear();
  const month = d.getMonth();
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
  const year = d.getFullYear();
  const month = d.getMonth();
  const today = new Date();
  const lastDay = today.getMonth() === month && today.getFullYear() === year
    ? today.getDate()
    : new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= lastDay; day++) {
    const dow = new Date(year, month, day).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

export const MetasAgentesPanel = ({ profiles }: Props) => {
  const { leads: _contextLeads } = useLeads();
  const [metaLeads, setMetaLeads] = useState<any[]>([]);
  const agentes = useMemo(() => profiles.filter((p) => p.cargo === "agente"), [profiles]);

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now);
  const mesRef = getMonthRef(currentMonth);

  const [metas, setMetas] = useState<Meta[]>([]);
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const fetchMetas = useCallback(async () => {
    const { data } = await supabase
      .from("metas_agentes")
      .select("*")
      .eq("mes_ref", mesRef);
    if (data) {
      setMetas(data as Meta[]);
      const d: Record<string, number> = {};
      data.forEach((m: any) => { d[m.id_agente] = m.meta_carros; });
      setDrafts(d);
    }
  }, [mesRef]);

  useEffect(() => { fetchMetas(); }, [fetchMetas]);

  // Fetch leads for the selected month — dual-date: data_entrada OR data_agendamento in month
  const fetchMonthLeads = useCallback(async () => {
    const range = getMonthRange(mesRef);
    const [byEntrada, byAgend] = await Promise.all([
      supabase.from("leads").select("*").gte("data_entrada", range.from).lte("data_entrada", range.to),
      supabase.from("leads").select("*").gte("data_agendamento", range.from).lte("data_agendamento", range.to),
    ]);
    const map = new Map<string, any>();
    (byEntrada.data || []).forEach((l: any) => map.set(l.id, l));
    (byAgend.data || []).forEach((l: any) => map.set(l.id, l));
    setMetaLeads(Array.from(map.values()));
  }, [mesRef]);

  useEffect(() => { fetchMonthLeads(); }, [fetchMonthLeads]);

  const monthRange = useMemo(() => getMonthRange(mesRef), [mesRef]);
  const todayStr = new Date().toISOString().split("T")[0];
  const weekRange = useMemo(() => getWeekRange(), [todayStr]);
  const totalBizDays = useMemo(() => businessDaysInMonth(mesRef), [mesRef]);
  const elapsedBizDays = useMemo(() => businessDaysElapsed(mesRef), [mesRef]);
  const isCurrentMonth = now.getMonth() === currentMonth.getMonth() && now.getFullYear() === currentMonth.getFullYear();

  const agentData = useMemo(() => {
    return agentes.map((ag) => {
      const meta = metas.find((m) => m.id_agente === ag.id);
      const metaVal = meta?.meta_carros || 0;

      const monthLeads = metaLeads.filter(
        (l) => l.id_agente === ag.id && l.data_entrada >= monthRange.from && l.data_entrada <= monthRange.to
      );
      const concluidos = monthLeads.filter((l) => l.etapa === "concluido").length;
      const perdidos = monthLeads.filter((l) => l.etapa === "perdido").length;
      const carrosParaMeta = concluidos + perdidos;

      const weekLeads = metaLeads.filter(
        (l) => l.id_agente === ag.id && l.data_entrada >= weekRange.from && l.data_entrada <= weekRange.to
      );
      const concluidosSemana = weekLeads.filter((l) => l.etapa === "concluido" || l.etapa === "perdido").length;

      const pct = metaVal > 0 ? Math.round((carrosParaMeta / metaVal) * 100) : 0;
      const faltam = Math.max(0, metaVal - carrosParaMeta);
      const mediaDiaria = elapsedBizDays > 0 ? carrosParaMeta / elapsedBizDays : 0;
      const diasRestantes = totalBizDays - elapsedBizDays;
      const necessarioPorDia = diasRestantes > 0 ? faltam / diasRestantes : faltam;

      const metaSemanal = metaVal > 0 ? Math.round(metaVal / (totalBizDays / 5)) : 0;
      const pctSemanal = metaSemanal > 0 ? Math.round((concluidosSemana / metaSemanal) * 100) : 0;

      const totalLeadsMes = monthLeads.length;
      const aproveitamento = totalLeadsMes > 0 ? Math.round((carrosParaMeta / totalLeadsMes) * 100) : 0;

      let status: "on_track" | "at_risk" | "behind" | "achieved" = "on_track";
      if (pct >= 100) status = "achieved";
      else if (isCurrentMonth && elapsedBizDays > 0) {
        const expectedPct = (elapsedBizDays / totalBizDays) * 100;
        if (pct < expectedPct * 0.6) status = "behind";
        else if (pct < expectedPct * 0.85) status = "at_risk";
      }

      return {
        ...ag, metaVal, concluidos, perdidos, carrosParaMeta, concluidosSemana, pct, faltam,
        mediaDiaria, necessarioPorDia, metaSemanal, pctSemanal,
        aproveitamento, totalLeadsMes, status, diasRestantes,
      };
    });
  }, [agentes, metas, metaLeads, monthRange, weekRange, elapsedBizDays, totalBizDays, isCurrentMonth]);

  const globalStats = useMemo(() => {
    const totalMeta = agentData.reduce((s, a) => s + a.metaVal, 0);
    const totalConcluidos = agentData.reduce((s, a) => s + a.carrosParaMeta, 0);
    const totalPct = totalMeta > 0 ? Math.round((totalConcluidos / totalMeta) * 100) : 0;
    const achieved = agentData.filter((a) => a.status === "achieved").length;
    const behind = agentData.filter((a) => a.status === "behind").length;
    return { totalMeta, totalConcluidos, totalPct, achieved, behind };
  }, [agentData]);

  const handleSave = async () => {
    setSaving(true);
    for (const ag of agentes) {
      const val = drafts[ag.id] ?? 0;
      const existing = metas.find((m) => m.id_agente === ag.id);
      if (existing) {
        await supabase.from("metas_agentes").update({ meta_carros: val }).eq("id", existing.id);
      } else if (val > 0) {
        await supabase.from("metas_agentes").insert({ id_agente: ag.id, mes_ref: mesRef, meta_carros: val });
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
    return agentData.map((a) => ({
      name: a.nome.split(" ")[0],
      concluidos: a.carrosParaMeta,
      meta: a.metaVal,
      faltam: a.faltam,
    }));
  }, [agentData]);

  const pieData = useMemo(() => {
    const counts = { achieved: 0, on_track: 0, at_risk: 0, behind: 0 };
    agentData.forEach((a) => { if (a.metaVal > 0) counts[a.status]++; });
    return [
      { name: "Atingida", value: counts.achieved, fill: "hsl(142, 71%, 45%)" },
      { name: "No ritmo", value: counts.on_track, fill: "hsl(217, 91%, 60%)" },
      { name: "Atenção", value: counts.at_risk, fill: "hsl(38, 92%, 50%)" },
      { name: "Atrasado", value: counts.behind, fill: "hsl(0, 72%, 51%)" },
    ].filter((d) => d.value > 0);
  }, [agentData]);

  const sel = selectedAgent ? agentData.find((a) => a.id === selectedAgent) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Metas dos Agentes
          </h1>
          <p className="text-muted-foreground text-sm">Defina e acompanhe as metas mensais de carros finalizados</p>
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
          <p className="text-2xl font-bold text-primary">{globalStats.totalConcluidos}</p>
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
          <p className="text-xs text-muted-foreground">Agentes Atrasados</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-3">Meta vs Realizado por Agente</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="concluidos" name="Concluídos" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="meta" name="Meta" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} opacity={0.4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold mb-3">Status Geral</h3>
          {pieData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center pt-20">Defina metas para visualizar</p>
          )}
        </div>
      </div>

      {/* Define Metas Section */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Definir Metas — {MONTH_NAMES[currentMonth.getMonth()]}</h3>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> Salvar Metas
          </Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {agentes.map((ag) => (
            <div key={ag.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{ag.nome}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Carros:</span>
                <Input
                  type="number"
                  min={0}
                  className="w-20 h-8 text-center"
                  value={drafts[ag.id] ?? 0}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [ag.id]: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Performance Cards */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Desempenho Individual</h3>
        {agentData.filter((a) => a.metaVal > 0).map((ag) => {
          const sc = statusConfig[ag.status];
          const StatusIcon = sc.icon;
          const isSelected = selectedAgent === ag.id;

          return (
            <div key={ag.id}>
              <div
                className={`rounded-xl border bg-card p-4 cursor-pointer transition-all ${isSelected ? "border-primary shadow-sm" : "border-border hover:border-primary/30"}`}
                onClick={() => setSelectedAgent(isSelected ? null : ag.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{ag.nome}</span>
                      <Badge variant="outline" className={`text-xs ${sc.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />{sc.label}
                      </Badge>
                      {ag.status === "achieved" && <Flame className="h-4 w-4 text-warning" />}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Progress value={Math.min(ag.pct, 100)} className="flex-1 h-2.5" />
                      <span className="text-sm font-bold min-w-[48px] text-right">{ag.pct}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ag.carrosParaMeta} de {ag.metaVal} carros — Faltam {ag.faltam}
                    </p>
                  </div>
                  <div className="hidden sm:grid grid-cols-3 gap-4 text-center shrink-0">
                    <div>
                      <p className="text-lg font-bold">{ag.mediaDiaria.toFixed(1)}</p>
                      <p className="text-[10px] text-muted-foreground">Média/dia</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{ag.concluidosSemana}</p>
                      <p className="text-[10px] text-muted-foreground">Esta semana</p>
                    </div>
                    <div>
                      <p className={`text-lg font-bold ${ag.necessarioPorDia > ag.mediaDiaria * 1.3 ? "text-destructive" : "text-success"}`}>
                        {ag.necessarioPorDia.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Precisa/dia</p>
                    </div>
                  </div>
                </div>
              </div>

              {isSelected && sel && (
                <div className="mt-2 rounded-xl border border-primary/20 bg-card p-5 animate-slide-in space-y-4">
                  <h4 className="font-semibold">{sel.nome} — Análise Detalhada</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-xl font-bold">{sel.metaVal}</p>
                      <p className="text-[10px] text-muted-foreground">Meta Mensal</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-xl font-bold text-success">{sel.carrosParaMeta}</p>
                      <p className="text-[10px] text-muted-foreground">Concl.+Perd.</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-xl font-bold text-primary">{sel.pct}%</p>
                      <p className="text-[10px] text-muted-foreground">Atingimento</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-xl font-bold">{sel.metaSemanal}</p>
                      <p className="text-[10px] text-muted-foreground">Meta Semanal</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className={`text-xl font-bold ${sel.pctSemanal >= 100 ? "text-success" : sel.pctSemanal >= 70 ? "text-warning" : "text-destructive"}`}>
                        {sel.pctSemanal}%
                      </p>
                      <p className="text-[10px] text-muted-foreground">Ating. Semanal</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-xl font-bold">{sel.aproveitamento}%</p>
                      <p className="text-[10px] text-muted-foreground">Aproveitamento</p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3 text-sm">
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
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-muted-foreground text-xs mb-1">Leads no Mês</p>
                      <p className="font-semibold">{sel.totalLeadsMes} leads recebidos</p>
                      <p className="text-xs text-muted-foreground">{sel.aproveitamento}% convertidos em conclusão</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {agentData.filter((a) => a.metaVal > 0).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma meta definida para este mês. Use o formulário acima para definir as metas dos agentes.
          </p>
        )}
      </div>
    </div>
  );
};
