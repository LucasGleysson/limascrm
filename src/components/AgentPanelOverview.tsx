import { useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Trophy, Flame, AlertTriangle, Target, Users, CalendarCheck,
  CheckCircle2, Car, Calendar as CalIcon, XCircle, RefreshCw,
  ClipboardCheck, Search, MapPin, DollarSign, Wallet, Rocket, Coins, Clock,
} from "lucide-react";
import {
  startOfWeek, endOfWeek, addDays, format, isToday, startOfMonth, endOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { getLeadMetaDate } from "@/lib/leadUtils";

const META_AGENTE = 75;

const STATUS_CARDS: {
  key: string;
  label: string;
  icon: typeof Users;
  match: (etapa: string) => boolean;
  color: string; // tailwind text/border color
  bg: string;
}[] = [
  { key: "novo", label: "Novo Lead", icon: Users, match: (e) => e === "novo", color: "text-info", bg: "bg-info/10 border-info/30" },
  { key: "agendado", label: "Agendados", icon: CalendarCheck, match: (e) => e === "agendado", color: "text-purple", bg: "bg-purple/10 border-purple/30" },
  { key: "confirmado", label: "Confirmados", icon: ClipboardCheck, match: (e) => e === "confirmado", color: "text-info", bg: "bg-info/10 border-info/30" },
  { key: "na_loja", label: "Na Loja", icon: Car, match: (e) => e === "na_loja", color: "text-warning", bg: "bg-warning/10 border-warning/30" },
  { key: "reagendado", label: "Reagendados", icon: RefreshCw, match: (e) => e === "reagendado", color: "text-purple", bg: "bg-purple/10 border-purple/30" },
  { key: "dispensado", label: "Dispensados", icon: XCircle, match: (e) => e === "dispensado", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
  { key: "analise_supervisor", label: "Em Análise", icon: Search, match: (e) => e === "analise_supervisor", color: "text-warning", bg: "bg-warning/10 border-warning/30" },
  { key: "concluido", label: "Concluídos", icon: CheckCircle2, match: (e) => e === "concluido", color: "text-success", bg: "bg-success/10 border-success/30" },
  { key: "perdido", label: "Perdidos", icon: XCircle, match: (e) => e === "perdido", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
];

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

export const AgentPanelOverview = () => {
  const { leads, unidades, agentUnidades } = useLeads();
  const { currentUser } = useRole();

  const now = new Date();
  const monthFrom = format(startOfMonth(now), "yyyy-MM-dd");
  const monthTo = format(endOfMonth(now), "yyyy-MM-dd");

  // Leads cujo dono (id_agente) é o agente, ancorados no mês corrente via getLeadMetaDate
  const myMonthLeads = useMemo(() => {
    return leads.filter((l) => {
      if (l.id_agente !== currentUser.id) return false;
      // Âncora: checkin → data_agendamento → data_entrada (para que leads
      // "novo" recém-criados também apareçam nos cards do mês corrente).
      const ref = getLeadMetaDate(l) ?? (l.data_entrada ? l.data_entrada.slice(0, 10) : null);
      if (!ref) return false;
      return ref >= monthFrom && ref <= monthTo;
    });
  }, [leads, currentUser.id, monthFrom, monthTo]);

  // META: Concluídos + Perdidos
  const concluidos = myMonthLeads.filter((l) => l.etapa === "concluido").length;
  const perdidos = myMonthLeads.filter((l) => l.etapa === "perdido").length;
  const progresso = concluidos + perdidos;
  const pct = Math.min(Math.round((progresso / META_AGENTE) * 100), 100);
  const restante = Math.max(META_AGENTE - progresso, 0);

  // Ritmo (dias úteis)
  const bizElapsed = countBusinessDays(startOfMonth(now), now);
  const bizTotal = countBusinessDays(startOfMonth(now), endOfMonth(now));
  const bizLeft = Math.max(bizTotal - bizElapsed, 0);
  const mediaAtual = bizElapsed > 0 ? progresso / bizElapsed : 0;
  const mediaNecessaria = bizLeft > 0 ? restante / bizLeft : 0;
  const ritmoEsperado = (META_AGENTE / bizTotal) * bizElapsed;

  let ritmoBadge: { label: string; icon: typeof Trophy; cls: string };
  if (progresso >= META_AGENTE) {
    ritmoBadge = { label: "Meta batida!", icon: Trophy, cls: "bg-success/20 text-success border-success/40" };
  } else if (progresso >= ritmoEsperado) {
    ritmoBadge = { label: "No ritmo", icon: Flame, cls: "bg-warning/20 text-warning border-warning/40" };
  } else {
    ritmoBadge = { label: "Acelerar", icon: AlertTriangle, cls: "bg-destructive/20 text-destructive border-destructive/40" };
  }

  // Semana atual (Seg → Dom)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Todos os leads visíveis para o agente (inclui da unidade) — usado para o calendário semanal
  const myUnitIds = useMemo(() => {
    const ids = new Set<string>(
      agentUnidades.filter((au) => au.id_agente === currentUser.id).map((au) => au.id_unidade)
    );
    if (currentUser.unidade_padrao) ids.add(currentUser.unidade_padrao);
    return ids;
  }, [agentUnidades, currentUser.id, currentUser.unidade_padrao]);

  const allMyLeads = useMemo(
    () => leads.filter((l) => l.id_agente === currentUser.id || (l.id_unidade && myUnitIds.has(l.id_unidade))),
    [leads, currentUser.id, myUnitIds]
  );

  const weekCounts = useMemo(() => {
    return weekDays.map((d) => {
      const ds = format(d, "yyyy-MM-dd");
      const items = allMyLeads.filter(
        (l) =>
          ["agendado", "reagendado", "confirmado"].includes(l.etapa) &&
          l.data_agendamento === ds
      );
      const sorted = [...items].sort((a, b) => {
        const ha = a.hora_agendamento || "99:99";
        const hb = b.hora_agendamento || "99:99";
        return ha.localeCompare(hb);
      });
      return { date: d, count: items.length, items: sorted };
    });
  }, [allMyLeads, weekDays]);

  const maxWeek = Math.max(1, ...weekCounts.map((w) => w.count));

  // Status grid — counts no mês corrente, leads do agente
  const statusCounts = STATUS_CARDS.map((s) => ({
    ...s,
    value: myMonthLeads.filter((l) => s.match(l.etapa)).length,
  }));

  // Por loja — apenas lojas onde o agente atende
  const myUnidades = unidades.filter((u) => myUnitIds.has(u.id));
  const metaPorLoja = myUnidades.length > 0 ? Math.round(META_AGENTE / myUnidades.length) : META_AGENTE;

  const lojaCards = myUnidades.map((u) => {
    const subset = myMonthLeads.filter((l) => l.id_unidade === u.id);
    const c = subset.filter((l) => l.etapa === "concluido").length;
    const p = subset.filter((l) => l.etapa === "perdido").length;
    const ag = subset.filter((l) => l.etapa === "agendado").length;
    const conf = subset.filter((l) => l.etapa === "confirmado").length;
    const rea = subset.filter((l) => l.etapa === "reagendado").length;
    const disp = subset.filter((l) => l.etapa === "dispensado").length;
    const an = subset.filter((l) => l.etapa === "analise_supervisor").length;
    const nl = subset.filter((l) => l.etapa === "na_loja").length;
    const prog = c + p;
    return {
      id: u.id,
      nome: u.nome,
      concluidos: c,
      perdidos: p,
      agendados: ag,
      confirmados: conf,
      reagendados: rea,
      dispensados: disp,
      analise: an,
      naLoja: nl,
      progresso: prog,
      pct: Math.min(Math.round((prog / metaPorLoja) * 100), 100),
    };
  });

  const BadgeIcon = ritmoBadge.icon;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" /> Olá, {currentUser.nome?.split(" ")[0] || "Agente"} 👋
          </h1>
          <p className="text-muted-foreground text-sm capitalize">
            {format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Badge variant="outline" className={`gap-1.5 px-3 py-1.5 text-sm ${ritmoBadge.cls}`}>
          <BadgeIcon className="h-4 w-4" /> {ritmoBadge.label}
        </Badge>
      </div>

      {/* META — destaque máximo */}
      <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/20 via-primary/10 to-card p-6 space-y-4 shadow-lg">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/20 p-3">
              <Target className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Meta do mês</p>
              <h2 className="text-2xl font-bold">Concluídos + Perdidos</h2>
            </div>
          </div>
          <div className="text-right">
            <p className="text-5xl font-extrabold text-primary leading-none">
              {progresso}
              <span className="text-2xl text-muted-foreground font-bold"> / {META_AGENTE}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {restante > 0 ? `Faltam ${restante} carros` : "🏆 Meta atingida!"}
            </p>
          </div>
        </div>

        <Progress value={pct} className="h-4" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="rounded-lg bg-card/60 p-3">
            <p className="text-xs text-muted-foreground">Progresso</p>
            <p className="text-xl font-bold text-primary">{pct}%</p>
          </div>
          <div className="rounded-lg bg-card/60 p-3">
            <p className="text-xs text-muted-foreground">Média atual/dia</p>
            <p className={`text-xl font-bold ${mediaAtual >= META_AGENTE / bizTotal ? "text-success" : "text-warning"}`}>
              {mediaAtual.toFixed(1)}
            </p>
          </div>
          <div className="rounded-lg bg-card/60 p-3">
            <p className="text-xs text-muted-foreground">Necessária/dia</p>
            <p className="text-xl font-bold text-foreground">{mediaNecessaria.toFixed(1)}</p>
          </div>
          <div className="rounded-lg bg-card/60 p-3">
            <p className="text-xs text-muted-foreground">Dias úteis restantes</p>
            <p className="text-xl font-bold text-foreground">{bizLeft}</p>
          </div>
        </div>
      </div>

      {/* Semana atual */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <CalIcon className="h-5 w-5 text-primary" /> Sua semana
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {weekCounts.map(({ date, count, items }) => {
            const today = isToday(date);
            const intensity = count / maxWeek;
            return (
              <Popover key={date.toISOString()}>
                <PopoverTrigger asChild>
                  <button
                    disabled={count === 0}
                    className={`rounded-lg border p-3 text-center transition-colors ${
                      today ? "border-primary bg-primary/15" : "border-border bg-muted/30"
                    } ${count > 0 ? "hover:border-primary/60 hover:bg-primary/10 cursor-pointer" : "cursor-default opacity-90"}`}
                  >
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                      {format(date, "EEE", { locale: ptBR })}
                    </p>
                    <p className={`text-lg font-bold ${today ? "text-primary" : "text-foreground"}`}>
                      {format(date, "dd")}
                    </p>
                    <p className={`text-2xl font-extrabold ${count > 0 ? "text-primary" : "text-muted-foreground/40"}`}>
                      {count}
                    </p>
                    <p className="text-[10px] text-muted-foreground">agend.</p>
                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.round(intensity * 100)}%` }}
                      />
                    </div>
                  </button>
                </PopoverTrigger>
                {count > 0 && (
                  <PopoverContent align="center" className="w-80 p-0">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                        {format(date, "EEEE", { locale: ptBR })}
                      </p>
                      <p className="font-semibold text-sm">
                        {format(date, "dd 'de' MMMM", { locale: ptBR })} · {count} agendamento{count > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="max-h-72 overflow-auto divide-y divide-border">
                      {items.map((l) => (
                        <div key={l.id} className="px-4 py-2.5 flex items-start gap-3">
                          <div className="rounded-md bg-primary/10 text-primary font-bold text-xs px-2 py-1 min-w-[54px] text-center flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3" />
                            {l.hora_agendamento || "--:--"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{l.nome}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {l.telefone || "sem telefone"}
                              {l.numero_os && <> · OS {l.numero_os}</>}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {l.etapa}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            );
          })}
        </div>
      </div>

      {/* Status grid */}
      <div>
        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
          Seus leads do mês por status
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {statusCounts.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.key} className={`rounded-xl border p-4 ${s.bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-4 w-4 ${s.color}`} />
                  <span className={`text-2xl font-extrabold ${s.color}`}>{s.value}</span>
                </div>
                <p className="text-xs font-medium text-foreground">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desempenho por loja */}
      {lojaCards.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Desempenho por loja
          </h3>
          <div className={`grid gap-4 ${
            lojaCards.length === 1 ? "grid-cols-1" :
            lojaCards.length === 2 ? "grid-cols-1 md:grid-cols-2" :
            "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          }`}>
            {lojaCards.map((l) => (
              <div key={l.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Loja</p>
                    <h4 className="font-bold text-base">{l.nome}</h4>
                  </div>
                  <Badge
                    variant="outline"
                    className={l.progresso >= metaPorLoja
                      ? "bg-success/15 text-success border-success/30"
                      : "bg-primary/10 text-primary border-primary/30"}
                  >
                    {l.progresso} / {metaPorLoja}
                  </Badge>
                </div>
                <Progress value={l.pct} className="h-2.5" />
                <p className="text-xs text-muted-foreground">{l.pct}% da meta</p>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <p className="text-lg font-bold text-purple">{l.agendados}</p>
                    <p className="text-[10px] text-muted-foreground">Agend.</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <p className="text-lg font-bold text-info">{l.confirmados}</p>
                    <p className="text-[10px] text-muted-foreground">Confirm.</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <p className="text-lg font-bold text-purple">{l.reagendados}</p>
                    <p className="text-[10px] text-muted-foreground">Reagend.</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <p className="text-lg font-bold text-warning">{l.naLoja}</p>
                    <p className="text-[10px] text-muted-foreground">Na Loja</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <p className="text-lg font-bold text-destructive">{l.dispensados}</p>
                    <p className="text-[10px] text-muted-foreground">Disp.</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <p className="text-lg font-bold text-warning">{l.analise}</p>
                    <p className="text-[10px] text-muted-foreground">Análise</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <p className="text-lg font-bold text-success">{l.concluidos}</p>
                    <p className="text-[10px] text-muted-foreground">Concl.</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2 text-center">
                    <p className="text-lg font-bold text-destructive">{l.perdidos}</p>
                    <p className="text-[10px] text-muted-foreground">Perd.</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentPanelOverview;