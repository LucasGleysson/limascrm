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
import { Evento, Lead, ETAPAS_FUNIL } from "@/data/mockData";
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

  // Mark as loss state
  const [lossOpen, setLossOpen] = useState(false);
  const [lossLead, setLossLead] = useState<Lead | null>(null);
  const [lossMotivo, setLossMotivo] = useState("");

  // Search for follow-ups
  const [fupSearch, setFupSearch] = useState("");

  const myLeads = useMemo(
    () => leads.filter((l) => l.id_agente === currentUser.id),
    [leads, currentUser.id]
  );

  const today = new Date().toISOString().split("T")[0];

  const getEncerrarStatus = (lead: Lead): string => {
    if (["na_loja", "dispensado", "confirmado"].includes(lead.etapa)) return "perdido";
    if (["agendado", "reagendado"].includes(lead.etapa)) return "desqualificado_agendado";
    if (["novo", "desqualificado"].includes(lead.etapa)) return "desqualificado_novo";
    return lead.etapa;
  };

  const isLeadEligibleForFupToday = (lead: Lead): boolean => {
    if (lead.fup_concluido) return false;
    if (lead.etapa === "dispensado") return true;
    if (lead.etapa === "novo") return true;
    if (["agendado", "reagendado"].includes(lead.etapa)) {
      return !!lead.data_agendamento && lead.data_agendamento <= today;
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
  }, [eventos, myLeadIds, myLeads, today]);

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
      // FILTER OUT future appointments from follow-up list
      return "ignore";
    }
    if (["novo"].includes(lead.etapa)) return "novo";
    return "other";
  };

  const followupsByCategory = useMemo(() => {
    const cats: Record<string, Evento[]> = {
      novo: [],
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
  }, [followups, myLeads, today]);

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

  // Handle marking lead as loss ("perdido")
  const handleMarkLoss = async () => {
    if (!lossLead || !lossMotivo.trim() || markingLossRef.current) return;
    markingLossRef.current = true;
    try {
      const notas = appendNota(lossLead.notas, "Marcado como Perda", lossMotivo.trim());
      const fups = eventos.filter((e) => e.tipo === "followup" && e.id_lead === lossLead.id);
      const maxFup = fups.length > 0 ? Math.max(...fups.map((e) => e.numero)) : 0;
      await updateLead(lossLead.id, {
        etapa: "perdido",
        notas,
        fup_concluido: true,
        fup_concluido_em: new Date().toISOString(),
        fup_concluido_numero: maxFup,
        fup_motivo_conclusao: `Perda: ${lossMotivo.trim()}`,
      });
      setLossOpen(false);
      setLossMotivo("");
      setLossLead(null);
    } finally {
      markingLossRef.current = false;
    }
  };

  // Leads with active FUP processes (not concluded)
  const leadsWithActiveFup = useMemo(() => {
    const duePendingFupLeadIds = new Set(
      eventos
        .filter((e) => e.tipo === "followup" && !e.concluido && e.data_prevista <= today)
        .map((e) => e.id_lead)
    );
    return myLeads.filter((l) => duePendingFupLeadIds.has(l.id) && isLeadEligibleForFupToday(l));
  }, [eventos, myLeads, today]);

  // Leads eligible for "Mark as Loss" button (na_loja, dispensado, or in FUP process)
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
    const canMarkLoss = lead && ["na_loja", "dispensado", "confirmado"].includes(lead.etapa) && lead.etapa !== "perdido";

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
          {!concluded && canMarkLoss && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setLossLead(lead);
                setLossMotivo("");
                setLossOpen(true);
              }}
              className="gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              title="Marcar como Perda"
            >
              <Skull className="h-3.5 w-3.5" />
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
      {renderSection("Follow-ups — Novos Leads", <PhoneIcon className="h-4 w-4 text-primary" />, followupsByCategory.novo)}
      {renderSection("Follow-ups — Agendados de Hoje", <CalendarCheck className="h-4 w-4 text-success" />, followupsByCategory.agendado_hoje)}
      {renderSection("Follow-ups — Agendados que Não Foram", <AlertCircle className="h-4 w-4 text-destructive" />, followupsByCategory.agendado_atrasado)}
      {renderSection("Resgatar — Dispensados", <UserX className="h-4 w-4 text-warning" />, followupsByCategory.dispensado)}
      {renderSection("Outros Follow-ups", <Clock className="h-4 w-4 text-muted-foreground" />, followupsByCategory.other)}

      {/* Concluir Processo FUP section + Encerrar Follow-up */}
      {leadsWithActiveFup.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-muted-foreground">
            <Flag className="h-4 w-4 text-primary" /> Encerrar Follow-up / Concluir Processo ({leadsWithActiveFup.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-2 pl-6">Encerre o follow-up antes dos 7 FUPs ou marque como perda.</p>
          <div className="space-y-2">
            {leadsWithActiveFup.map((lead) => {
              const fups = eventos.filter((e) => e.tipo === "followup" && e.id_lead === lead.id);
              const done = fups.filter((e) => e.concluido).length;
              const total = fups.length;
              const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
              const canLoss = ["na_loja", "dispensado", "confirmado"].includes(lead.etapa);
              return (
                <div key={lead.id} className="flex items-center gap-4 p-3 rounded-xl bg-card border border-border">
                  <div className="flex-1 cursor-pointer hover:underline" onClick={() => openLeadDetail(lead.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{lead.nome}</span>
                      <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(lead.etapa)}`}>{etapa?.label || lead.etapa}</Badge>
                      <Badge variant="secondary" className="text-xs">{done}/{total} FUPs</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canLoss && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLossLead(lead);
                          setLossMotivo("");
                          setLossOpen(true);
                        }}
                        className="gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        <Skull className="h-3 w-3" /> Perda
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConcludeProcessLead(lead);
                        setConcludeProcessMotivo("");
                        setConcludeProcessOpen(true);
                      }}
                      className="gap-1 text-xs"
                    >
                      <XCircle className="h-3 w-3" /> Encerrar FUP
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pendentes.length === 0 && leadsWithActiveFup.length === 0 && (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhum evento pendente. 🎉</p>
      )}

      {concluidos.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" /> Concluídos ({concluidos.length})
          </h2>
          <div className="space-y-2">{concluidos.map((evento) => renderEventCard(evento, true))}</div>
        </div>
      )}

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

      {/* Conclude FUP Process / Encerrar Follow-up modal */}
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

      {/* Mark as Loss modal */}
      <Dialog open={lossOpen} onOpenChange={(v) => { if (!v) setLossMotivo(""); setLossOpen(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Skull className="h-5 w-5 text-destructive" />
              Marcar como Perda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cliente: <strong>{lossLead?.nome}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              O lead será marcado como "Perdido" e o processo de follow-up será encerrado.
            </p>
            <div>
              <Label>Motivo da perda</Label>
              <Textarea
                value={lossMotivo}
                onChange={(e) => setLossMotivo(e.target.value)}
                placeholder="Ex: Fez serviço em concorrente, desistiu..."
                className="mt-1"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && lossMotivo.trim()) { e.preventDefault(); handleMarkLoss(); }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLossMotivo(""); setLossOpen(false); }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleMarkLoss} disabled={!lossMotivo.trim() || markingLossRef.current} className="gap-2">
              <Skull className="h-4 w-4" /> Confirmar Perda
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
