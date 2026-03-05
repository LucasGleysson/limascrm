import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lead, UNIDADES, ETAPAS_FUNIL, MOCK_USUARIOS, ORIGENS } from "@/data/mockData";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { LeadTimeline } from "./LeadTimeline";
import { ScheduleModal } from "./ScheduleModal";
import { Phone, MapPin, Calendar, FileText, User, Tag, Pencil, CalendarCheck, X, Check } from "lucide-react";
import { formatPhone, maskPhoneInput } from "@/lib/phoneUtils";

const etapaBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  novo: "secondary",
  agendado: "default",
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
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Edit form state
  const [editNome, setEditNome] = useState("");
  const [editTelefone, setEditTelefone] = useState("");
  const [editOrigem, setEditOrigem] = useState("");
  const [editUnidade, setEditUnidade] = useState("");

  if (!lead) return null;

  const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
  const unidade = UNIDADES.find((u) => u.id === lead.id_unidade);
  const agente = MOCK_USUARIOS.find((u) => u.id === lead.id_agente);

  const startEdit = () => {
    setEditNome(lead.nome);
    setEditTelefone(lead.telefone);
    setEditOrigem(lead.origem);
    setEditUnidade(lead.id_unidade || "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = () => {
    const updates: Partial<Lead> = {};
    if (editNome !== lead.nome) updates.nome = editNome;
    if (editTelefone !== lead.telefone) updates.telefone = formatPhone(editTelefone);
    if (editOrigem !== lead.origem) updates.origem = editOrigem;
    if (editUnidade !== (lead.id_unidade || "")) updates.id_unidade = editUnidade || undefined;

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

  const canSchedule = lead.etapa === "novo";

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => { if (!v) setEditing(false); onOpenChange(v); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl">{editing ? "Editar Ficha" : lead.nome}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-6">
            {/* Action buttons */}
            {!editing && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={startEdit}>
                  <Pencil className="h-4 w-4" /> Editar Ficha
                </Button>
                {canSchedule && (
                  <Button size="sm" className="gap-2 bg-primary text-primary-foreground" onClick={() => setScheduleOpen(true)}>
                    <CalendarCheck className="h-4 w-4" /> Concluir Agendamento
                  </Button>
                )}
              </div>
            )}

            {editing ? (
              /* Edit form */
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

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={cancelEdit} className="gap-2">
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={saveEdit} disabled={!editNome || !editTelefone} className="gap-2">
                    <Check className="h-4 w-4" /> Salvar
                  </Button>
                </div>
              </div>
            ) : (
              /* View mode */
              <>
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
