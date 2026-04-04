import { useState, useEffect, useRef, useMemo } from "react";
import { formatDateBR } from "@/lib/leadUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Lead, ETAPAS_FUNIL, ORIGENS, SERVICOS_TAGS } from "@/data/mockData";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { ScheduleModal } from "./ScheduleModal";
import { Phone, MapPin, Calendar, FileText, User, Tag, Pencil, CalendarCheck, X, Check, Ban, StickyNote, CalendarPlus, ArrowLeftRight, Skull, AlertCircle } from "lucide-react";
import { formatPhone, maskPhoneInput } from "@/lib/phoneUtils";
import { appendNota } from "@/lib/notasUtils";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// Supervisor can change to ANY status
const ALL_STATUSES = ETAPAS_FUNIL.map((e) => ({ id: e.id, label: e.label }));

const STATUS_TRANSITIONS: Record<string, { label: string; targets: { id: string; label: string }[] }> = {
  agendado: { label: "Agendado", targets: [{ id: "novo", label: "Novo Lead" }] },
  reagendado: { label: "Reagendado", targets: [{ id: "novo", label: "Novo Lead" }] },
  desqualificado_novo: { label: "Desqualificado (Novo)", targets: [{ id: "novo", label: "Novo Lead" }] },
  desqualificado_agendado: { label: "Desqualificado (Agendado)", targets: [{ id: "novo", label: "Novo Lead" }, { id: "agendado", label: "Agendado" }] },
  dispensado: { label: "Dispensado", targets: [{ id: "novo", label: "Novo Lead" }, { id: "agendado", label: "Agendado" }] },
  perdido: { label: "Perdido", targets: [{ id: "novo", label: "Novo Lead" }, { id: "agendado", label: "Agendado" }] },
};

export const LeadDetailSheet = ({ lead, open, onOpenChange }: Props) => {
  const { updateLead, addEvento, unidades, profiles, eventos } = useLeads();
  const { currentUser } = useRole();
  const [editing, setEditing] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [disqualifyOpen, setDisqualifyOpen] = useState(false);
  const [disqualifyMotivo, setDisqualifyMotivo] = useState("");
  const [disqualifyOutraCidade, setDisqualifyOutraCidade] = useState(false);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [lossOpen, setLossOpen] = useState(false);
  const [lossMotivo, setLossMotivo] = useState("");
  const markingLossRef = useRef(false);

  const [editNome, setEditNome] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editOrigem, setEditOrigem] = useState("");
  const [editUnidade, setEditUnidade] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editNumeroOs, setEditNumeroOs] = useState("");
  const [editDataAgendamento, setEditDataAgendamento] = useState("");

  const [editSchedDataAgendamento, setEditSchedDataAgendamento] = useState("");
  const [editSchedNumeroOs, setEditSchedNumeroOs] = useState("");
  const [editSchedUnidade, setEditSchedUnidade] = useState("");

  const [newNota, setNewNota] = useState("");

  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [eventDescricao, setEventDescricao] = useState("");
  const creatingEventRef = useRef(false);

  const isSupervisorOrGestor = currentUser?.cargo === "supervisor" || currentUser?.cargo === "gestor";

  useEffect(() => {
    setEditing(false);
    setEditingSchedule(false);
    setScheduleOpen(false);
    setDisqualifyOpen(false);
    setDisqualifyMotivo("");
    setDisqualifyOutraCidade(false);
    setNewNota("");
    setCreateEventOpen(false);
    setEventDate("");
    setEventDescricao("");
    setStatusChangeOpen(false);
    setLossOpen(false);
    setLossMotivo("");
    creatingEventRef.current = false;
    markingLossRef.current = false;
  }, [lead?.id]);

  const timeline = useMemo(() => {
    if (!lead) return [];
    const entries: { date: string; label: string; text: string }[] = [];
    const leadEventos = eventos.filter((e) => e.id_lead === lead.id);
    leadEventos.forEach((ev) => {
      if (ev.concluido && ev.descricao_conclusao) {
        const typeLabel = ev.tipo === "lembrete" ? "Lembrete" : `Follow-up ${ev.numero}`;
        entries.push({
          date: ev.data_conclusao ? new Date(ev.data_conclusao).toLocaleDateString("pt-BR") : "",
          label: `${typeLabel} Concluído`,
          text: ev.descricao_conclusao,
        });
      }
    });
    return entries;
  }, [lead, eventos]);

  if (!lead) return null;

  const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
  const unidade = unidades.find((u) => u.id === lead.id_unidade);
  const agente = profiles.find((u) => u.id === lead.id_agente);
  const todayStr = new Date().toISOString().split("T")[0];

  const startEdit = () => {
    setEditNome(lead.nome);
    setEditTelefone(lead.telefone);
    setEditOrigem(lead.origem);
    setEditUnidade(lead.id_unidade || "");
    setEditTags(lead.tags_servico || []);
    setEditNumeroOs(lead.numero_os || "");
    setEditDataAgendamento(lead.data_agendamento || "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    const updates: Partial<Lead> = {};
    if (editNome !== lead.nome) updates.nome = editNome;
    if (editTelefone !== lead.telefone) updates.telefone = formatPhone(editTelefone);
    if (editOrigem !== lead.origem) updates.origem = editOrigem;
    if (editUnidade !== (lead.id_unidade || "")) updates.id_unidade = editUnidade || undefined;
    if (editNumeroOs !== (lead.numero_os || "")) updates.numero_os = editNumeroOs || null;
    if (editDataAgendamento !== (lead.data_agendamento || "")) updates.data_agendamento = editDataAgendamento || null;
    const currentTags = lead.tags_servico || [];
    if (JSON.stringify(editTags.sort()) !== JSON.stringify([...currentTags].sort())) updates.tags_servico = editTags;

    if (Object.keys(updates).length > 0) {
      await updateLead(lead.id, updates);
    }
    setEditing(false);
  };

  const startEditSchedule = () => {
    setEditSchedDataAgendamento(lead.data_agendamento || "");
    setEditSchedNumeroOs(lead.numero_os || "");
    setEditSchedUnidade(lead.id_unidade || "");
    setEditingSchedule(true);
  };

  const saveScheduleEdit = async () => {
    const updates: Partial<Lead> = {};
    if (editSchedDataAgendamento !== (lead.data_agendamento || "")) updates.data_agendamento = editSchedDataAgendamento;
    if (editSchedNumeroOs !== (lead.numero_os || "")) updates.numero_os = editSchedNumeroOs;
    if (editSchedUnidade !== (lead.id_unidade || "")) updates.id_unidade = editSchedUnidade;

    if (["dispensado", "perdido", "desqualificado_agendado"].includes(lead.etapa)) updates.etapa = "reagendado";

    if (Object.keys(updates).length > 0) {
      const unidadeNome = editSchedUnidade
        ? unidades.find((u) => u.id === editSchedUnidade)?.nome || "Unidade"
        : "Unidade";
      const isReagendamento = updates.etapa === "reagendado";
      const notaLabel = isReagendamento ? "Reagendado" : "Agendamento Atualizado";
      const detalhes = [
        `Data: ${editSchedDataAgendamento ? formatDateBR(editSchedDataAgendamento) : "—"}`,
        `Unidade: ${unidadeNome}`,
        `OS: ${editSchedNumeroOs || "—"}`,
      ].join(" • ");
      updates.notas = appendNota(lead.notas, notaLabel, detalhes);
    }

    if (Object.keys(updates).length > 0) {
      await updateLead(lead.id, updates);
    }
    setEditingSchedule(false);
  };

  const toggleTag = (tag: string) => {
    setEditTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const canSchedule = lead.etapa === "novo";
  const isAgendado = ["agendado", "reagendado"].includes(lead.etapa);
  const isDispensado = lead.etapa === "dispensado";
  const isPerdido = lead.etapa === "perdido";
  const isDesqAgendado = lead.etapa === "desqualificado_agendado";
  const canEditSchedule = isAgendado || isDispensado || isPerdido || isDesqAgendado;
  const canDisqualify = ["novo", "agendado", "reagendado"].includes(lead.etapa);
  // Supervisor/Gestor can always change status; agents can only use transitions
  const canChangeStatus = isSupervisorOrGestor || !!STATUS_TRANSITIONS[lead.etapa];
  const canMarkLoss = ["na_loja", "dispensado", "confirmado"].includes(lead.etapa);

  const getDisqualifyStatus = () => {
    if (lead.etapa === "novo") return "desqualificado_novo";
    return "desqualificado_agendado";
  };

  const handleDisqualify = async () => {
    if (!disqualifyMotivo.trim()) return;
    const status = getDisqualifyStatus();
    const label = status === "desqualificado_novo" ? "Desqualificado (Novo)" : "Desqualificado (Agendado)";
    let motivo = disqualifyMotivo.trim();
    if (disqualifyOutraCidade) motivo = `[Outra Cidade] ${motivo}`;
    const notas = appendNota(lead.notas, label, motivo);
    await updateLead(lead.id, { etapa: status, notas });
    setDisqualifyMotivo("");
    setDisqualifyOutraCidade(false);
    setDisqualifyOpen(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    const oldLabel = etapa?.label || lead.etapa;
    const newLabel = ETAPAS_FUNIL.find((e) => e.id === newStatus)?.label || newStatus;
    const notas = appendNota(lead.notas, "Mudança de Status", `${oldLabel} → ${newLabel}`);
    const updates: Partial<Lead> = { etapa: newStatus, notas };
    if (newStatus === "novo") {
      updates.data_agendamento = null;
      updates.numero_os = null;
      updates.checkin = null;
      updates.checkout = null;
    }
    await updateLead(lead.id, updates);
    setStatusChangeOpen(false);
  };

  const handleMarkLoss = async () => {
    if (!lossMotivo.trim() || markingLossRef.current) return;
    markingLossRef.current = true;
    try {
      if (isSupervisorOrGestor) {
        const notas = appendNota(lead.notas, "Marcado como Perda", lossMotivo.trim());
        await updateLead(lead.id, { etapa: "perdido", notas });
      } else {
        const notas = appendNota(lead.notas, "Enviado para Análise do Supervisor", lossMotivo.trim());
        await updateLead(lead.id, { etapa: "analise_supervisor", notas });
      }
      setLossOpen(false);
      setLossMotivo("");
    } finally {
      markingLossRef.current = false;
    }
  };

  const handleAddNota = async () => {
    if (!newNota.trim()) return;
    const userName = currentUser?.nome || "Sistema";
    const notas = appendNota(lead.notas, userName, newNota.trim());
    await updateLead(lead.id, { notas });
    setNewNota("");
  };

  const handleCreateEvent = async () => {
    if (!eventDate || !eventDescricao.trim() || creatingEventRef.current) return;
    creatingEventRef.current = true;
    try {
      const notas = appendNota(lead.notas, "Evento Criado", eventDescricao.trim());
      await Promise.all([
        addEvento({
          id_lead: lead.id,
          tipo: "lembrete",
          numero: 0,
          data_prevista: eventDate,
          concluido: false,
          id_usuario: currentUser.id,
          descricao: eventDescricao.trim(),
        }),
        updateLead(lead.id, { notas }),
      ]);
      setCreateEventOpen(false);
      setEventDate("");
      setEventDescricao("");
    } finally {
      creatingEventRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void, disabled?: boolean) => {
    if (e.key === "Enter" && !e.shiftKey && !disabled) {
      e.preventDefault();
      action();
    }
  };

  const isEditMode = editing || editingSchedule;

  // Get available status targets based on role
  const statusTargets = isSupervisorOrGestor
    ? ALL_STATUSES.filter((s) => s.id !== lead.etapa) // Supervisor can pick any status
    : STATUS_TRANSITIONS[lead.etapa]?.targets || [];

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) { setEditing(false); setEditingSchedule(false); } onOpenChange(v); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{editing ? "Editar Ficha" : editingSchedule ? "Editar Agendamento" : "Ficha do Cliente"}</span>
              {!isEditMode && (
                <div className="flex items-center gap-1">
                  {canChangeStatus && (
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setStatusChangeOpen(true)} title="Alterar Status">
                      <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={startEdit} title="Editar ficha">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {canMarkLoss && (
                    <Button variant="outline" size="icon" className="h-8 w-8 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { setLossMotivo(""); setLossOpen(true); }} title="Marcar como Perda">
                      <Skull className="h-4 w-4" />
                    </Button>
                  )}
                  {canDisqualify && (
                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setDisqualifyOpen(true)} title="Desqualificar">
                      <Ban className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {editing ? (
              <div className="space-y-4" onKeyDown={(e) => handleKeyDown(e, saveEdit, !editNome || !editTelefone)}>
                <div>
                  <Label>Nome</Label>
                  <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={editTelefone} onChange={(e) => setEditTelefone(maskPhoneInput(e.target.value))} placeholder="(00) 99999-9999" className="mt-1" />
                </div>
                <div>
                  <Label>Origem</Label>
                  <Select value={editOrigem} onValueChange={setEditOrigem}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORIGENS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cidade / Unidade</Label>
                  <Select value={editUnidade} onValueChange={setEditUnidade}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Número da OS</Label>
                  <Input value={editNumeroOs} onChange={(e) => setEditNumeroOs(e.target.value)} placeholder="OS-2024-XXX" className="mt-1" />
                </div>
                <div>
                  <Label>Data do Agendamento</Label>
                  <Input type="date" value={editDataAgendamento} onChange={(e) => setEditDataAgendamento(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Tags de Serviço</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SERVICOS_TAGS.map((tag) => (
                      <Badge key={tag} variant={editTags.includes(tag) ? "default" : "outline"} className="cursor-pointer text-xs py-1 px-3" onClick={() => toggleTag(tag)}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={cancelEdit} className="gap-2">
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={saveEdit} disabled={!editNome || !editTelefone} className="gap-2">
                    <Check className="h-4 w-4" /> Salvar
                  </Button>
                </div>
              </div>
            ) : editingSchedule ? (
              <div className="space-y-4" onKeyDown={(e) => handleKeyDown(e, saveScheduleEdit, !editSchedDataAgendamento || !editSchedNumeroOs || !editSchedUnidade)}>
                <div>
                  <Label>Unidade / Cidade</Label>
                  <Select value={editSchedUnidade} onValueChange={setEditSchedUnidade}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data do Agendamento</Label>
                  <Input type="date" value={editSchedDataAgendamento} onChange={(e) => setEditSchedDataAgendamento(e.target.value)} min={todayStr} className="mt-1" />
                </div>
                <div>
                  <Label>Número da OS</Label>
                  <Input value={editSchedNumeroOs} onChange={(e) => setEditSchedNumeroOs(e.target.value)} placeholder="OS-2024-XXX" className="mt-1" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingSchedule(false)} className="gap-2">
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={saveScheduleEdit} disabled={!editSchedDataAgendamento || !editSchedNumeroOs || !editSchedUnidade} className="gap-2">
                    <Check className="h-4 w-4" /> Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="font-semibold text-base">{lead.nome}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{formatPhone(lead.telefone)}</span>
                  </div>
                  {unidade && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>{unidade.nome}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Tag className="h-4 w-4 shrink-0" />
                    <span>{lead.origem}</span>
                  </div>
                  {lead.numero_os && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span>OS: {lead.numero_os}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <span>Criado: {formatDateBR(lead.data_entrada)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-8">
                    Agente: {agente?.nome || "—"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant={lead.etapa === "novo" ? "secondary" : ["dispensado", "perdido", "desqualificado_novo", "desqualificado_agendado", "desqualificado"].includes(lead.etapa) ? "destructive" : "default"}>
                    {etapa?.label || lead.etapa}
                  </Badge>
                  {lead.is_porta && <Badge variant="outline">Porta</Badge>}
                  {lead.fup_concluido && (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                      FUP Concluído {lead.fup_concluido_numero ? `(F${lead.fup_concluido_numero})` : ""}
                    </Badge>
                  )}
                  {lead.data_agendamento && (
                    <Badge variant="outline" className="gap-1">
                      <CalendarCheck className="h-3 w-3" />
                      {formatDateBR(lead.data_agendamento)}
                    </Badge>
                  )}
                </div>

                {lead.fup_motivo_conclusao && (
                  <p className="text-xs text-muted-foreground italic bg-success/5 rounded-md p-2">
                    Motivo conclusão FUP: "{lead.fup_motivo_conclusao}"
                  </p>
                )}

                {lead.tags_servico && lead.tags_servico.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {lead.tags_servico.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}

                {/* Notas + Timeline section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-semibold">Notas & Histórico</Label>
                  </div>

                  {timeline.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      {timeline.map((entry, i) => (
                        <div key={i} className="text-xs bg-primary/5 rounded-md p-2 border border-primary/10">
                          <span className="font-medium text-primary">{entry.label}</span>
                          {entry.date && <span className="text-muted-foreground ml-1">({entry.date})</span>}
                          <p className="text-foreground/80 mt-0.5">{entry.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {lead.notas && (
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-md p-3 max-h-40 overflow-y-auto font-sans">
                      {lead.notas}
                    </pre>
                  )}
                  <div className="flex gap-2">
                    <Textarea
                      value={newNota}
                      onChange={(e) => setNewNota(e.target.value)}
                      placeholder="Adicionar nota..."
                      rows={2}
                      className="text-sm"
                      onKeyDown={(e) => handleKeyDown(e, handleAddNota, !newNota.trim())}
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={handleAddNota} disabled={!newNota.trim()} className="gap-2">
                    <Check className="h-3 w-3" /> Adicionar Nota
                  </Button>
                </div>

                {/* Create event button */}
                {!createEventOpen ? (
                  <Button variant="outline" size="sm" onClick={() => { setCreateEventOpen(true); setEventDate(""); setEventDescricao(""); }} className="w-full gap-2">
                    <CalendarPlus className="h-4 w-4" /> Criar Evento / Lembrete
                  </Button>
                ) : (
                  <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                    <p className="text-sm font-semibold flex items-center gap-2"><CalendarPlus className="h-4 w-4 text-primary" /> Novo Evento</p>
                    <div>
                      <Label>Data prevista</Label>
                      <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} min={todayStr} className="mt-1" />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={eventDescricao}
                        onChange={(e) => setEventDescricao(e.target.value)}
                        placeholder="Ex: Ligar para confirmar interesse..."
                        rows={2}
                        className="mt-1 text-sm"
                        onKeyDown={(e) => handleKeyDown(e, handleCreateEvent, !eventDate || !eventDescricao.trim())}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCreateEventOpen(false)}>Cancelar</Button>
                      <Button size="sm" onClick={handleCreateEvent} disabled={!eventDate || !eventDescricao.trim() || creatingEventRef.current} className="gap-2">
                        <Check className="h-3 w-3" /> Criar
                      </Button>
                    </div>
                  </div>
                )}

                {canSchedule && (
                  <Button size="lg" className="w-full gap-2 text-base" onClick={() => setScheduleOpen(true)}>
                    <CalendarCheck className="h-5 w-5" /> Concluir Agendamento
                  </Button>
                )}

                {canEditSchedule && (
                  <Button size="lg" variant="outline" className="w-full gap-2 text-base" onClick={startEditSchedule}>
                    <Calendar className="h-5 w-5" /> {isDispensado || isPerdido || isDesqAgendado ? "Reagendar Cliente" : "Editar Agendamento"}
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {lead && (
        <ScheduleModal open={scheduleOpen} onOpenChange={setScheduleOpen} leadId={lead.id} leadNome={lead.nome} />
      )}

      {/* Disqualify modal */}
      <Dialog open={disqualifyOpen} onOpenChange={(v) => { if (!v) { setDisqualifyMotivo(""); setDisqualifyOutraCidade(false); } setDisqualifyOpen(v); }}>
        <DialogContent className="sm:max-w-md" onKeyDown={(e) => handleKeyDown(e, handleDisqualify, !disqualifyMotivo.trim())}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" /> Desqualificar Lead
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Informe o motivo da desqualificação de <strong>{lead?.nome}</strong>.
            </p>
            <Textarea value={disqualifyMotivo} onChange={(e) => setDisqualifyMotivo(e.target.value)} placeholder="Motivo da desqualificação..." rows={3} />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="outra-cidade"
                checked={disqualifyOutraCidade}
                onCheckedChange={(checked) => setDisqualifyOutraCidade(!!checked)}
              />
              <label htmlFor="outra-cidade" className="text-sm font-medium leading-none cursor-pointer">
                Outra Cidade
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDisqualifyMotivo(""); setDisqualifyOutraCidade(false); setDisqualifyOpen(false); }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDisqualify} disabled={!disqualifyMotivo.trim()}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Loss modal */}
      <Dialog open={lossOpen} onOpenChange={(v) => { if (!v) setLossMotivo(""); setLossOpen(v); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Skull className="h-5 w-5 text-destructive" /> Marcar como Perda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              O lead <strong>{lead?.nome}</strong> será marcado como "Perdido".
            </p>
            <div>
              <Label>Motivo da perda</Label>
              <Textarea
                value={lossMotivo}
                onChange={(e) => setLossMotivo(e.target.value)}
                placeholder="Ex: Fez serviço em concorrente, desistiu..."
                rows={3}
                className="mt-1"
                onKeyDown={(e) => handleKeyDown(e, handleMarkLoss, !lossMotivo.trim())}
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

      {/* Status change modal — Supervisor sees ALL statuses */}
      <Dialog open={statusChangeOpen} onOpenChange={setStatusChangeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" /> Alterar Status
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Status atual: <strong>{etapa?.label || lead.etapa}</strong>
            </p>
            <p className="text-sm text-muted-foreground">Mover para:</p>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {statusTargets.map((target) => (
                <Button key={target.id} variant="outline" className="justify-start gap-2" onClick={() => handleStatusChange(target.id)}>
                  {target.label}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
