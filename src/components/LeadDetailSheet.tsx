import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lead, UNIDADES, ETAPAS_FUNIL, MOCK_USUARIOS, ORIGENS, SERVICOS_TAGS } from "@/data/mockData";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { LeadTimeline } from "./LeadTimeline";
import { ScheduleModal } from "./ScheduleModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Phone, MapPin, Calendar, FileText, User, Tag, Pencil, CalendarCheck, X, Check, Ban } from "lucide-react";
import { formatPhone, maskPhoneInput } from "@/lib/phoneUtils";

const etapaBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  novo: "secondary",
  agendado: "default",
  confirmado: "default",
  na_loja: "default",
  concluido: "default",
  dispensado: "destructive",
  perdido: "destructive",
  desqualificado: "destructive",
};

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const LeadDetailSheet = ({ lead, open, onOpenChange }: Props) => {
  const { updateLead, addInteracao } = useLeads();
  const { currentUser } = useRole();
  const [editing, setEditing] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [disqualifyOpen, setDisqualifyOpen] = useState(false);
  const [disqualifyMotivo, setDisqualifyMotivo] = useState("");

  // Edit form state
  const [editNome, setEditNome] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editOrigem, setEditOrigem] = useState("");
  const [editUnidade, setEditUnidade] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);

  // Schedule edit state
  const [editDataAgendamento, setEditDataAgendamento] = useState("");
  const [editNumeroOs, setEditNumeroOs] = useState("");
  const [editUnidadeAgendamento, setEditUnidadeAgendamento] = useState("");

  if (!lead) return null;

  const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
  const unidade = UNIDADES.find((u) => u.id === lead.id_unidade);
  const agente = MOCK_USUARIOS.find((u) => u.id === lead.id_agente);
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

  const saveEdit = () => {
    const updates: Partial<Lead> = {};
    if (editNome !== lead.nome) updates.nome = editNome;
    if (editTelefone !== lead.telefone) updates.telefone = formatPhone(editTelefone);
    if (editOrigem !== lead.origem) updates.origem = editOrigem;
    if (editUnidade !== (lead.id_unidade || "")) updates.id_unidade = editUnidade || undefined;
    const currentTags = lead.tags_servico || [];
    if (JSON.stringify(editTags.sort()) !== JSON.stringify([...currentTags].sort())) updates.tags_servico = editTags;

    if (Object.keys(updates).length > 0) {
      updateLead(lead.id, updates);
      addInteracao({
        id: `i${Date.now()}`,
        id_lead: lead.id,
        tipo: "nota",
        descricao: "Ficha do cliente editada",
        data: new Date().toISOString(),
        id_usuario: currentUser.id,
      });
    }
    setEditing(false);
  };

  const startEditSchedule = () => {
    setEditDataAgendamento(lead.data_agendamento || "");
    setEditNumeroOs(lead.numero_os || "");
    setEditUnidadeAgendamento(lead.id_unidade || "");
    setEditingSchedule(true);
  };

  const saveScheduleEdit = () => {
    const updates: Partial<Lead> = {};
    if (editDataAgendamento !== (lead.data_agendamento || "")) updates.data_agendamento = editDataAgendamento;
    if (editNumeroOs !== (lead.numero_os || "")) updates.numero_os = editNumeroOs;
    if (editUnidadeAgendamento !== (lead.id_unidade || "")) updates.id_unidade = editUnidadeAgendamento;

    // Rescue dispensado back to agendado
    if (lead.etapa === "dispensado") {
      updates.etapa = "agendado";
    }

    if (Object.keys(updates).length > 0) {
      updateLead(lead.id, updates);
      const desc = lead.etapa === "dispensado"
        ? "Reagendado (resgatado de dispensado)"
        : "Informações de agendamento editadas";
      addInteracao({
        id: `i${Date.now()}`,
        id_lead: lead.id,
        tipo: lead.etapa === "dispensado" ? "mudanca_etapa" : "nota",
        descricao: desc,
        data: new Date().toISOString(),
        id_usuario: currentUser.id,
      });
    }
    setEditingSchedule(false);
  };

  const toggleTag = (tag: string) => {
    setEditTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const canSchedule = lead.etapa === "novo";
  const isAgendado = lead.etapa === "agendado";
  const isDispensado = lead.etapa === "dispensado";
  const canEditSchedule = isAgendado || isDispensado;
  const canDisqualify = ["novo", "agendado"].includes(lead.etapa);

  const handleDisqualify = () => {
    if (!disqualifyMotivo.trim()) return;
    updateLead(lead.id, { etapa: "desqualificado" });
    addInteracao({
      id: `i${Date.now()}`,
      id_lead: lead.id,
      tipo: "mudanca_etapa",
      descricao: `Lead desqualificado: ${disqualifyMotivo.trim()}`,
      data: new Date().toISOString(),
      id_usuario: currentUser.id,
    });
    setDisqualifyMotivo("");
    setDisqualifyOpen(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) { setEditing(false); setEditingSchedule(false); } onOpenChange(v); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl">{editing ? "Editar Ficha" : editingSchedule ? "Editar Agendamento" : lead.nome}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-6">
            {editing ? (
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={editTelefone}
                    onChange={(e) => setEditTelefone(maskPhoneInput(e.target.value))}
                    placeholder="(00) 99999-9999"
                    className="mt-1"
                  />
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
                      {UNIDADES.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tags de Serviço</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SERVICOS_TAGS.map((tag) => (
                      <Badge
                        key={tag}
                        variant={editTags.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer text-xs py-1 px-3"
                        onClick={() => toggleTag(tag)}
                      >
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
              <div className="space-y-4">
                <div>
                  <Label>Unidade / Cidade</Label>
                  <Select value={editUnidadeAgendamento} onValueChange={setEditUnidadeAgendamento}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {UNIDADES.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data do Agendamento</Label>
                  <Input
                    type="date"
                    value={editDataAgendamento}
                    onChange={(e) => setEditDataAgendamento(e.target.value)}
                    min={todayStr}
                    className="mt-1"
                  />
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
                {/* View mode: Info first, then buttons */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={etapaBadgeVariant[lead.etapa] || "secondary"}>{etapa?.label}</Badge>
                  {lead.is_porta && <Badge variant="outline">Porta</Badge>}
                  {lead.origem && <Badge variant="outline">{lead.origem}</Badge>}
                </div>

                <div className="grid gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" /> {formatPhone(lead.telefone)}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" /> Agente: {agente?.nome || "—"}
                  </div>
                  {unidade && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" /> {unidade.nome}
                    </div>
                  )}
                  {lead.data_agendamento && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" /> {lead.data_agendamento}
                    </div>
                  )}
                  {lead.numero_os && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" /> {lead.numero_os}
                    </div>
                  )}
                  {lead.tags_servico && lead.tags_servico.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      {lead.tags_servico.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons AFTER info */}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={startEdit}>
                    <Pencil className="h-4 w-4" /> Editar Ficha
                  </Button>
                  {canEditSchedule && (
                    <Button variant="outline" size="sm" className="gap-2" onClick={startEditSchedule}>
                      <Calendar className="h-4 w-4" /> Editar Agendamento
                    </Button>
                  )}
                  {canSchedule && (
                    <Button size="sm" className="gap-2 bg-primary text-primary-foreground" onClick={() => setScheduleOpen(true)}>
                      <CalendarCheck className="h-4 w-4" /> Concluir Agendamento
                    </Button>
                  )}
                  {canDisqualify && (
                    <Button variant="destructive" size="sm" className="gap-2" onClick={() => setDisqualifyOpen(true)}>
                      <Ban className="h-4 w-4" /> Desqualificar
                    </Button>
                  )}

                <div>
                  <h4 className="font-semibold mb-3">Timeline</h4>
                  <LeadTimeline leadId={lead.id} />
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {lead && (
        <ScheduleModal
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          leadId={lead.id}
          leadNome={lead.nome}
        />
      )}
    </>
  );
};
