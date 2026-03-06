import { startOfWeek, startOfMonth, subDays, format } from "date-fns";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar, CalendarDays, CalendarRange, Infinity } from "lucide-react";

export type PeriodKey = "semana" | "mes" | "30dias" | "total";

interface PeriodFilterProps {
  value: PeriodKey;
  onChange: (v: PeriodKey) => void;
}

const PERIODS: { key: PeriodKey; label: string; icon: React.ElementType }[] = [
  { key: "semana", label: "Semana", icon: Calendar },
  { key: "mes", label: "Mês", icon: CalendarDays },
  { key: "30dias", label: "30 dias", icon: CalendarRange },
  { key: "total", label: "Total", icon: Infinity },
];

export function getDateRangeForPeriod(period: PeriodKey): { from: string | null; to: string } {
  const today = new Date();
  const to = format(today, "yyyy-MM-dd");

  switch (period) {
    case "semana":
      return { from: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"), to };
    case "mes":
      return { from: format(startOfMonth(today), "yyyy-MM-dd"), to };
    case "30dias":
      return { from: format(subDays(today, 30), "yyyy-MM-dd"), to };
    case "total":
      return { from: null, to };
  }
}

export const PeriodFilter = ({ value, onChange }: PeriodFilterProps) => {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => { if (v) onChange(v as PeriodKey); }}
      className="bg-muted rounded-lg p-1"
    >
      {PERIODS.map((p) => (
        <ToggleGroupItem
          key={p.key}
          value={p.key}
          className="text-xs px-3 py-1.5 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md gap-1.5"
        >
          <p.icon className="h-3.5 w-3.5" />
          {p.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};
