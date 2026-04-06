import { useMemo, useState } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { PeriodFilter, PeriodKey, getDateRangeForPeriod } from "@/components/PeriodFilter";
import { MonthNavigator, getMonthRef, getMonthRange } from "@/components/MonthNavigator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, LogIn, LogOut, XCircle, Car, CheckCircle2 } from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import type { Lead } from "@/data/mockData";

export const ReceptionistReportPanel = () => {
  const { leads, unidades, profiles } = useLeads();
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [mesRef, setMesRef] = useState(() => getMonthRef());
  const [unidadeFilter, setUnidadeFilter] = useState("todas");
  const [selectedRecep, setSelectedRecep] = useState<string | null>(null);

  const periodRange = period === "mes" ? getMonthRange(mesRef) : getDateRangeForPeriod(period);

  const recepcionistas = useMemo(
    () => profiles.filter((p) => p.cargo === "recepcionista"),
    [profiles]
  );

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (!l.created_at) return false;
      const d = l.created_at.split("T")[0];
      if (d < periodRange.from || d > periodRange.to) return false;
      if (unidadeFilter !== "todas" && l.id_unidade !== unidadeFilter) return false;
      return true;
    });
  }, [leads, periodRange, unidadeFilter]);

  // Leads that have id_recepcionista set
  const recepStats = useMemo(() => {
    return recepcionistas.map((r) => {
      const rLeads = filteredLeads.filter((l) => (l as any).id_recepcionista === r.id);
      const checkins = rLeads.filter((l) => l.checkin).length;
      const concluidos = rLeads.filter((l) => l.etapa === "concluido").length;
      const dispensados = rLeads.filter((l) => l.etapa === "dispensado").length;
      const naLoja = rLeads.filter((l) => ["confirmado", "na_loja", "concluido", "dispensado", "perdido"].includes(l.etapa)).length;
      const unidadeNome = r.unidade_padrao
        ? unidades.find((u) => u.id === r.unidade_padrao)?.nome || "—"
        : "—";

      return {
        id: r.id,
        nome: r.nome,
        unidadeNome,
        total: rLeads.length,
        checkins,
        concluidos,
        dispensados,
        naLoja,
        leads: rLeads,
      };
    }).filter((r) => unidadeFilter === "todas" || r.unidadeNome !== "—" || r.total > 0);
  }, [recepcionistas, filteredLeads, unidades, unidadeFilter]);

  const globalStats = useMemo(() => {
    const allRecepLeads = filteredLeads.filter((l) => (l as any).id_recepcionista);
    return {
      total: allRecepLeads.length,
      checkins: allRecepLeads.filter((l) => l.checkin).length,
      concluidos: allRecepLeads.filter((l) => l.etapa === "concluido").length,
      dispensados: allRecepLeads.filter((l) => l.etapa === "dispensado").length,
    };
  }, [filteredLeads]);

  const selected = selectedRecep ? recepStats.find((r) => r.id === selectedRecep) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Recepção</h1>
          <p className="text-muted-foreground text-sm">Desempenho das recepcionistas por unidade</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={unidadeFilter} onValueChange={setUnidadeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Unidades</SelectItem>
              {unidades.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
      </div>

      {period === "mes" && (
        <MonthNavigator mesRef={mesRef} onChange={setMesRef} />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Atendimentos" value={globalStats.total} icon={Car} variant="info" />
        <StatsCard title="Check-ins" value={globalStats.checkins} icon={LogIn} variant="info" />
        <StatsCard title="Concluídos" value={globalStats.concluidos} icon={CheckCircle2} variant="success" />
        <StatsCard title="Dispensados" value={globalStats.dispensados} icon={XCircle} variant="destructive" />
      </div>

      <div className="space-y-2">
        {recepStats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma recepcionista encontrada.</p>
        ) : (
          recepStats.map((r) => (
            <div
              key={r.id}
              className={`flex items-center gap-4 p-4 rounded-xl bg-card border transition-all cursor-pointer ${
                selectedRecep === r.id ? "border-primary shadow-sm" : "border-border hover:border-primary/30"
              }`}
              onClick={() => setSelectedRecep(selectedRecep === r.id ? null : r.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{r.nome}</span>
                  <span className="text-xs text-muted-foreground">({r.unidadeNome})</span>
                </div>
                <div className="flex gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  <span>{r.total} atendimentos</span>
                  <span className="text-info">{r.checkins} check-ins</span>
                  <span className="text-success">{r.concluidos} concl.</span>
                  <span className="text-destructive">{r.dispensados} disp.</span>
                </div>
              </div>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedRecep === r.id ? "rotate-90" : ""}`} />
            </div>
          ))
        )}
      </div>

      {selected && (
        <div className="rounded-xl border border-primary/20 bg-card p-5 animate-slide-in space-y-4">
          <h3 className="font-semibold text-lg">{selected.nome} — {selected.unidadeNome}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold">{selected.total}</p>
              <p className="text-xs text-muted-foreground">Atendimentos</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-info">{selected.checkins}</p>
              <p className="text-xs text-muted-foreground">Check-ins</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-success">{selected.concluidos}</p>
              <p className="text-xs text-muted-foreground">Concluídos</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-destructive">{selected.dispensados}</p>
              <p className="text-xs text-muted-foreground">Dispensados</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-warning">{selected.naLoja}</p>
              <p className="text-xs text-muted-foreground">Na Loja</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold">
                {selected.naLoja > 0 ? Math.round((selected.concluidos / selected.naLoja) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Tx Conclusão</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
