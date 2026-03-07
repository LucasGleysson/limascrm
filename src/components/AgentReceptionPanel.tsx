import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { SERVICOS_TAGS, Lead, ETAPAS_FUNIL } from "@/data/mockData";
import { StatsCard } from "@/components/StatsCard";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LogIn, LogOut, CalendarCheck, AlertTriangle, Wrench, XCircle } from "lucide-react";
import { formatPhone } from "@/lib/phoneUtils";
import { getToday } from "@/lib/leadUtils";

export const AgentReceptionPanel = () => {
  const { leads, updateLead, unidades } = useLeads();
  const { currentUser } = useRole();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLead, setCheckoutLead] = useState<Lead | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<"concluido" | "perdido" | "desqualificado">("concluido");
  const [checkoutMotivo, setCheckoutMotivo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [dispensarOpen, setDispensarOpen] = useState(false);
  const [dispensarLead, setDispensarLead] = useState<Lead | null>(null);
  const [dispensarMotivo, setDispensarMotivo] = useState("");

  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const today = getToday();

  const myLeads = useMemo(() => leads.filter((l) => l.id_agente === currentUser?.id), [leads, currentUser?.id]);

  const agendados = useMemo(() => myLeads.filter((l) => l.etapa === "agendado" && l.data_agendamento && l.data_agendamento <= today), [myLeads, today]);
  const agendadosHoje = agendados.filter((l) => l.data_agendamento === today);
  const agendadosAtrasados = agendados.filter((l) => l.data_agendamento! < today);

  const confirmados = myLeads.filter((l) => l.etapa === "confirmado");
  const presentes = myLeads.filter((l) => l.etapa === "na_loja");
  const concluidos = myLeads.filter((l) => l.etapa === "concluido" && l.checkout?.startsWith(today));
  const dispensados = myLeads.filter((l) => l.etapa === "dispensado");

  const getUnidadeNome = (id?: string | null) =>
    id ? unidades.find((u) => u.id === id)?.nome || "—" : "—";

  const handleCheckin = async (lead: Lead) => {
    if (loadingAction) return;
    setLoadingAction(`checkin-${lead.id}`);
    try {
      const now = new Date().toISOString();
      await updateLead(lead.id, { etapa: "confirmado", checkin: now });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEmServico = async (lead: Lead) => {
    if (loadingAction) return;
    setLoadingAction(`servico-${lead.id}`);
    try {
      await updateLead(lead.id, { etapa: "na_loja" });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDispensarOpen = (lead: Lead) => {
    setDispensarLead(lead);
    setDispensarMotivo("");
    setDispensarOpen(true);
  };

  const handleDispensarSubmit = async () => {
    if (!dispensarLead || !dispensarMotivo.trim() || loadingAction) return;
    setLoadingAction("dispensar");
    try {
      await updateLead(dispensarLead.id, { etapa: "dispensado", checkout: null, tags_servico: null });
      setDispensarOpen(false);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCheckoutSubmit = async () => {
    if (!checkoutLead || loadingAction) return;
    if ((checkoutStatus === "perdido" || checkoutStatus === "desqualificado") && !checkoutMotivo.trim()) return;
    setLoadingAction("checkout");
    try {
      const now = new Date().toISOString();
      await updateLead(checkoutLead.id, {
        etapa: checkoutStatus, checkout: now,
        tags_servico: tags.length > 0 ? tags : checkoutLead.tags_servico,
      });
      setCheckoutOpen(false);
      setTags([]);
      setCheckoutMotivo("");
      setCheckoutStatus("concluido");
    } finally {
      setLoadingAction(null);
    }
  };

  const checkoutNeedsMotivo = checkoutStatus === "perdido" || checkoutStatus === "desqualificado";
  const canSubmitCheckout = checkoutNeedsMotivo ? !!checkoutMotivo.trim() : true;
  const toggleTag = (tag: string) => setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recepção — Meus Clientes</h1>
        <p className="text-muted-foreground text-sm">Chegadas e atendimentos dos seus leads</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Agendados Hoje" value={agendadosHoje.length} icon={CalendarCheck} variant="info" />
        <StatsCard title="Confirmados" value={confirmados.length} icon={LogIn} variant="info" />
        <StatsCard title="Em Serviço" value={presentes.length} icon={Wrench} variant="warning" />
        <StatsCard title="Concluídos" value={concluidos.length} icon={LogOut} variant="success" />
        <StatsCard title="Dispensados" value={dispensados.length} icon={XCircle} variant="destructive" />
      </div>

      {agendadosAtrasados.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" /> Agendamentos Pendentes (Dias Anteriores)
          </h2>
          <div className="space-y-2">
            {agendadosAtrasados.map((lead) => (
              <div key={lead.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-destructive/20">
                <div className="flex-1 cursor-pointer" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                  <span className="font-semibold">{lead.nome}</span>
                  <p className="text-sm text-muted-foreground">
                    {formatPhone(lead.telefone)}{lead.numero_os ? ` · OS: ${lead.numero_os}` : ""} · Agendado: {lead.data_agendamento ? new Date(lead.data_agendamento + "T12:00:00").toLocaleDateString("pt-BR") : "—"} · {getUnidadeNome(lead.id_unidade)}
                  </p>
                </div>
                <Button onClick={() => handleCheckin(lead)} className="gap-2" size="lg" disabled={loadingAction === `checkin-${lead.id}`}>
                  <LogIn className="h-4 w-4" /> {loadingAction === `checkin-${lead.id}` ? "Aguarde..." : "Check-in"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Aguardando Chegada</h2>
        {agendadosHoje.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum agendamento pendente para hoje.</p>
        ) : (
          <div className="space-y-2">
            {agendadosHoje.map((lead) => (
              <div key={lead.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
                <div className="flex-1 cursor-pointer" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                  <span className="font-semibold">{lead.nome}</span>
                  <p className="text-sm text-muted-foreground">
                    {formatPhone(lead.telefone)}{lead.numero_os ? ` · OS: ${lead.numero_os}` : ""} · {getUnidadeNome(lead.id_unidade)}
                  </p>
                </div>
                <Button onClick={() => handleCheckin(lead)} className="gap-2" size="lg" disabled={loadingAction === `checkin-${lead.id}`}>
                  <LogIn className="h-4 w-4" /> {loadingAction === `checkin-${lead.id}` ? "Aguarde..." : "Check-in"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmados.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Confirmados — Aguardando Serviço</h2>
          <div className="space-y-2">
            {confirmados.map((lead) => (
              <div key={lead.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-info/20">
                <div className="flex-1 cursor-pointer" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{lead.nome}</span>
                    <Badge variant="outline" className="bg-info/15 text-info border-info/30 text-xs">
                      <span className="mr-1">●</span> Confirmado
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatPhone(lead.telefone)}{lead.numero_os ? ` · OS: ${lead.numero_os}` : ""}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleEmServico(lead)} className="gap-2" size="lg" disabled={loadingAction === `servico-${lead.id}`}>
                    <Wrench className="h-4 w-4" /> {loadingAction === `servico-${lead.id}` ? "Aguarde..." : "Em Serviço"}
                  </Button>
                  <Button variant="destructive" onClick={() => handleDispensarOpen(lead)} className="gap-2" size="lg">
                    <XCircle className="h-4 w-4" /> Dispensado
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-3">Em Serviço</h2>
        {presentes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguém em serviço.</p>
        ) : (
          <div className="space-y-2">
            {presentes.map((lead) => (
              <div key={lead.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-warning/20">
                <div className="flex-1 cursor-pointer" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{lead.nome}</span>
                    {lead.is_porta && <Badge variant="outline">Porta</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{formatPhone(lead.telefone)}{lead.numero_os ? ` · OS: ${lead.numero_os}` : ""}</p>
                </div>
                <Button variant="outline" className="gap-2 border-success/30 text-success hover:bg-success/10" size="lg" onClick={() => { setCheckoutLead(lead); setCheckoutOpen(true); }}>
                  <LogOut className="h-4 w-4" /> Check-out
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />

      <Dialog open={dispensarOpen} onOpenChange={setDispensarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Dispensar: {dispensarLead?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo da dispensa <span className="text-destructive">*</span></Label>
              <Textarea value={dispensarMotivo} onChange={(e) => setDispensarMotivo(e.target.value)} placeholder="Descreva o motivo..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispensarOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDispensarSubmit} disabled={!dispensarMotivo.trim() || loadingAction === "dispensar"}>
              {loadingAction === "dispensar" ? "Aguarde..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-success" />
              Check-out: {checkoutLead?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status de Saída</Label>
              <Select value={checkoutStatus} onValueChange={(v) => setCheckoutStatus(v as any)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="concluido">Serviço Concluído</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                  <SelectItem value="desqualificado">Desqualificado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {checkoutNeedsMotivo && (
              <div>
                <Label>Motivo <span className="text-destructive">*</span></Label>
                <Textarea value={checkoutMotivo} onChange={(e) => setCheckoutMotivo(e.target.value)} placeholder="Descreva o motivo..." className="mt-1" />
              </div>
            )}
            <div>
              <Label>Tags de Serviço</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {SERVICOS_TAGS.map((tag) => (
                  <Badge key={tag} variant={tags.includes(tag) ? "default" : "outline"} className="cursor-pointer text-sm py-1 px-3" onClick={() => toggleTag(tag)}>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancelar</Button>
            <Button onClick={handleCheckoutSubmit} disabled={!canSubmitCheckout || loadingAction === "checkout"}>
              {loadingAction === "checkout" ? "Aguarde..." : "Finalizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};