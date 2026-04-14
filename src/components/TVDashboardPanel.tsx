import React, { useMemo, useState, useEffect } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { foiNaLoja, getToday } from "@/lib/leadUtils";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Trophy, Calendar, Car, Clock, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const META_DIARIA = 4;

const DONUT_COLORS = {
  concluido: "hsl(var(--success))",
  na_loja: "hsl(var(--warning))",
  dispensado: "hsl(38, 92%, 50%)",
  perdido: "hsl(var(--destructive))",
  outros: "hsl(var(--muted))",
};

const UNIT_ORDER = ["Laranjeiras", "Grandville", "Patrocínio", "Araguari", "Catalão"];

export const TVDashboardPanel: React.FC = () => {
  const { leads, unidades } = useLeads();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((p) => p + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const hoje = getToday();

  const orderedUnidades = useMemo(() => {
    return UNIT_ORDER
      .map((name) => unidades.find((u) => u.nome === name))
      .filter(Boolean) as typeof unidades;
  }, [unidades]);

  const unitStats = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    tick;
    return orderedUnidades.map((u) => {
      const uLeads = leads.filter(
        (l) => l.id_unidade === u.id && (l.data_agendamento === hoje || l.data_entrada === hoje)
      );
      const naLoja = uLeads.filter((l) => foiNaLoja(l.etapa)).length;
      const concluidos = uLeads.filter((l) => l.etapa === "concluido").length;
      const dispensados = uLeads.filter((l) => l.etapa === "dispensado").length;
      const perdidos = uLeads.filter((l) => l.etapa === "perdido").length;
      const emLoja = uLeads.filter((l) => ["confirmado", "na_loja", "reagendado", "analise_supervisor"].includes(l.etapa)).length;
      const agendados = uLeads.filter((l) => l.data_agendamento === hoje).length;
      const faltam = Math.max(0, META_DIARIA - naLoja);
      const metaBatida = naLoja >= META_DIARIA;
      const quaseLa = faltam === 1;

      const totalNaLojaU = naLoja;
      const restante = Math.max(0, META_DIARIA - totalNaLojaU);

      const pieData = [
        { name: "Concluído", value: concluidos, color: DONUT_COLORS.concluido },
        { name: "Em Loja", value: emLoja, color: DONUT_COLORS.na_loja },
        { name: "Dispensado", value: dispensados, color: DONUT_COLORS.dispensado },
        { name: "Perdido", value: perdidos, color: DONUT_COLORS.perdido },
        { name: "Restante", value: restante, color: DONUT_COLORS.outros },
      ].filter((d) => d.value > 0);

      if (pieData.length === 0) {
        pieData.push({ name: "Vazio", value: 1, color: DONUT_COLORS.outros });
      }

      return { unidade: u, naLoja, agendados, faltam, metaBatida, quaseLa, pieData, concluidos, dispensados, perdidos };
    });
  }, [leads, orderedUnidades, hoje, tick]);

  const globalStats = useMemo(() => {
    const totalNaLoja = unitStats.reduce((s, u) => s + u.naLoja, 0);
    const totalMeta = unitStats.length * META_DIARIA;
    const totalAgendados = unitStats.reduce((s, u) => s + u.agendados, 0);
    const totalConcluidos = unitStats.reduce((s, u) => s + u.concluidos, 0);
    const totalFaltam = Math.max(0, totalMeta - totalNaLoja);
    return { totalNaLoja, totalMeta, totalAgendados, totalConcluidos, totalFaltam };
  }, [unitStats]);

  const clockStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  return (
    <div className="space-y-4 xl:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 xl:gap-3">
          <Car className="h-7 w-7 xl:h-10 xl:w-10 text-primary" />
          <div>
            <h1 className="text-2xl xl:text-4xl font-bold tracking-tight">Painel do Dia</h1>
            <p className="text-muted-foreground text-xs xl:text-base">Acompanhamento em tempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-3 xl:gap-4 text-muted-foreground">
          <div className="flex items-center gap-1.5 xl:gap-2">
            <Calendar className="h-4 w-4 xl:h-6 xl:w-6" />
            <span className="text-sm xl:text-xl font-medium">{dateStr}</span>
          </div>
          <div className="flex items-center gap-1.5 xl:gap-2">
            <Clock className="h-4 w-4 xl:h-6 xl:w-6" />
            <span className="text-sm xl:text-xl font-mono font-semibold tabular-nums">{clockStr}</span>
          </div>
        </div>
      </div>

      {/* Global summary */}
      <div className="grid grid-cols-3 gap-3 xl:gap-5">
        <SummaryCard icon={Car} label="Na Loja" value={`${globalStats.totalNaLoja}/${globalStats.totalMeta}`} variant="warning" />
        <SummaryCard icon={Calendar} label="Agendados Hoje" value={globalStats.totalAgendados} variant="info" />
        <SummaryCard icon={Flame} label="Faltam p/ Meta" value={globalStats.totalFaltam} variant={globalStats.totalFaltam === 0 ? "success" : "destructive"} />
      </div>

      {/* Unit cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 xl:gap-5">
        {unitStats.map((us) => (
          <UnitCard key={us.unidade.id} data={us} />
        ))}
      </div>
    </div>
  );
};

/* ─── Summary card ─── */
function SummaryCard({ icon: Icon, label, value, variant }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  variant: "warning" | "info" | "success" | "destructive";
}) {
  const variantClasses: Record<string, string> = {
    warning: "border-warning/40 bg-warning/10 text-warning",
    info: "border-info/40 bg-info/10 text-info",
    success: "border-success/40 bg-success/10 text-success",
    destructive: "border-destructive/40 bg-destructive/10 text-destructive",
  };
  return (
    <Card className={cn("p-3 xl:p-5 flex items-center gap-3 xl:gap-4 border-2", variantClasses[variant])}>
      <Icon className="h-7 w-7 xl:h-10 xl:w-10 shrink-0" />
      <div>
        <p className="text-xs xl:text-base font-medium opacity-80">{label}</p>
        <p className="text-2xl xl:text-4xl font-bold tabular-nums">{value}</p>
      </div>
    </Card>
  );
}

/* ─── Unit card with donut ─── */
function UnitCard({ data }: {
  data: {
    unidade: { id: string; nome: string };
    naLoja: number;
    agendados: number;
    faltam: number;
    metaBatida: boolean;
    quaseLa: boolean;
    pieData: { name: string; value: number; color: string }[];
    concluidos: number;
    dispensados: number;
    perdidos: number;
  };
}) {
  const { unidade, naLoja, agendados, faltam, metaBatida, quaseLa, pieData } = data;
  const pct = Math.min(100, Math.round((naLoja / META_DIARIA) * 100));

  return (
    <Card
      className={cn(
        "relative flex flex-col items-center p-4 xl:p-6 border-2 transition-all duration-500",
        metaBatida
          ? "border-success/60 bg-success/5 shadow-[0_0_20px_hsl(var(--success)/0.2)]"
          : quaseLa
            ? "border-warning/50 bg-warning/5"
            : "border-border"
      )}
    >
      {/* Trophy badge */}
      {metaBatida && (
        <div className="absolute -top-3 -right-3 xl:-top-4 xl:-right-4 bg-success text-success-foreground rounded-full p-1.5 xl:p-2 shadow-lg animate-fade-in">
          <Trophy className="h-5 w-5 xl:h-7 xl:w-7" />
        </div>
      )}

      {/* Unit name */}
      <h2 className="text-base xl:text-xl font-bold tracking-wide mb-2 xl:mb-3 text-center">{unidade.nome}</h2>

      {/* Donut chart */}
      <div className="relative w-28 h-28 xl:w-40 xl:h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              dataKey="value"
              stroke="none"
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Central number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "text-3xl xl:text-5xl font-bold tabular-nums leading-none",
              metaBatida ? "text-success" : quaseLa ? "text-warning animate-pulse" : "text-foreground"
            )}
          >
            {naLoja}
          </span>
          <span className="text-xs xl:text-base text-muted-foreground mt-0.5">/{META_DIARIA}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full mt-2 xl:mt-3">
        <Progress
          value={pct}
          className={cn("h-2 xl:h-3", metaBatida ? "[&>div]:bg-success" : quaseLa ? "[&>div]:bg-warning" : "")}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between w-full mt-3 xl:mt-4 text-sm xl:text-base">
        <div className="flex items-center gap-1 xl:gap-2">
          <Calendar className="h-3.5 w-3.5 xl:h-5 xl:w-5 text-info" />
          <span className="text-muted-foreground text-xs xl:text-sm">Agend:</span>
          <span className="font-bold">{agendados}</span>
        </div>
        <div className="flex items-center gap-1 xl:gap-2">
          {metaBatida ? (
            <span className="font-bold text-success text-sm xl:text-lg">Meta! 🎉</span>
          ) : (
            <>
              <span className="text-muted-foreground text-xs xl:text-sm">Falta:</span>
              <span className={cn("font-bold text-sm xl:text-lg", quaseLa ? "text-warning" : "text-destructive")}>{faltam}</span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

export default TVDashboardPanel;
