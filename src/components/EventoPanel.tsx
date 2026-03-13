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
import { CheckCircle2, Clock, AlertCircle, Plus, CalendarPlus, StickyNote, Phone as PhoneIcon, CalendarCheck, UserX, Flag } from "lucide-react";
import { Evento, Lead } from "@/data/mockData";
import { formatDateBR } from "@/lib/leadUtils";
import { appendNota } from "@/lib/notasUtils";

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

  const [createOpen, setCreateOpen] = useState(false);
  const [newLeadId, setNewLeadId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newDescricao, setNewDescricao] = useState("");

  const [concludeProcessOpen, setConcludeProcessOpen] = useState(false);
  const [concludeProcessLead, setConcludeProcessLead] = useState<Lead | null>(null);
  const [concludeProcessMotivo, setConcludeProcessMotivo] = useState("");

  const myLeads = useMemo(
    () => leads.filter((l) => l.id_agente === currentUser.id),
    [leads, currentUser.id]
  );

  const myLeadIds = useMemo(() => new Set(myLeads.map((l) => l.id)), [myLeads]);

  const myEvents = useMemo(() => {
    return eventos
      .filter((e) => myLeadIds.has(e.id_lead))
      .sort((a, b) => {
        if (a.concluido !== b.concluido) return a.concluido ? 1 : -1;
        return a.data_prevista.localeCompare(b.data_prevista);
      });
  }, [eventos, myLeadIds]);

  const today = new Date().toISOString().split("T")[0];

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
      return "agendado_futuro";
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
      agendado_futuro: [],
      other: [],
    };
    followups.forEach((e) => {
      const cat = categorizeFollowup(e);
      cats[cat].push(e);
    });
    return cats;
  }, [followups, myLeads, today]);

  const handleConclude = async () => {
    if (!selectedEvento || !descricao.trim() || concludingRef.current) return;
    concludingRef.current = true;
    try {
      // Append to lead notes
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
      // Append to lead notes
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
      const notas = appendNota(lead.notas, "Processo FUP Concluído", concludeProcessMotivo.trim());
      await updateLead(lead.id, {
        fup_concluido: true,
        fup_concluido_em: new Date().toISOString(),
        fup_concluido_numero: maxFup,
        fup_motivo_conclusao: concludeProcessMotivo.trim(),
        notas,
      });
      setConcludeProcessOpen(false);
      setConcludeProcessMotivo("");
      setConcludeProcessLead(null);
    } finally {
      concludingProcessRef.current = false;
    }
  };

  // Leads with active FUP processes (not concluded)
  const leadsWithActiveFup = useMemo(() => {
    const fupLeadIds = new Set(eventos.filter((e) => e.tipo === "followup").map((e) => e.id_lead));
    return myLeads.filter((l) => fupLeadIds.has(l.id) && !l.fup_concluido);
  }, [eventos, myLeads]);

  const getLeadName = (leadId: string) => leads.find((l) => l.id === leadId)?.nome || "";
  const getLead = (leadId: string) => leads.find((l) => l.id === leadId) || null;
  const isOverdue = (dataPrevista: string) => dataPrevista < today;

  const openLeadDetail = (leadId: string) => {
    const lead = getLead(leadId);
    if (lead) { setDetailLead(lead); setDetailOpen(true); }
  };

  const renderEventCard = (evento: Evento, concluded = false) => (
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
  );

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
      {renderSection("Ligar — Dispensados", <UserX className="h-4 w-4 text-warning" />, followupsByCategory.dispensado)}
      {renderSection("Follow-ups — Agendados Futuros", <CalendarPlus className="h-4 w-4 text-muted-foreground" />, followupsByCategory.agendado_futuro)}
      {renderSection("Outros Follow-ups", <Clock className="h-4 w-4 text-muted-foreground" />, followupsByCategory.other)}

      {/* Concluir Processo FUP section */}
      {leadsWithActiveFup.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-muted-foreground">
            <Flag className="h-4 w-4 text-primary" /> Concluir Processo de Follow-up ({leadsWithActiveFup.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-2 pl-6">Conclua o processo antes dos 7 FUPs se o cliente não vai mais retornar.</p>
          <div className="space-y-2">
            {leadsWithActiveFup.map((lead) => {
              const fups = eventos.filter((e) => e.tipo === "followup" && e.id_lead === lead.id);
              const done = fups.filter((e) => e.concluido).length;
              const total = fups.length;
              const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
              return (
                <div key={lead.id} className="flex items-center gap-4 p-3 rounded-xl bg-card border border-border">
                  <div className="flex-1 cursor-pointer hover:underline" onClick={() => openLeadDetail(lead.id)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{lead.nome}</span>
                      <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(lead.etapa)}`}>{etapa?.label || lead.etapa}</Badge>
                      <Badge variant="secondary" className="text-xs">{done}/{total} FUPs</Badge>
                    </div>
                  </div>
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
                    <Flag className="h-3 w-3" /> Concluir Processo
                  </Button>
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

      {/* Conclude FUP Process modal */}
      <Dialog open={concludeProcessOpen} onOpenChange={(v) => { if (!v) setConcludeProcessMotivo(""); setConcludeProcessOpen(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-primary" />
              Concluir Processo de Follow-up
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cliente: <strong>{concludeProcessLead?.nome}</strong>
            </p>
            <p className="text-xs text-muted-foreground">
              Ao concluir o processo, nenhum novo follow-up será gerado para este cliente.
            </p>
            <div>
              <Label>Motivo da conclusão</Label>
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
              <Flag className="h-4 w-4" /> Concluir Processo
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
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {myLeads.map((lead) => <SelectItem key={lead.id} value={lead.id}>{lead.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data prevista</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} min={today} className="mt-1" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={newDescricao}
                onChange={(e) => setNewDescricao(e.target.value)}
                placeholder="Ex: Ligar para o cliente para confirmar interesse..."
                className="mt-1"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && newLeadId && newDate && newDescricao.trim()) { e.preventDefault(); handleCreate(); }
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
