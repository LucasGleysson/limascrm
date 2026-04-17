import { useState, useMemo, useRef } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadDetailSheet } from "./LeadDetailSheet";
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/hooks/usePagination";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Clock, AlertCircle, Plus, CalendarPlus, StickyNote, Phone as PhoneIcon, CalendarCheck, UserX, Flag, Skull, XCircle, Search } from "lucide-react";
import { Evento, Lead, ETAPAS_FUNIL, TAGS_MOTIVO_OS } from "@/data/mockData";
import { MotivoTagSelector } from "./MotivoTagSelector";
import { formatDateBR, getStatusBadgeClass } from "@/lib/leadUtils";
import { appendNota } from "@/lib/notasUtils";
import { formatPhone } from "@/lib/phoneUtils";

export const EventoPanel = () => {
  const { eventos, leads, addEvento, concluirEvento, updateLead } = useLeads();
  const { currentUser } = useRole();
  const [concludeOpen, setConcludeOpen] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
  const [descricao, setDescricao] = useState("");
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const concludingRef = useRef(false);
  const creatingRef = useRef(false);
  const concludingProcessRef = useRef(false);
  const markingLossRef = useRef(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newLeadId, setNewLeadId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newDescricao, setNewDescricao] = useState("");

  const [concludeProcessOpen, setConcludeProcessOpen] = useState(false);
  const [concludeProcessLead, setConcludeProcessLead] = useState<Lead | null>(null);
  const [concludeProcessMotivo, setConcludeProcessMotivo] = useState("");

  const [lossOpen, setLossOpen] = useState(false);
  const [lossLead, setLossLead] = useState<Lead | null>(null);
  const [lossMotivo, setLossMotivo] = useState("");
  const [lossTags, setLossTags] = useState<string[]>([]);

  const [fupSearch, setFupSearch] = useState("");
  const [fupCategoryFilter, setFupCategoryFilter] = useState<string | null>(null);

  const myLeads = useMemo(
    () => leads.filter((l) => l.id_agente === currentUser.id),
    [leads, currentUser.id]
  );

  const today = new Date().toISOString().split("T")[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

  const getEncerrarStatus = (lead: Lead): string => {
    // Post-store leads go to supervisor analysis instead of directly to "perdido"
    if (["na_loja", "dispensado", "confirmado"].includes(lead.etapa)) return "analise_supervisor";
    if (["agendado", "reagendado"].includes(lead.etapa)) return "desqualificado_agendado";
    if (lead.etapa === "novo") return "trabalhado";
    if (lead.etapa === "desqualificado") return "desqualificado_novo";
    return lead.etapa;
  };

  const isLeadEligibleForFupToday = (lead: Lead): boolean => {
    if (lead.fup_concluido) return false;
    if (lead.etapa === "dispensado") return true;
    if (lead.etapa === "novo") return true;
    if (["agendado", "reagendado"].includes(lead.etapa)) {
      // Include: appointment tomorrow (day-before reminder), today, or past
      return !!lead.data_agendamento && lead.data_agendamento <= tomorrowStr;
    }
    return false;
  };

  const myLeadIds = useMemo(() => new Set(myLeads.map((l) => l.id)), [myLeads]);

  const myEvents = useMemo(() => {
    return eventos
      .filter((e) => {
        if (!myLeadIds.has(e.id_lead)) return false;
        const lead = myLeads.find((l) => l.id === e.id_lead);
        if (!lead) return false;
        if (e.tipo === "followup" && !e.concluido) {
          if (lead.fup_concluido) return false;
          if (!isLeadEligibleForFupToday(lead)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.concluido !== b.concluido) return a.concluido ? 1 : -1;
        return a.data_prevista.localeCompare(b.data_prevista);
      });
  }, [eventos, myLeadIds, myLeads, today, tomorrowStr]);

  const pendentes = myEvents.filter((e) => !e.concluido);
  const concluidos = myEvents.filter((e) => e.concluido);

  const lembretes = pendentes.filter((e) => e.tipo === "lembrete");
  const followups = pendentes.filter((e) => e.tipo === "followup");

  const categorizeFollowup = (evento: Evento) => {
    const lead = myLeads.find((l) => l.id === evento.id_lead);
    if (!lead) return "other";
    if (lead.etapa === "dispensado") return "dispensado";
    if (["agendado", "reagendado"].includes(lead.etapa)) {
      if (lead.data_agendamento && lead.data_agendamento < today) return "agendado_atrasado";
      if (lead.data_agendamento === today) return "agendado_hoje";
      if (lead.data_agendamento === tomorrowStr) return "agendado_amanha";
      return "ignore";
    }
    if (["novo"].includes(lead.etapa)) return "novo";
    return "other";
  };

  const followupsByCategory = useMemo(() => {
    const cats: Record<string, Evento[]> = {
      novo: [],
      agendado_amanha: [],
      agendado_hoje: [],
      agendado_atrasado: [],
      dispensado: [],
      other: [],
    };
    followups.forEach((e) => {
      const cat = categorizeFollowup(e);
      if (cat !== "ignore") {
        cats[cat]?.push(e);
      }
    });
    return cats;
  }, [followups, myLeads, today, tomorrowStr]);

  const allPendingFollowups = useMemo(() => {
    let all: Evento[] = [];
    if (fupCategoryFilter) {
      const catEvents = followupsByCategory[fupCategoryFilter] || [];
      all = [...catEvents].sort((a, b) => b.data_prevista.localeCompare(a.data_prevista));
    } else {
      Object.values(followupsByCategory).forEach((arr) => all.push(...arr));
    }
    if (!fupSearch.trim()) return all;
    const q = fupSearch.trim().toLowerCase();
    return all.filter((e) => {
      const lead = myLeads.find((l) => l.id === e.id_lead);
      if (!lead) return false;
      return lead.nome.toLowerCase().includes(q) || lead.telefone.includes(q);
    });
  }, [followupsByCategory, fupSearch, myLeads, fupCategoryFilter]);

  const fupPagination = usePagination(allPendingFollowups, { pageSize: 20 });
  const concludedPagination = usePagination(concluidos, { pageSize: 20 });

  const handleConclude = async () => {
    if (!selectedEvento || !descricao.trim() || concludingRef.current) return;
    concludingRef.current = true;
    try {
      const lead = leads.find((l) => l.id === selectedEvento.id_lead);
      const label = selectedEvento.tipo === "lembrete" ? "Lembrete Concluído" : `Follow-up ${selectedEvento.numero} Concluído`;
      if (lead) {
        const notas = appendNota(lead.notas, label, descricao.trim());
        await updateLead(lead.id, { notas });
      }
      await concluirEvento(selectedEvento.id, descricao.trim(), currentUser.id);
      setConcludeOpen(false);
      setDescricao("");
      setSelectedEvento(null);
    } finally {
      concludingRef.current = false;
    }
  };

  const handleCreate = async () => {
    if (!newLeadId || !newDate || !newDescricao.trim() || creatingRef.current) return;
    creatingRef.current = true;
    try {
      const lead = leads.find((l) => l.id === newLeadId);
      if (lead) {
        const notas = appendNota(lead.notas, "Evento Criado", newDescricao.trim());
        await updateLead(lead.id, { notas });
      }
      await addEvento({
        id_lead: newLeadId,
        tipo: "lembrete",
        numero: 0,
        data_prevista: newDate,
        concluido: false,
        id_usuario: currentUser.id,
        descricao: newDescricao.trim(),
      });
      setCreateOpen(false);
      setNewLeadId("");
      setNewDate("");
      setNewDescricao("");
    } finally {
      creatingRef.current = false;
    }
  };

  const handleConcludeProcess = async () => {
    if (!concludeProcessLead || !concludeProcessMotivo.trim() || concludingProcessRef.current) return;
    concludingProcessRef.current = true;
    try {
      const lead = concludeProcessLead;
      const fups = eventos.filter((e) => e.tipo === "followup" && e.id_lead === lead.id);
      const maxFup = fups.length > 0 ? Math.max(...fups.map((e) => e.numero)) : 0;
      const newStatus = getEncerrarStatus(lead);
      const statusLabel = ETAPAS_FUNIL.find((e) => e.id === newStatus)?.label || newStatus;
      const notas = appendNota(lead.notas, "Processo FUP Concluído", `${concludeProcessMotivo.trim()} → Status: ${statusLabel}`);
      await updateLead(lead.id, {
        fup_concluido: true,
        fup_concluido_em: new Date().toISOString(),
        fup_concluido_numero: maxFup,
        fup_motivo_conclusao: concludeProcessMotivo.trim(),
        etapa: newStatus,
        notas,
      });
      setConcludeProcessOpen(false);
      setConcludeProcessMotivo("");
      setConcludeProcessLead(null);
    } finally {
      concludingProcessRef.current = false;
    }
  };

  const handleMarkLoss = async () => {
    if (!lossLead || (!lossMotivo.trim() && lossTags.length === 0) || markingLossRef.current) return;
    markingLossRef.current = true;
    try {
      const tagsText = lossTags.length > 0 ? `[${lossTags.join(", ")}]` : "";
      const fullMotivo = [tagsText, lossMotivo.trim()].filter(Boolean).join(" ");
      const notas = appendNota(lossLead.notas, "Enviado para Análise do Supervisor", fullMotivo);
      const fups = eventos.filter((e) => e.tipo === "followup" && e.id_lead === lossLead.id);
      const maxFup = fups.length > 0 ? Math.max(...fups.map((e) => e.numero)) : 0;
      await updateLead(lossLead.id, {
        etapa: "analise_supervisor",
        notas,
        fup_concluido: true,
        fup_concluido_em: new Date().toISOString(),
        fup_concluido_numero: maxFup,
        fup_motivo_conclusao: `Análise: ${fullMotivo}`,
        tags_motivo: lossTags.length > 0 ? lossTags : null,
      } as any);
      setLossOpen(false);
      setLossMotivo("");
      setLossTags([]);
      setLossLead(null);
    } finally {
      markingLossRef.current = false;
    }
  };

  const leadsWithActiveFup = useMemo(() => {
    const duePendingFupLeadIds = new Set(
      eventos
        .filter((e) => e.tipo === "followup" && !e.concluido && e.data_prevista <= today)
        .map((e) => e.id_lead)
    );
    return myLeads.filter((l) => duePendingFupLeadIds.has(l.id) && isLeadEligibleForFupToday(l));
  }, [eventos, myLeads, today]);

  const leadsForLoss = useMemo(() => {
    return myLeads.filter((l) =>
      ["na_loja", "dispensado", "confirmado"].includes(l.etapa) && l.etapa !== "perdido"
    );
  }, [myLeads]);

  const getLeadName = (leadId: string) => leads.find((l) => l.id === leadId)?.nome || "";
  const getLead = (leadId: string) => leads.find((l) => l.id === leadId) || null;
  const isOverdue = (dataPrevista: string) => dataPrevista < today;

  const openLeadDetail = (leadId: string) => {
    const lead = getLead(leadId);
    if (lead) { setDetailLead(lead); setDetailOpen(true); }
  };

  const renderEventCard = (evento: Evento, concluded = false) => {
    const lead = getLead(evento.id_lead);
    const canSendAnalysis = lead && ["na_loja", "dispensado", "confirmado"].includes(lead.etapa) && lead.etapa !== "perdido" && lead.etapa !== "analise_supervisor";

    return (
      <div
        key={evento.id}
        className={`flex items-center gap-4 p-4 rounded-xl bg-card border transition-all cursor-pointer hover:bg-muted/50 ${
          !concluded && isOverdue(evento.data_prevista) ? "border-destructive/30" : "border-border"
        } ${concluded ? "opacity-70" : ""}`}
        onClick={() => openLeadDetail(evento.id_lead)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`${concluded ? "font-medium" : "font-semibold"} hover:underline`}>{getLeadName(evento.id_lead)}</span>
            {evento.tipo === "lembrete" ? (
              <Badge variant="outline" className={`text-xs ${concluded ? "bg-success/10 text-success border-success/30" : "bg-accent/50 text-accent-foreground border-accent"}`}>
                <StickyNote className="h-3 w-3 mr-1" /> Lembrete {concluded && "✓"}
              </Badge>
            ) : (
              <Badge variant="outline" className={`text-xs ${concluded ? "bg-success/10 text-success border-success/30" : "bg-warning/10 text-warning border-warning/30"}`}>
                Follow-up {evento.numero} {concluded && "✓"}
              </Badge>
            )}
            {!concluded && isOverdue(evento.data_prevista) && (
              <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                <AlertCircle className="h-3 w-3 mr-1" /> Atrasado
              </Badge>
            )}
          </div>
          {evento.descricao && (
            <p className={`text-sm mt-0.5 ${concluded ? "text-foreground/70" : "text-foreground"}`}>{evento.descricao}</p>
          )}
          <p className="text-sm text-muted-foreground mt-0.5">
            {concluded ? evento.descricao_conclusao : `Previsto: ${formatDateBR(evento.data_prevista)}`}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!concluded && canSendAnalysis && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setLossLead(lead);
                setLossMotivo("");
                setLossOpen(true);
              }}
              className="gap-1 text-xs text-warning border-warning/30 hover:bg-warning/10"
              title="Enviar para Análise"
            >
              <AlertCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          {!concluded && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEvento(evento);
                setDescricao("");
                setConcludeOpen(true);
              }}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" /> Concluir
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderSection = (title: string, icon: React.ReactNode, events: Evento[], emptyMsg?: string) => {
    if (events.length === 0 && !emptyMsg) return null;
    return (
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-muted-foreground">
          {icon} {title} ({events.length})
        </h3>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 pl-6">{emptyMsg}</p>
        ) : (
          <div className="space-y-2">{events.map((e) => renderEventCard(e))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Eventos</h1>
          <p className="text-muted-foreground text-sm">Follow-ups, lembretes e tarefas</p>
        </div>
        <Button onClick={() => { setCreateOpen(true); setNewLeadId(""); setNewDate(""); setNewDescricao(""); }} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Evento
        </Button>
      </div>

      {renderSection("Lembretes Criados", <StickyNote className="h-4 w-4 text-accent-foreground" />, lembretes, "Nenhum lembrete pendente.")}

      {/* Follow-ups with search + pagination */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Follow-ups Pendentes ({allPendingFollowups.length})</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={fupSearch}
            onChange={(e) => setFupSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category badges - now includes "Amanhã" */}
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { key: null, label: "Todos", count: Object.values(followupsByCategory).reduce((s, a) => s + a.length, 0), cls: "bg-muted text-muted-foreground border-border" },
            { key: "novo", label: "Novos", count: followupsByCategory.novo.length, cls: "bg-primary/10 text-primary border-primary/30" },
            { key: "agendado_amanha", label: "Amanhã", count: followupsByCategory.agendado_amanha.length, cls: "bg-info/10 text-info border-info/30" },
            { key: "agendado_hoje", label: "Agend. Hoje", count: followupsByCategory.agendado_hoje.length, cls: "bg-success/10 text-success border-success/30" },
            { key: "agendado_atrasado", label: "Atrasados", count: followupsByCategory.agendado_atrasado.length, cls: "bg-destructive/10 text-destructive border-destructive/30" },
            { key: "dispensado", label: "Dispensados", count: followupsByCategory.dispensado.length, cls: "bg-warning/10 text-warning border-warning/30" },
          ].map((cat) => (
            <Badge
              key={cat.key ?? "all"}
              variant="outline"
              className={`cursor-pointer transition-all ${cat.cls} ${fupCategoryFilter === cat.key ? "ring-2 ring-ring ring-offset-1 scale-105 font-bold" : "opacity-80 hover:opacity-100"}`}
              onClick={() => setFupCategoryFilter(fupCategoryFilter === cat.key ? null : cat.key)}
            >
              {cat.label}: {cat.count}
            </Badge>
          ))}
        </div>

        <div className="space-y-2">
          {fupPagination.paginatedItems.map((evento) => {
            const lead = getLead(evento.id_lead);
            const canMarkLoss = lead && ["na_loja", "dispensado", "confirmado"].includes(lead.etapa) && lead.etapa !== "perdido";
            const canEncerrar = lead && !lead.fup_concluido;
            const etapa = lead ? ETAPAS_FUNIL.find((e) => e.id === lead.etapa) : null;
            const leadFups = eventos.filter((e) => e.tipo === "followup" && e.id_lead === evento.id_lead);
            const done = leadFups.filter((e) => e.concluido).length;

            return (
              <div
                key={evento.id}
                className={`flex items-center gap-3 p-3 rounded-xl bg-card border transition-all ${
                  isOverdue(evento.data_prevista) ? "border-destructive/30" : "border-border"
                } hover:bg-muted/50`}
              >
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => openLeadDetail(evento.id_lead)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{getLeadName(evento.id_lead)}</span>
                    <Badge variant="outline" className={`text-xs ${lead ? getStatusBadgeClass(lead.etapa) : ""}`}>
                      {etapa?.label || lead?.etapa || "—"}
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                      FUP {evento.numero}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">{done} feitos</Badge>
                    {isOverdue(evento.data_prevista) && (
                      <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                        <AlertCircle className="h-3 w-3 mr-1" /> Atrasado
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1"><PhoneIcon className="h-3 w-3" />{lead ? formatPhone(lead.telefone) : "—"}</span>
                    <span>Previsto: {formatDateBR(evento.data_prevista)}</span>
                    {evento.descricao && <span className="italic">"{evento.descricao}"</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
          {lead && ["na_loja", "dispensado", "confirmado"].includes(lead.etapa) && lead.etapa !== "perdido" && lead.etapa !== "analise_supervisor" && (
                    <Button
                      size="sm" variant="outline"
                      onClick={(e) => { e.stopPropagation(); setLossLead(lead!); setLossMotivo(""); setLossOpen(true); }}
                      className="gap-1 text-xs text-warning border-warning/30 hover:bg-warning/10"
                      title="Enviar para Análise"
                    >
                      <AlertCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canEncerrar && (
                    <Button
                      size="sm" variant="outline"
                      onClick={(e) => { e.stopPropagation(); setConcludeProcessLead(lead!); setConcludeProcessMotivo(""); setConcludeProcessOpen(true); }}
                      className="gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      title="Encerrar Follow-up"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Encerrar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setSelectedEvento(evento); setDescricao(""); setConcludeOpen(true); }}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
                  </Button>
                </div>
              </div>
            );
          })}
          {allPendingFollowups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum follow-up pendente. 🎉</p>
          )}
        </div>

        <TablePagination
          currentPage={fupPagination.currentPage} totalPages={fupPagination.totalPages}
          totalItems={fupPagination.totalItems} pageSize={fupPagination.pageSize}
          onPageChange={fupPagination.goToPage} hasNextPage={fupPagination.hasNextPage} hasPrevPage={fupPagination.hasPrevPage}
        />
      </div>

      {/* Concluded — collapsible */}
      <Accordion type="single" collapsible>
        <AccordionItem value="concluded" className="rounded-xl border border-border bg-card">
          <AccordionTrigger className="px-5 py-4 hover:no-underline">
            <span className="flex items-center gap-2 text-lg font-semibold">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Concluídos ({concluidos.length})
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 space-y-2">
            {concludedPagination.paginatedItems.map((evento) => renderEventCard(evento, true))}
            {concluidos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento concluído.</p>
            )}
            <TablePagination
              currentPage={concludedPagination.currentPage} totalPages={concludedPagination.totalPages}
              totalItems={concludedPagination.totalItems} pageSize={concludedPagination.pageSize}
              onPageChange={concludedPagination.goToPage} hasNextPage={concludedPagination.hasNextPage} hasPrevPage={concludedPagination.hasPrevPage}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Conclude event modal */}
      <Dialog open={concludeOpen} onOpenChange={setConcludeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Concluir {selectedEvento?.tipo === "lembrete" ? "Lembrete" : `Follow-up ${selectedEvento?.numero}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cliente: <strong>{selectedEvento ? getLeadName(selectedEvento.id_lead) : ""}</strong>
            </p>
            <div>
              <Label>Descrição do contato</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o que foi conversado com o cliente..."
                className="mt-1"
                rows={4}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && descricao.trim()) { e.preventDefault(); handleConclude(); }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConcludeOpen(false)}>Cancelar</Button>
            <Button onClick={handleConclude} disabled={!descricao.trim() || concludingRef.current}>Concluir Evento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conclude FUP Process modal */}
      <Dialog open={concludeProcessOpen} onOpenChange={(v) => { if (!v) setConcludeProcessMotivo(""); setConcludeProcessOpen(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-primary" />
              Encerrar Follow-up
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cliente: <strong>{concludeProcessLead?.nome}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Ao encerrar, nenhum novo follow-up será gerado para este cliente.
            </p>
            <div>
              <Label>Motivo do encerramento</Label>
              <Textarea
                value={concludeProcessMotivo}
                onChange={(e) => setConcludeProcessMotivo(e.target.value)}
                placeholder="Ex: Cliente fez serviço em outro lugar, não tem mais interesse..."
                className="mt-1"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && concludeProcessMotivo.trim()) { e.preventDefault(); handleConcludeProcess(); }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConcludeProcessMotivo(""); setConcludeProcessOpen(false); }}>Cancelar</Button>
            <Button onClick={handleConcludeProcess} disabled={!concludeProcessMotivo.trim() || concludingProcessRef.current} className="gap-2">
              <XCircle className="h-4 w-4" /> Encerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send to Supervisor Analysis modal */}
      <Dialog open={lossOpen} onOpenChange={(v) => { if (!v) { setLossMotivo(""); setLossTags([]); } setLossOpen(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Enviar para Análise do Supervisor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cliente: <strong>{lossLead?.nome}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              O lead será enviado para análise do supervisor, que decidirá se é perda ou desqualificação.
            </p>
            <div>
              <Label className="text-xs font-semibold">Tags de Motivo</Label>
              <div className="mt-1.5">
                <MotivoTagSelector
                  tags={TAGS_MOTIVO_OS}
                  selected={lossTags}
                  onToggle={(tag) => setLossTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                />
              </div>
            </div>
            <div>
              <Label>Motivo do envio para análise</Label>
              <Textarea
                value={lossMotivo}
                onChange={(e) => setLossMotivo(e.target.value)}
                placeholder="Ex: Cliente fez serviço em concorrente, não tem mais interesse..."
                className="mt-1"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && (lossMotivo.trim() || lossTags.length > 0)) { e.preventDefault(); handleMarkLoss(); }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLossMotivo(""); setLossTags([]); setLossOpen(false); }}>Cancelar</Button>
            <Button onClick={handleMarkLoss} disabled={(!lossMotivo.trim() && lossTags.length === 0) || markingLossRef.current} className="gap-2 bg-warning text-warning-foreground hover:bg-warning/90">
              <AlertCircle className="h-4 w-4" /> Enviar para Análise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create event modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Novo Evento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Select value={newLeadId} onValueChange={setNewLeadId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {myLeads.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Prevista</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} min={today} className="mt-1" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={newDescricao} onChange={(e) => setNewDescricao(e.target.value)} placeholder="Ex: Retornar ligação..." className="mt-1" rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && newDescricao.trim() && newLeadId && newDate) { e.preventDefault(); handleCreate(); }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newLeadId || !newDate || !newDescricao.trim() || creatingRef.current} className="gap-2">
              <Plus className="h-4 w-4" /> Criar Evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};
