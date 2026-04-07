import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { Lead } from "@/data/mockData";

interface AgentDailyChartProps {
  leads: Lead[];
  periodFrom: string; // YYYY-MM-DD
  periodTo: string;   // YYYY-MM-DD
}

export const AgentDailyChart: React.FC<AgentDailyChartProps> = ({ leads, periodFrom, periodTo }) => {
  const dailyChartData = useMemo(() => {
    const now = new Date();
    const fromDate = new Date(periodFrom + "T00:00:00");
    const toDate = new Date(Math.min(new Date(periodTo + "T00:00:00").getTime(), now.getTime()));
    const naLojaStatuses = ["confirmado", "na_loja", "concluido", "dispensado", "perdido", "reagendado"];
    const data: { dia: number; agendamentos: number; naLoja: number }[] = [];

    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const dayNum = d.getDate();
      const agendamentos = leads.filter((l) => l.data_agendamento === dateStr).length;
      const naLoja = leads.filter((l) => l.data_agendamento === dateStr && naLojaStatuses.includes(l.etapa)).length;
      data.push({ dia: dayNum, agendamentos, naLoja });
    }
    return data;
  }, [leads, periodFrom, periodTo]);

  const totalAgendamentos = dailyChartData.reduce((s, d) => s + d.agendamentos, 0);
  const totalNaLoja = dailyChartData.reduce((s, d) => s + d.naLoja, 0);

  if (dailyChartData.length === 0) return null;

  return (
    <div>
      <h4 className="font-medium text-sm mb-2">📊 Agendamentos e Na Loja por Dia</h4>
      <div className="flex gap-4 mb-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: "hsl(var(--primary))" }} />
          <span className="text-muted-foreground">Agendamentos: <strong className="text-foreground">{totalAgendamentos}</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: "hsl(142, 71%, 45%)" }} />
          <span className="text-muted-foreground">Na Loja: <strong className="text-foreground">{totalNaLoja}</strong></span>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="dia" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="agendamentos" name="Agendamentos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="naLoja" name="Na Loja" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
