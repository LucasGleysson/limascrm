import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface MonthNavigatorProps {
  mesRef: string; // "YYYY-MM-01"
  onChange: (mesRef: string) => void;
}

export function getMonthRef(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function getMonthRange(mesRef: string) {
  const d = new Date(mesRef + "T00:00:00");
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: start.toISOString().split("T")[0], to: end.toISOString().split("T")[0] };
}

export function MonthNavigator({ mesRef, onChange }: MonthNavigatorProps) {
  const d = new Date(mesRef + "T00:00:00");
  const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;

  const prev = () => {
    const p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    onChange(getMonthRef(p));
  };
  const next = () => {
    const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    onChange(getMonthRef(n));
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[130px] text-center">{label}</span>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
