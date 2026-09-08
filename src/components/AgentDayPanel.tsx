import { useMemo, useState } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Target, ChevronLeft, ChevronRight, CalendarDays, Users, CalendarCheck,
  Car, MapPin, Sparkles, Phone, RefreshCw, XCircle, Briefcase, Flame,
  Trophy, AlertTriangle, CalendarIcon, ClipboardCheck, Wallet, Rocket,
} from "lucide-react";
import {
  format, isToday, addDays, subDays, startOfMonth, endOfMonth, isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { foiNaLoja, formatDataSegura, comissaoRate, COMISSAO_RATE_MAX, META_AGENTE_PADRAO } from "@/lib/leadUtils";
import type { Lead } from "@/data/mockData";

const META_AGENTE = META_AGENTE_PADRAO;
const META_MIN_POR_UNIDADE = 2;
const META_ALVO_POR_UNIDADE = 4;

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

const initials = (name: string) =>
  name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

export const AgentDayPanel = () => {
  const { leads, eventos, unidades, agentUnidades } = useLeads();
  const { currentUser } = useRole();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const dayStr = format(selectedDate, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isViewingToday = dayStr === todayStr;

  const myUnitIds = useMemo(() => {
    const ids = new Set<string>(
      agentUnidades.filter((au) => au.id_agente === currentUser.id).map((au) => au.id_unidade)
    );
    if (currentUser.unidade_padrao) ids.add(currentUser.unidade_padrao);
    return ids;
  }, [agentUnidades, currentUser.id, currentUser.unidade_padrao]);

  const myLeads = useMemo(
    () => leads.filter((l) => l.id_agente === currentUser.id),
    [leads, currentUser.id]
  );

  // Daily meta target (proportional to business days)
  const now = new Date();
  const bizTotal = countBusinessDays(startOfMonth(now), endOfMonth(now));
  const metaDia = bizTotal > 0 ? META_AGENTE / bizTotal : 0;

  // ===== Safra do Dia: leads que entraram para o agente NESSE dia
  const safraDoDia = useMemo(() => {
    const cohort = myLeads.filter((l) => {
      const d = l.created_at ? l.created_at.slice(0, 10) : l.data_entrada;
      return d === dayStr;
    });
    const total = cohort.length;
    const agendados = cohort.filter((l) =>
      !["novo", "desqualificado_novo", "desqualificado_agendado"].includes(l.etapa)
    ).length;
    const desq = cohort.filter((l) =>
      ["desqualificado_novo", "desqualificado_agendado"].includes(l.etapa)
    ).length;
    const produtivos = total - desq;
    const tx = produtivos > 0 ? Math.round((agendados / produtivos) * 100) : 0;
    return { total, agendados, desq, produtivos, tx };
  }, [myLeads, dayStr]);

  // ===== Agendamentos do dia (meus + da unidade)
  const meusAgendamentosDoDia = useMemo(
    () => myLeads.filter((l) =>
      ["agendado", "reagendado", "confirmado"].includes(l.etapa) && l.data_agendamento === dayStr
    ),
    [myLeads, dayStr]
  );

  const agendamentosUnidadeDoDia = useMemo(
    () => leads.filter((l) =>
      l.id_unidade && myUnitIds.has(l.id_unidade) &&
      ["agendado", "reagendado", "confirmado", "na_loja", "concluido"].includes(l.etapa) &&
      l.data_agendamento === dayStr
    ),
    [leads, myUnitIds, dayStr]
  );

  // ===== Resultados do dia para a meta (Concluídos + Perdidos com check-in no dia)
  const resultadosDoDia = useMemo(() => {
    const concl = myLeads.filter((l) =>
      l.etapa === "concluido" && l.checkin && l.checkin.slice(0, 10) === dayStr
    ).length;
    const perd = myLeads.filter((l) =>
      l.etapa === "perdido" && l.checkin && l.checkin.slice(0, 10) === dayStr
    ).length;
    const naLoja = myLeads.filter((l) =>
      foiNaLoja(l) && l.checkin && l.checkin.slice(0, 10) === dayStr
    ).length;
    return { concl, perd, total: concl + perd, naLoja };
  }, [myLeads, dayStr]);

  const pctMeta = metaDia > 0 ? Math.min(Math.round((resultadosDoDia.naLoja / metaDia) * 100), 100) : 0;

  // ===== Comissão do dia
  const comissaoDia = useMemo(() => {
    const mStart = format(startOfMonth(now), "yyyy-MM-dd");
    const mEnd = format(endOfMonth(now), "yyyy-MM-dd");
    // Só conta carro que realmente passou na loja (check-in registrado),
    // mesma regra do painel do supervisor.
    const progressoMes = myLeads.filter((l) => {
      if (!["concluido", "perdido"].includes(l.etapa)) return false;
      if (!l.checkin) return false;
      const ref = l.checkin.slice(0, 10);
      return ref >= mStart && ref <= mEnd;
    }).length;
    const rate = comissaoRate(progressoMes);

    const RATE_POT = COMISSAO_RATE_MAX;
    // "Na Loja" do dia: todo carro com check-in nesse dia, qualquer status.
    const naLojaHoje = myLeads.filter(
      (l) => !!l.checkin && l.checkin.slice(0, 10) === dayStr
    ).length;
    // Agendados do dia: todos os agendamentos marcados para esse dia.
    const agendadosHoje = myLeads.filter((l) =>
      ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido", "desqualificado_agendado", "analise_supervisor"].includes(l.etapa) &&
      l.data_agendamento === dayStr
    ).length;
    const produtivosHoje = safraDoDia.produtivos;

    const ganhoMeta = resultadosDoDia.total * rate;
    const ganhoLoja = naLojaHoje * RATE_POT;
    const ganhoAgendados = agendadosHoje * RATE_POT;
    const ganhoProdutivos = produtivosHoje * RATE_POT;
    return { rate, RATE_POT, progressoMes, ganhoMeta, ganhoLoja, ganhoAgendados, ganhoProdutivos, naLojaHoje, agendadosHoje, produtivosHoje };
  }, [myLeads, dayStr, resultadosDoDia.total, safraDoDia.produtivos, now]);

  const metaBadge = (() => {
    if (resultadosDoDia.naLoja >= Math.ceil(metaDia)) {
      return { label: "Meta do dia batida!", icon: Trophy, cls: "bg-success/20 text-success border-success/40" };
    }
    if (resultadosDoDia.naLoja >= Math.floor(metaDia)) {
      return { label: "No ritmo", icon: Flame, cls: "bg-warning/20 text-warning border-warning/40" };
    }
    return { label: "Acelerar", icon: AlertTriangle, cls: "bg-destructive/20 text-destructive border-destructive/40" };
  })();
  const BadgeIcon = metaBadge.icon;

  // ===== Meta por unidade — cada loja tem mínimo de 2 e alvo de 4 carros/dia
  const metaPorUnidade = useMemo(() => {
    const naLojaPorUnidade: Record<string, number> = {};
    myLeads.forEach((l) => {
      if (!l.checkin || l.checkin.slice(0, 10) !== dayStr) return;
      if (!foiNaLoja(l)) return;
      if (!l.id_unidade) return;
      naLojaPorUnidade[l.id_unidade] = (naLojaPorUnidade[l.id_unidade] || 0) + 1;
    });
    return Array.from(myUnitIds).map((uid) => {
      const u = unidades.find((x) => x.id === uid);
      const count = naLojaPorUnidade[uid] || 0;
      const faltaMin = Math.max(META_MIN_POR_UNIDADE - count, 0);
      const faltaAlvo = Math.max(META_ALVO_POR_UNIDADE - count, 0);
      const status: "alvo" | "minimo" | "abaixo" =
        count >= META_ALVO_POR_UNIDADE ? "alvo" : count >= META_MIN_POR_UNIDADE ? "minimo" : "abaixo";
      return { id: uid, nome: u?.nome || "—", count, faltaMin, faltaAlvo, status };
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [myLeads, dayStr, myUnitIds, unidades]);

  // ===== Tentar Resgatar (apenas faz sentido para hoje)
  const resgatar = useMemo(() => {
    if (!isViewingToday) return { reagendados: [], dispensados: [], trabalhados: [], fupsHoje: [] };
    // 1. Reagendados de hoje (lembrar de confirmar)
    const reagendados = myLeads.filter((l) =>
      l.etapa === "reagendado" && l.data_agendamento === dayStr
    ).slice(0, 6);
    // 2. Dispensados recentes (últimos 14 dias) — chamar pra voltar
    const cutoffDisp = format(subDays(now, 14), "yyyy-MM-dd");
    const dispensados = myLeads.filter((l) => {
      if (l.etapa !== "dispensado") return false;
      const ref = l.dispensado_em ? l.dispensado_em.slice(0, 10) : (l.checkin?.slice(0, 10) || l.data_agendamento || "");
      return ref >= cutoffDisp;
    }).slice(0, 6);
    // 3. Trabalhados — ainda dá pra retomar
    const trabalhados = myLeads.filter((l) => l.etapa === "trabalhado").slice(0, 6);
    // 4. Followups pendentes com data_prevista <= hoje
    // Só faz sentido em etapas onde o ciclo de FUP ainda está ativo.
    // Exclui leads já encerrados (trabalhado, desqualificado*, dispensado, perdido, concluido)
    // e em análise do supervisor (fora das mãos do agente).
    const etapasComFupAtivo = new Set(["novo", "agendado", "reagendado", "confirmado", "na_loja"]);
    const fupsHoje = eventos
      .filter((e) => !e.concluido && e.tipo === "followup" && e.data_prevista <= dayStr)
      .map((e) => {
        const lead = myLeads.find((l) => l.id === e.id_lead);
        if (!lead || !etapasComFupAtivo.has(lead.etapa)) return null;
        return { lead, evento: e };
      })
      .filter((x): x is { lead: Lead; evento: any } => !!x)
      .slice(0, 6);
    return { reagendados, dispensados, trabalhados, fupsHoje };
  }, [isViewingToday, myLeads, eventos, dayStr]);

  const open = (lead: Lead) => { setDetailLead(lead); setDetailOpen(true); };

  const getUnidadeNome = (id?: string | null) =>
    id ? unidades.find((u) => u.id === id)?.nome || "—" : "—";

  const dayLabel = (() => {
    if (isToday(selectedDate)) return "Hoje";
    const yesterday = subDays(new Date(), 1);
    if (isSameDay(selectedDate, yesterday)) return "Ontem";
    const tomorrow = addDays(new Date(), 1);
    if (isSameDay(selectedDate, tomorrow)) return "Amanhã";
    return format(selectedDate, "EEEE", { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase());
  })();

  const ACCENT: Record<string, { hoverBorder: string; hoverBg: string; avatar: string; text: string; icon: string }> = {
    primary:     { hoverBorder: "hover:border-primary/40",     hoverBg: "hover:bg-primary/5",     avatar: "bg-primary/15 text-primary",         text: "text-primary",         icon: "text-primary" },
    destructive: { hoverBorder: "hover:border-destructive/40", hoverBg: "hover:bg-destructive/5", avatar: "bg-destructive/15 text-destructive", text: "text-destructive",     icon: "text-destructive" },
    warning:     { hoverBorder: "hover:border-warning/40",     hoverBg: "hover:bg-warning/5",     avatar: "bg-warning/15 text-warning",         text: "text-warning",         icon: "text-warning" },
    purple:      { hoverBorder: "hover:border-purple/40",      hoverBg: "hover:bg-purple/5",      avatar: "bg-purple/15 text-purple",           text: "text-purple",          icon: "text-purple" },
    info:        { hoverBorder: "hover:border-info/40",        hoverBg: "hover:bg-info/5",        avatar: "bg-info/15 text-info",               text: "text-info",            icon: "text-info" },
    muted:       { hoverBorder: "hover:border-muted-foreground/40", hoverBg: "hover:bg-muted/30", avatar: "bg-muted text-muted-foreground",     text: "text-muted-foreground", icon: "text-muted-foreground" },
  };

  const LeadCard = ({ lead, hint, accent = "primary" }: { lead: Lead; hint?: string; accent?: keyof typeof ACCENT }) => {
    const a = ACCENT[accent];
    return (
      <button
        onClick={() => open(lead)}
        className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border border-border bg-card ${a.hoverBorder} ${a.hoverBg} transition-colors`}
      >
        <Avatar className={`h-10 w-10 ${a.avatar}`}>
          <AvatarFallback className={`text-sm font-semibold ${a.avatar}`}>{initials(lead.nome)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{lead.nome}</p>
          <p className="text-xs text-muted-foreground truncate">
            {getUnidadeNome(lead.id_unidade)}
            {lead.telefone && <> · {lead.telefone}</>}
          </p>
          {hint && <p className={`text-[11px] mt-0.5 font-medium ${a.text}`}>{hint}</p>}
        </div>
        <Phone className={`h-4 w-4 shrink-0 ${a.icon}`} />
      </button>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header com navegador de data */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" /> Meu Dia
          </h1>
          <p className="text-muted-foreground text-sm capitalize">
            {dayLabel} · {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => subDays(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarPicker
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => addDays(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isViewingToday && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>Hoje</Button>
          )}
        </div>
      </div>

      {/* META DO DIA — destaque */}
      <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/20 via-primary/10 to-card p-6 space-y-4 shadow-lg">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/20 p-3">
              <Target className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Meta do dia</p>
              <h2 className="text-2xl font-bold">Carros na loja</h2>
            </div>
          </div>
          <div className="text-right">
            <p className="text-5xl font-extrabold text-primary leading-none">
              {resultadosDoDia.naLoja}
              <span className="text-2xl text-muted-foreground font-bold"> / {metaDia.toFixed(1)}</span>
            </p>
            <Badge variant="outline" className={`gap-1.5 mt-2 ${metaBadge.cls}`}>
              <BadgeIcon className="h-3.5 w-3.5" /> {metaBadge.label}
            </Badge>
          </div>
        </div>

        <Progress value={pctMeta} className="h-4" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="rounded-lg bg-card/60 p-3">
            <p className="text-xs text-muted-foreground">Concluídos</p>
            <p className="text-xl font-bold text-success">{resultadosDoDia.concl}</p>
          </div>
          <div className="rounded-lg bg-card/60 p-3">
            <p className="text-xs text-muted-foreground">Perdidos</p>
            <p className="text-xl font-bold text-destructive">{resultadosDoDia.perd}</p>
          </div>
          <div className="rounded-lg bg-card/60 p-3">
            <p className="text-xs text-muted-foreground">Foram na loja</p>
            <p className="text-xl font-bold text-warning">{resultadosDoDia.naLoja}</p>
          </div>
          <div className="rounded-lg bg-card/60 p-3">
            <p className="text-xs text-muted-foreground">Meta diária</p>
            <p className="text-xl font-bold text-foreground">{metaDia.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* META POR UNIDADE — cada loja tem mínimo de 2 e alvo de 4 carros */}
      {metaPorUnidade.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-warning" />
              <h3 className="font-semibold">Meta por unidade</h3>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Mínimo {META_MIN_POR_UNIDADE} · Alvo {META_ALVO_POR_UNIDADE} carros/dia em cada loja
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {metaPorUnidade.map((u) => {
              const pct = Math.min(Math.round((u.count / META_ALVO_POR_UNIDADE) * 100), 100);
              const tone =
                u.status === "alvo"
                  ? { border: "border-success/40", bg: "bg-success/5", text: "text-success", label: "Alvo batido" }
                  : u.status === "minimo"
                  ? { border: "border-warning/40", bg: "bg-warning/5", text: "text-warning", label: `Faltam ${u.faltaAlvo} p/ alvo` }
                  : { border: "border-destructive/40", bg: "bg-destructive/5", text: "text-destructive", label: `Faltam ${u.faltaMin} p/ mínimo` };
              return (
                <div key={u.id} className={`rounded-lg border ${tone.border} ${tone.bg} p-3 space-y-2`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold truncate">{u.nome}</p>
                    <span className={`text-lg font-extrabold ${tone.text}`}>
                      {u.count}
                      <span className="text-xs text-muted-foreground font-bold"> / {META_ALVO_POR_UNIDADE}</span>
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">Mín. {META_MIN_POR_UNIDADE}</span>
                    <span className={`font-medium ${tone.text}`}>{tone.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* COMISSÃO DO DIA */}
      {(() => {
        const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
        return (
          <div className="rounded-2xl border-2 border-success/40 bg-gradient-to-br from-success/20 via-success/10 to-card p-6 space-y-4 shadow-lg">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-success/20 p-3">
                  <Wallet className="h-7 w-7 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">Comissão do dia</p>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    Ganho de {dayLabel.toLowerCase()}
                    <Badge variant="outline" className={comissaoDia.rate >= 8 ? "bg-success/20 text-success border-success/40" : comissaoDia.rate > 0 ? "bg-primary/15 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border"}>
                      {comissaoDia.rate > 0 ? `R$ ${comissaoDia.rate}/carro` : "Sem bonificação"}
                    </Badge>
                  </h2>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-extrabold text-success leading-none">{brl(comissaoDia.ganhoMeta)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {resultadosDoDia.total} carro{resultadosDoDia.total !== 1 ? "s" : ""} conquistado{resultadosDoDia.total !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="rounded-lg border border-purple/30 bg-purple/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarCheck className="h-4 w-4 text-purple" />
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Agendados</p>
                </div>
                <p className="text-xl font-extrabold text-purple">{brl(comissaoDia.ganhoAgendados)}</p>
                <p className="text-[11px] text-muted-foreground">{comissaoDia.agendadosHoje} × R$ {comissaoDia.RATE_POT}</p>
              </div>
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Car className="h-4 w-4 text-warning" />
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Na loja</p>
                </div>
                <p className="text-xl font-extrabold text-warning">{brl(comissaoDia.ganhoLoja)}</p>
                <p className="text-[11px] text-muted-foreground">{comissaoDia.naLojaHoje} × R$ {comissaoDia.RATE_POT}</p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Rocket className="h-4 w-4 text-primary" />
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Produtivos</p>
                </div>
                <p className="text-xl font-extrabold text-primary">{brl(comissaoDia.ganhoProdutivos)}</p>
                <p className="text-[11px] text-muted-foreground">{comissaoDia.produtivosHoje} × R$ {comissaoDia.RATE_POT}</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Safra + Agendamentos da unidade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Safra do dia */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Aproveitamento da Safra</h3>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Leads que você registrou neste dia</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold">{safraDoDia.total}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Registrados</p>
            </div>
            <div className="rounded-lg bg-purple/10 p-3 text-center">
              <p className="text-2xl font-bold text-purple">{safraDoDia.agendados}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Agendados</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{safraDoDia.desq}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Desq.</p>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Conversão em agendamento</span>
              <span className="text-sm font-semibold text-primary">{safraDoDia.tx}%</span>
            </div>
            <Progress value={safraDoDia.tx} className="h-2" />
            <p className="text-[11px] text-muted-foreground mt-1">{safraDoDia.agendados} de {safraDoDia.produtivos} produtivos</p>
          </div>
        </div>

        {/* Agendamentos da unidade */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-warning" />
            <h3 className="font-semibold">Agendamentos na(s) loja(s)</h3>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Movimento total das suas unidades no dia</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-warning/10 p-3 text-center">
              <p className="text-2xl font-bold text-warning">{agendamentosUnidadeDoDia.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Loja</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3 text-center">
              <p className="text-2xl font-bold text-primary">{meusAgendamentosDoDia.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Seus</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-2xl font-bold">
                {agendamentosUnidadeDoDia.length > 0
                  ? Math.round((meusAgendamentosDoDia.length / agendamentosUnidadeDoDia.length) * 100)
                  : 0}%
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sua fatia</p>
            </div>
          </div>
          {meusAgendamentosDoDia.length > 0 ? (
            <div className="space-y-1 max-h-48 overflow-auto">
              {meusAgendamentosDoDia.slice(0, 5).map((l) => (
                <button
                  key={l.id}
                  onClick={() => open(l)}
                  className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <CalendarCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate flex-1">{l.nome}</span>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">{l.etapa}</Badge>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">Sem agendamentos seus neste dia</p>
          )}
        </div>
      </div>

      {/* TENTAR RESGATAR — só para hoje */}
      {isViewingToday && (
        <div className="rounded-2xl border-2 border-warning/40 bg-gradient-to-br from-warning/15 via-warning/5 to-card p-6 space-y-5 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-warning/20 p-3">
              <Flame className="h-6 w-6 text-warning" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Tente resgatar hoje 🚀</h2>
              <p className="text-sm text-muted-foreground">Oportunidades quentes pra você bater a meta do dia</p>
            </div>
          </div>

          {/* Reagendados de hoje */}
          {resgatar.reagendados.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-purple">
                <RefreshCw className="h-4 w-4" /> Reagendados pra hoje ({resgatar.reagendados.length})
                <span className="text-xs font-normal text-muted-foreground">— confirme que vão aparecer</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {resgatar.reagendados.map((l) => (
                  <LeadCard key={l.id} lead={l} accent="purple" hint="Reagendado — ligue pra confirmar" />
                ))}
              </div>
            </div>
          )}

          {/* Followups pendentes */}
          {resgatar.fupsHoje.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-primary">
                <ClipboardCheck className="h-4 w-4" /> Follow-ups vencidos ({resgatar.fupsHoje.length})
                <span className="text-xs font-normal text-muted-foreground">— processo em aberto</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {resgatar.fupsHoje.map(({ lead, evento }) => (
                  <LeadCard
                    key={evento.id}
                    lead={lead}
                    accent="primary"
                    hint={`FUP #${evento.numero} vencido em ${formatDataSegura(evento.data_prevista, "dd/MM")}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dispensados recentes */}
          {resgatar.dispensados.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-destructive">
                <XCircle className="h-4 w-4" /> Dispensados recentes ({resgatar.dispensados.length})
                <span className="text-xs font-normal text-muted-foreground">— traga ele de volta pra loja</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {resgatar.dispensados.map((l) => (
                  <LeadCard key={l.id} lead={l} accent="destructive" hint="Pode voltar a fazer o serviço" />
                ))}
              </div>
            </div>
          )}

          {/* Trabalhados */}
          {resgatar.trabalhados.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-muted-foreground">
                <Briefcase className="h-4 w-4" /> Leads trabalhados ({resgatar.trabalhados.length})
                <span className="text-xs font-normal">— vale uma última tentativa</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {resgatar.trabalhados.map((l) => (
                  <LeadCard key={l.id} lead={l} accent="muted" hint="Nova abordagem pode converter" />
                ))}
              </div>
            </div>
          )}

          {resgatar.reagendados.length === 0 &&
           resgatar.fupsHoje.length === 0 &&
           resgatar.dispensados.length === 0 &&
           resgatar.trabalhados.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-6">
              🎉 Nenhuma oportunidade pendente — você está em dia!
            </p>
          )}
        </div>
      )}

      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};

export default AgentDayPanel;