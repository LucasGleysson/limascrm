import { useState, useEffect } from "react";
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
import { Phone, MapPin, Calendar, FileText, User, Tag, Pencil, CalendarCheck, X, Check, Ban, StickyNote } from "lucide-react";
import { formatPhone, maskPhoneInput } from "@/lib/phoneUtils";
import { appendNota } from "@/lib/notasUtils";

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const LeadDetailSheet = ({ lead, open, onOpenChange }: Props) => {
  const { updateLead, unidades, profiles } = useLeads();
  const { currentUser } = useRole();
  const [editing, setEditing] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [disqualifyOpen, setDisqualifyOpen] = useState(false);
  const [disqualifyMotivo, setDisqualifyMotivo] = useState("");

  const [editNome, setEditNome] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editOrigem, setEditOrigem] = useState("");
  const [editUnidade, setEditUnidade] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);

  const [editDataAgendamento, setEditDataAgendamento] = useState("");
  const [editNumeroOs, setEditNumeroOs] = useState("");
  const [editUnidadeAgendamento, setEditUnidadeAgendamento] = useState("");

  const [newNota, setNewNota] = useState("");

  // Reset all form state when the lead changes
  useEffect(() => {
    setEditing(false);
    setEditingSchedule(false);
    setScheduleOpen(false);
    setDisqualifyOpen(false);
    setDisqualifyMotivo("");
    setNewNota("");
  }, [lead?.id]);

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
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    const updates: Partial<Lead> = {};
    if (editNome !== lead.nome) updates.nome = editNome;
    if (editTelefone !== lead.telefone) updates.telefone = formatPhone(editTelefone);
    if (editOrigem !== lead.origem) updates.origem = editOrigem;
    if (editUnidade !== (lead.id_unidade || "")) updates.id_unidade = editUnidade || undefined;
    const currentTags = lead.tags_servico || [];
    if (JSON.stringify(editTags.sort()) !== JSON.stringify([...currentTags].sort())) updates.tags_servico = editTags;

    if (Object.keys(updates).length > 0) {
      await updateLead(lead.id, updates);
    }
    setEditing(false);
  };

  const startEditSchedule = () => {
    setEditDataAgendamento(lead.data_agendamento || "");
    setEditNumeroOs(lead.numero_os || "");
    setEditUnidadeAgendamento(lead.id_unidade || "");
    setEditingSchedule(true);
  };

  const saveScheduleEdit = async () => {
    const updates: Partial<Lead> = {};
    if (editDataAgendamento !== (lead.data_agendamento || "")) updates.data_agendamento = editDataAgendamento;
    if (editNumeroOs !== (lead.numero_os || "")) updates.numero_os = editNumeroOs;
    if (editUnidadeAgendamento !== (lead.id_unidade || "")) updates.id_unidade = editUnidadeAgendamento;

    // Rescue: dispensado/perdido → reagendado
    if (["dispensado", "perdido"].includes(lead.etapa)) {
      updates.etapa = "reagendado";
    }
    // desqualificado_agendado can also be rescued
    if (lead.etapa === "desqualificado_agendado") {
      updates.etapa = "reagendado";
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

  // Smart disqualification: use correct status based on current etapa
  const getDisqualifyStatus = () => {
    if (lead.etapa === "novo") return "desqualificado_novo";
    return "desqualificado_agendado";
  };

  const handleDisqualify = async () => {
    if (!disqualifyMotivo.trim()) return;
    const status = getDisqualifyStatus();
    const label = status === "desqualificado_novo" ? "Desqualificado (Novo)" : "Desqualificado (Agendado)";
    const notas = appendNota(lead.notas, label, disqualifyMotivo.trim());
    await updateLead(lead.id, { etapa: status, notas });
    setDisqualifyMotivo("");
    setDisqualifyOpen(false);
  };

  const handleAddNota = async () => {
    if (!newNota.trim()) return;
    const userName = currentUser?.nome || "Sistema";
    const notas = appendNota(lead.notas, userName, newNota.trim());
    await updateLead(lead.id, { notas });
    setNewNota("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void, disabled?: boolean) => {
    if (e.key === "Enter" && !e.shiftKey && !disabled) {
      e.preventDefault();
      action();
    }
  };

  const isEditMode = editing || editingSchedule;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) { setEditing(false); setEditingSchedule(false); } onOpenChange(v); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{editing ? "Editar Ficha" : editingSchedule ? "Editar Agendamento" : "Ficha do Cliente"}</span>
              {!isEditMode && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={startEdit} title="Editar ficha">
                    <Pencil className="h-4 w-4" />
                  </Button>
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
                      {ORIGENS.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cidade / Unidade</Label>
                  <Select value={editUnidade} onValueChange={setEditUnidade}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {unidades.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <div className="space-y-4" onKeyDown={(e) => handleKeyDown(e, saveScheduleEdit, !editDataAgendamento || !editNumeroOs || !editUnidadeAgendamento)}>
                <div>
                  <Label>Unidade / Cidade</Label>
                  <Select value={editUnidadeAgendamento} onValueChange={setEditUnidadeAgendamento}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {unidades.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data do Agendamento</Label>
                  <Input type="date" value={editDataAgendamento} onChange={(e) => setEditDataAgendamento(e.target.value)} min={todayStr} className="mt-1" />
                </div>
                <div>
                  <Label>Número da OS</Label>
                  <Input value={editNumeroOs} onChange={(e) => setEditNumeroOs(e.target.value)} placeholder="OS-2024-XXX" className="mt-1" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingSchedule(false)} className="gap-2">
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={saveScheduleEdit} disabled={!editDataAgendamento || !editNumeroOs || !editUnidadeAgendamento} className="gap-2">
                    <Check className="h-4 w-4" /> Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Client info */}
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

                {/* Status & tags */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={lead.etapa === "novo" ? "secondary" : ["dispensado", "perdido", "desqualificado_novo", "desqualificado_agendado", "desqualificado"].includes(lead.etapa) ? "destructive" : "default"}>
                    {etapa?.label || lead.etapa}
                  </Badge>
                  {lead.is_porta && <Badge variant="outline">Porta</Badge>}
                  {lead.data_agendamento && (
                    <Badge variant="outline" className="gap-1">
                      <CalendarCheck className="h-3 w-3" />
                      {formatDateBR(lead.data_agendamento)}
                    </Badge>
                  )}
                </div>

                {lead.tags_servico && lead.tags_servico.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {lead.tags_servico.map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}

                {/* Notas section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-semibold">Notas</Label>
                  </div>
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

      <Dialog open={disqualifyOpen} onOpenChange={(v) => { if (!v) setDisqualifyMotivo(""); setDisqualifyOpen(v); }}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDisqualifyMotivo(""); setDisqualifyOpen(false); }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDisqualify} disabled={!disqualifyMotivo.trim()}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
