import { useState, useMemo } from "react";
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
import { CheckCircle2, Clock, AlertCircle, Plus, CalendarPlus, StickyNote } from "lucide-react";
import { Evento, Lead } from "@/data/mockData";

export const EventoPanel = () => {
  const { eventos, leads, addEvento, concluirEvento } = useLeads();
  const { currentUser } = useRole();
  const [concludeOpen, setConcludeOpen] = useState(false);
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
  const [descricao, setDescricao] = useState("");
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Create event modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [newLeadId, setNewLeadId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newDescricao, setNewDescricao] = useState("");

  const myLeads = useMemo(
    () => leads.filter((l) => l.id_agente === currentUser.id),
    [leads, currentUser.id]
  );

  const myEvents = useMemo(() => {
    const myLeadIds = myLeads.map((l) => l.id);
    return eventos
      .filter((e) => myLeadIds.includes(e.id_lead))
      .sort((a, b) => {
        if (a.concluido !== b.concluido) return a.concluido ? 1 : -1;
        return a.data_prevista.localeCompare(b.data_prevista);
      });
  }, [eventos, myLeads]);

  const pendentes = myEvents.filter((e) => !e.concluido);
  const concluidos = myEvents.filter((e) => e.concluido);

  const today = new Date().toISOString().split("T")[0];

  const handleConclude = async () => {
    if (!selectedEvento || !descricao.trim()) return;
    await concluirEvento(selectedEvento.id, descricao.trim(), currentUser.id);
    setConcludeOpen(false);
    setDescricao("");
    setSelectedEvento(null);
  };

  const handleCreate = async () => {
    if (!newLeadId || !newDate || !newDescricao.trim()) return;
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
  };

  const getLeadName = (leadId: string) => leads.find((l) => l.id === leadId)?.nome || "";
  const getLead = (leadId: string) => leads.find((l) => l.id === leadId) || null;

  const isOverdue = (dataPrevista: string) => dataPrevista < today;

  const openLeadDetail = (leadId: string) => {
    const lead = getLead(leadId);
    if (lead) {
      setDetailLead(lead);
      setDetailOpen(true);
    }
  };

  const getEventLabel = (evento: Evento) => {
    if (evento.tipo === "lembrete") return evento.descricao || "Lembrete";
    return `Follow-up ${evento.numero}`;
  };

  const getEventBadge = (evento: Evento, concluded: boolean) => {
    if (evento.tipo === "lembrete") {
      return (
        <Badge variant="outline" className={`text-xs ${concluded ? "bg-success/10 text-success border-success/30" : "bg-accent/50 text-accent-foreground border-accent"}`}>
          <StickyNote className="h-3 w-3 mr-1" /> Lembrete {concluded && "✓"}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className={`text-xs ${concluded ? "bg-success/10 text-success border-success/30" : "bg-warning/10 text-warning border-warning/30"}`}>
        Follow-up {evento.numero} {concluded && "✓"}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Eventos</h1>
          <p className="text-muted-foreground text-sm">Follow-ups, lembretes e tarefas</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Evento
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-warning" /> Pendentes ({pendentes.length})
        </h2>
        {pendentes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum evento pendente. 🎉</p>
        ) : (
          <div className="space-y-2">
            {pendentes.map((evento) => (
              <div
                key={evento.id}
                className={`flex items-center gap-4 p-4 rounded-xl bg-card border transition-all cursor-pointer hover:bg-muted/50 ${
                  isOverdue(evento.data_prevista) ? "border-destructive/30" : "border-border"
                }`}
                onClick={() => openLeadDetail(evento.id_lead)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold hover:underline">{getLeadName(evento.id_lead)}</span>
                    {getEventBadge(evento, false)}
                    {isOverdue(evento.data_prevista) && (
                      <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                        <AlertCircle className="h-3 w-3 mr-1" /> Atrasado
                      </Badge>
                    )}
                  </div>
                  {evento.tipo === "lembrete" && evento.descricao && (
                    <p className="text-sm text-foreground mt-1">{evento.descricao}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Previsto: {new Date(evento.data_prevista).toLocaleDateString("pt-BR")}
                  </p>
                </div>
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
              </div>
            ))}
          </div>
        )}
      </div>

      {concluidos.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" /> Concluídos ({concluidos.length})
          </h2>
          <div className="space-y-2">
            {concluidos.map((evento) => (
              <div
                key={evento.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border opacity-70 cursor-pointer hover:opacity-90"
                onClick={() => openLeadDetail(evento.id_lead)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium hover:underline">{getLeadName(evento.id_lead)}</span>
                    {getEventBadge(evento, true)}
                  </div>
                  {evento.tipo === "lembrete" && evento.descricao && (
                    <p className="text-sm text-foreground/70 mt-0.5">{evento.descricao}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {evento.descricao_conclusao}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conclude modal */}
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
                  if (e.key === "Enter" && !e.shiftKey && descricao.trim()) {
                    e.preventDefault();
                    handleConclude();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConcludeOpen(false)}>Cancelar</Button>
            <Button onClick={handleConclude} disabled={!descricao.trim()}>Concluir Evento</Button>
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
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {myLeads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data prevista</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={today}
                className="mt-1"
              />
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
                  if (e.key === "Enter" && !e.shiftKey && newLeadId && newDate && newDescricao.trim()) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newLeadId || !newDate || !newDescricao.trim()} className="gap-2">
              <Plus className="h-4 w-4" /> Criar Evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};
