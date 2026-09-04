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
  atendidos: "hsl(var(--primary))",
  dispensado: "hsl(38, 92%, 50%)",
  perdido: "hsl(var(--destructive))",
  outros: "hsl(var(--muted))",
};

export const TVDashboardPanel: React.FC = () => {
  const { leads, unidadesAtivas, refreshAll } = useLeads();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((p) => p + 1);
      refreshAll();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const hoje = getToday();

  const orderedUnidades = useMemo(() => {
  const allowed = new Set(["Laranjeiras", "Grandville", "Araguari", "Pacaembu", "Serrana"]);
    return unidadesAtivas.filter((u) => allowed.has(u.nome));
  }, [unidadesAtivas]);

  const unitStats = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    tick;
    const checkinHoje = (l: typeof leads[number]) =>
      !!l.checkin && l.checkin.startsWith(hoje);

    // Mesma regra do Relatório Diário: qualquer carro com check-in do dia conta.
    // O check-in é a presença física real; se foi feito por engano,
    // use "Desfazer check-in" no lead para tirar do painel.
    const contaNoPainel = (l: typeof leads[number]) => checkinHoje(l);

    return orderedUnidades.map((u) => {
      const uLeads = leads.filter((l) => l.id_unidade === u.id);

      // Carros que foram hoje: contagem ancorada somente no check-in do dia.
      const passouHoje = uLeads.filter(contaNoPainel);

      // Leads ainda esperados hoje (agendados/reagendados/confirmados para hoje, sem checkin ainda).
      const esperadosHoje = uLeads.filter(
        (l) =>
          !checkinHoje(l) &&
          l.data_agendamento === hoje &&
          ["agendado", "reagendado", "confirmado"].includes(l.etapa)
      );

      // Carros Hoje: quem fez check-in hoje, mesmo que depois tenha sido concluído, dispensado, perdido ou reagendado.
      const naLoja = passouHoje.length;

      // Agendados HOJE: quem estava agendado e ainda não chegou + quem já chegou hoje.
      const agendados = esperadosHoje.length + passouHoje.length;

      // Em loja AGORA: checkin hoje, sem checkout, em etapa ativa de atendimento.
      const emLoja = passouHoje.filter(
        (l) => !l.checkout && ["na_loja", "analise_supervisor"].includes(l.etapa)
      ).length;

      // Resultados do dia: ancorados pelo checkin de hoje.
      const concluidos = passouHoje.filter((l) => l.etapa === "concluido").length;
      const dispensados = passouHoje.filter((l) => l.etapa === "dispensado").length;
      const perdidos = passouHoje.filter((l) => l.etapa === "perdido").length;
      const outrosAtendidos = Math.max(0, naLoja - concluidos - emLoja - dispensados - perdidos);

      const faltam = Math.max(0, META_DIARIA - naLoja);
      const metaBatida = naLoja >= META_DIARIA;
      const quaseLa = faltam === 1;

      const totalNaLojaU = naLoja;
      const restante = Math.max(0, META_DIARIA - totalNaLojaU);

      const pieData = [
        { name: "Concluído", value: concluidos, color: DONUT_COLORS.concluido },
        { name: "Em Loja", value: emLoja, color: DONUT_COLORS.na_loja },
        { name: "Atendidos", value: outrosAtendidos, color: DONUT_COLORS.atendidos },
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
    <div className="space-y-4 xl:space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 xl:gap-3 min-w-0">
          <Car className="h-7 w-7 xl:h-10 xl:w-10 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl xl:text-4xl font-bold tracking-tight truncate">Painel do Dia</h1>
            <p className="text-muted-foreground text-xs xl:text-base truncate">Acompanhamento em tempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-3 xl:gap-4 text-muted-foreground ml-auto">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 xl:gap-5">
        <SummaryCard icon={Car} label="Carros Hoje" value={`${globalStats.totalNaLoja}/${globalStats.totalMeta}`} variant="warning" />
        <SummaryCard icon={Calendar} label="Agendados Hoje" value={globalStats.totalAgendados} variant="info" />
        <SummaryCard icon={Flame} label="Faltam p/ Meta" value={globalStats.totalFaltam} variant={globalStats.totalFaltam === 0 ? "success" : "destructive"} />
      </div>

      {/* Unit cards grid — always a single responsive line */}
      <div className="flex flex-nowrap gap-3 xl:gap-5 w-full overflow-hidden">
        {unitStats.map((us) => (
          <div key={us.unidade.id} className="flex-1 min-w-0">
            <UnitCard data={us} />
          </div>
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
    warning: "border-warning bg-warning/20 text-warning",
    info: "border-info bg-info/20 text-info",
    success: "border-success bg-success/20 text-success",
    destructive: "border-destructive bg-destructive/20 text-destructive",
  };
  return (
    <Card className={cn("p-3 xl:p-5 flex items-center gap-3 xl:gap-4 border-2 shadow-lg", variantClasses[variant])}>
      <Icon className="h-7 w-7 xl:h-10 xl:w-10 shrink-0 drop-shadow-md" />
      <div>
        <p className="text-xs xl:text-base font-semibold opacity-90">{label}</p>
        <p className="text-3xl xl:text-5xl font-extrabold tabular-nums drop-shadow-sm">{value}</p>
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
      <h2 className="text-xl xl:text-3xl font-bold tracking-wide mb-2 xl:mb-3 text-center">{unidade.nome}</h2>

      {/* Donut chart */}
      <div className="relative w-full max-w-28 xl:max-w-40 aspect-square mx-auto">
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
              isAnimationActive={false}
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
