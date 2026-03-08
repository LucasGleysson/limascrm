import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { SERVICOS_TAGS, Lead, ETAPAS_FUNIL } from "@/data/mockData";
import { StatsCard } from "@/components/StatsCard";
import { NewLeadModal } from "@/components/NewLeadModal";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogIn, LogOut, UserPlus, CalendarCheck, Search, UsersRound, AlertTriangle, Wrench, XCircle, RefreshCw } from "lucide-react";
import { formatPhone } from "@/lib/phoneUtils";
import { getStatusBadgeClass, getToday, formatDateBR } from "@/lib/leadUtils";
import { appendNota } from "@/lib/notasUtils";

const SIDEBAR_TABS = [
  { id: "agendamentos", label: "Agendamentos", icon: CalendarCheck },
  { id: "clientes", label: "Clientes", icon: UsersRound },
];

export const ReceptionistDashboard = () => {
  const { leads, updateLead, unidades, profiles, refreshAll } = useLeads();
  const { currentUser } = useRole();
  const [activeTab, setActiveTab] = useState("agendamentos");
  const unidadeId = currentUser.unidade_padrao || "";
  const unidadeNome = unidades.find((u) => u.id === unidadeId)?.nome || "";

  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLead, setCheckoutLead] = useState<Lead | null>(null);
  const [checkoutMotivo, setCheckoutMotivo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [dispensarOpen, setDispensarOpen] = useState(false);
  const [dispensarLead, setDispensarLead] = useState<Lead | null>(null);
  const [dispensarMotivo, setDispensarMotivo] = useState("");

  const [clientSearch, setClientSearch] = useState("");
  const [clientDateFilter, setClientDateFilter] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState("todos");

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const today = getToday();

  const unitLeads = useMemo(() => leads.filter((l) => l.id_unidade === unidadeId), [leads, unidadeId]);

  const agendados = useMemo(() => unitLeads.filter((l) => ["agendado", "reagendado"].includes(l.etapa) && l.data_agendamento && l.data_agendamento <= today), [unitLeads, today]);
  const agendadosHoje = agendados.filter((l) => l.data_agendamento === today);
  const agendadosAtrasados = agendados.filter((l) => l.data_agendamento! < today);

  const confirmados = unitLeads.filter((l) => l.etapa === "confirmado");
  const presentes = unitLeads.filter((l) => l.etapa === "na_loja");
  const concluidos = unitLeads.filter((l) => l.etapa === "concluido" && l.checkout?.startsWith(today));
  const dispensados = unitLeads.filter((l) => l.etapa === "dispensado");

  const filteredClients = useMemo(() => {
    let filtered = unitLeads;
    if (clientSearch) {
      const q = clientSearch.toLowerCase();
      filtered = filtered.filter((l) =>
        l.nome.toLowerCase().includes(q) || l.telefone.includes(q) || (l.numero_os && l.numero_os.toLowerCase().includes(q))
      );
    }
    if (clientDateFilter) {
      filtered = filtered.filter((l) => l.data_entrada === clientDateFilter || l.data_agendamento === clientDateFilter);
    }
    if (clientStatusFilter !== "todos") {
      filtered = filtered.filter((l) => l.etapa === clientStatusFilter);
    }
    return filtered;
  }, [unitLeads, clientSearch, clientDateFilter, clientStatusFilter]);

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
      const notas = appendNota(dispensarLead.notas, "Dispensado", dispensarMotivo.trim());
      await updateLead(dispensarLead.id, { etapa: "dispensado", checkout: null, tags_servico: null, notas });
      setDispensarOpen(false);
    } finally {
      setLoadingAction(null);
    }
  };

  // Checkout = service concluded
  const handleCheckoutSubmit = async () => {
    if (!checkoutLead || loadingAction) return;
    setLoadingAction("checkout");
    try {
      const now = new Date().toISOString();
      const updates: Partial<Lead> = {
        etapa: "concluido", checkout: now,
        tags_servico: tags.length > 0 ? tags : checkoutLead.tags_servico,
        valor_servico: checkoutLead.valor_servico,
      };
      if (checkoutMotivo.trim()) {
        updates.notas = appendNota(checkoutLead.notas, "Check-out", checkoutMotivo.trim());
      }
      await updateLead(checkoutLead.id, updates);
      setCheckoutOpen(false);
      setTags([]);
      setCheckoutMotivo("");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void, disabled?: boolean) => {
    if (e.key === "Enter" && !e.shiftKey && !disabled) { e.preventDefault(); action(); }
  };

  const toggleTag = (tag: string) => setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} tabs={SIDEBAR_TABS} />

      <main className="flex-1 overflow-auto p-6 space-y-6">
        {activeTab === "agendamentos" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Recepção — {unidadeNome}</h1>
                <p className="text-muted-foreground text-sm">Chegadas e atendimentos do dia</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
                <Button onClick={() => setNewLeadOpen(true)} size="lg" className="gap-2">
                  <UserPlus className="h-4 w-4" /> Novo Cliente
                </Button>
              </div>
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
                  {agendadosAtrasados.map((lead) => {
                    const agente = profiles.find((u) => u.id === lead.id_agente);
                    return (
                      <div key={lead.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-destructive/20">
                        <div className="flex-1 cursor-pointer" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                          <span className="font-semibold">{lead.nome}</span>
                          <p className="text-sm text-muted-foreground">
                            {formatPhone(lead.telefone)}{lead.numero_os ? ` · OS: ${lead.numero_os}` : ""} · Agendado: {formatDateBR(lead.data_agendamento)} · Agente: {agente?.nome || "—"}
                          </p>
                        </div>
                        <Button onClick={() => handleCheckin(lead)} className="gap-2" size="lg" disabled={loadingAction === `checkin-${lead.id}`}>
                          <LogIn className="h-4 w-4" /> {loadingAction === `checkin-${lead.id}` ? "Aguarde..." : "Check-in"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold mb-3">Aguardando Chegada</h2>
              {agendadosHoje.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum agendamento pendente para hoje.</p>
              ) : (
                <div className="space-y-2">
                  {agendadosHoje.map((lead) => {
                    const agente = profiles.find((u) => u.id === lead.id_agente);
                    return (
                      <div key={lead.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
                        <div className="flex-1 cursor-pointer" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                          <span className="font-semibold">{lead.nome}</span>
                          <p className="text-sm text-muted-foreground">{formatPhone(lead.telefone)}{lead.numero_os ? ` · OS: ${lead.numero_os}` : ""} · Agente: {agente?.nome || "—"}</p>
                        </div>
                        <Button onClick={() => handleCheckin(lead)} className="gap-2" size="lg" disabled={loadingAction === `checkin-${lead.id}`}>
                          <LogIn className="h-4 w-4" /> {loadingAction === `checkin-${lead.id}` ? "Aguarde..." : "Check-in"}
                        </Button>
                      </div>
                    );
                  })}
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
                          <XCircle className="h-4 w-4" /> Dispensar
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
                      <div className="flex gap-2">
                        <Button variant="outline" className="gap-2 border-success/30 text-success hover:bg-success/10" size="lg" onClick={() => { setCheckoutLead(lead); setTags(lead.tags_servico || []); setCheckoutOpen(true); }}>
                          <LogOut className="h-4 w-4" /> Check-out
                        </Button>
                        <Button variant="destructive" onClick={() => handleDispensarOpen(lead)} className="gap-2" size="lg">
                          <XCircle className="h-4 w-4" /> Dispensar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "clientes" && (
          <>
            <div>
              <h1 className="text-2xl font-bold">Clientes — {unidadeNome}</h1>
              <p className="text-muted-foreground text-sm">Todos os clientes da sua unidade</p>
            </div>

            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar por nome, telefone ou OS..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="pl-10" />
                </div>
              </div>
              <Input type="date" value={clientDateFilter} onChange={(e) => setClientDateFilter(e.target.value)} className="w-[160px]" />
              <Select value={clientStatusFilter} onValueChange={setClientStatusFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {ETAPAS_FUNIL.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum cliente encontrado.</TableCell></TableRow>
                  ) : (
                    filteredClients.map((lead) => {
                      const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
                      return (
                        <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                          <TableCell className="font-medium">{lead.nome}</TableCell>
                          <TableCell>{formatPhone(lead.telefone)}</TableCell>
                          <TableCell>{lead.numero_os || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${getStatusBadgeClass(lead.etapa)}`}>
                              {etapa?.label || lead.etapa}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{formatDateBR(lead.data_entrada)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </main>

      <NewLeadModal open={newLeadOpen} onOpenChange={setNewLeadOpen} isReceptionist unidadeId={unidadeId} />
      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />

      <Dialog open={dispensarOpen} onOpenChange={setDispensarOpen}>
        <DialogContent className="sm:max-w-md" onKeyDown={(e) => handleKeyDown(e, handleDispensarSubmit, !dispensarMotivo.trim() || loadingAction === "dispensar")}>
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
        <DialogContent className="sm:max-w-md" onKeyDown={(e) => handleKeyDown(e, handleCheckoutSubmit, loadingAction === "checkout")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-success" />
              Check-out: {checkoutLead?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea value={checkoutMotivo} onChange={(e) => setCheckoutMotivo(e.target.value)} placeholder="Alguma observação sobre o serviço..." className="mt-1" />
            </div>
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
            <Button onClick={handleCheckoutSubmit} disabled={loadingAction === "checkout"}>
              {loadingAction === "checkout" ? "Aguarde..." : "Finalizar Serviço"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceptionistDashboard;
