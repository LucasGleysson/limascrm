import { useState, useMemo } from "react";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { SERVICOS_TAGS, Lead, ETAPAS_FUNIL, TAGS_MOTIVO_OS } from "@/data/mockData";
import { MotivoTagSelector } from "@/components/MotivoTagSelector";
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
import { supabase } from "@/integrations/supabase/client";

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
  const [dispensarTags, setDispensarTags] = useState<string[]>([]);

  const [clientSearch, setClientSearch] = useState("");
  const [clientEntradaStart, setClientEntradaStart] = useState("");
  const [clientEntradaEnd, setClientEntradaEnd] = useState("");
  const [clientAgendStart, setClientAgendStart] = useState("");
  const [clientAgendEnd, setClientAgendEnd] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState("todos");

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Search + filter for agendamentos tab
  const [agendSearch, setAgendSearch] = useState("");
  const [agendFilter, setAgendFilter] = useState<string | null>(null);

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

  // Groups for category filtering
  const agendGroups = useMemo(() => [
    { key: "hoje", label: "Hoje", leads: agendadosHoje, cls: "bg-primary/10 text-primary border-primary/30" },
    { key: "atrasado", label: "Atrasados", leads: agendadosAtrasados, cls: "bg-destructive/10 text-destructive border-destructive/30" },
    { key: "confirmado", label: "Confirmados", leads: confirmados, cls: "bg-info/10 text-info border-info/30" },
    { key: "na_loja", label: "Em Serviço", leads: presentes, cls: "bg-warning/10 text-warning border-warning/30" },
  ], [agendadosHoje, agendadosAtrasados, confirmados, presentes]);

  const filteredAgendLeads = useMemo(() => {
    let items: { lead: Lead; group: string }[] = [];
    if (agendFilter) {
      const group = agendGroups.find((g) => g.key === agendFilter);
      if (group) items = group.leads.map((l) => ({ lead: l, group: group.key }));
    } else {
      agendGroups.forEach((g) => g.leads.forEach((l) => items.push({ lead: l, group: g.key })));
    }
    if (agendSearch.trim()) {
      const q = agendSearch.trim().toLowerCase();
      items = items.filter(({ lead }) =>
        lead.nome.toLowerCase().includes(q) || lead.telefone.includes(q) || (lead.numero_os && lead.numero_os.toLowerCase().includes(q))
      );
    }
    return items;
  }, [agendGroups, agendFilter, agendSearch]);

  // Statuses that have an OS (post-scheduling)
  const OS_STATUSES = ["agendado", "reagendado", "confirmado", "na_loja", "concluido", "dispensado", "perdido"];

  const filteredClients = useMemo(() => {
    let filtered = unitLeads;
    if (clientSearch) {
      const q = clientSearch.toLowerCase();
      filtered = filtered.filter((l) =>
        l.nome.toLowerCase().includes(q) || l.telefone.includes(q) || (l.numero_os && l.numero_os.toLowerCase().includes(q))
      );
    }
    if (clientEntradaStart) filtered = filtered.filter((l) => l.data_entrada >= clientEntradaStart);
    if (clientEntradaEnd) filtered = filtered.filter((l) => l.data_entrada <= clientEntradaEnd);
    if (clientAgendStart) filtered = filtered.filter((l) => l.data_agendamento && l.data_agendamento >= clientAgendStart);
    if (clientAgendEnd) filtered = filtered.filter((l) => l.data_agendamento && l.data_agendamento <= clientAgendEnd);
    if (clientStatusFilter !== "todos") {
      filtered = filtered.filter((l) => l.etapa === clientStatusFilter);
    }
    return filtered;
  }, [unitLeads, clientSearch, clientEntradaStart, clientEntradaEnd, clientAgendStart, clientAgendEnd, clientStatusFilter]);

  const clientPagination = usePagination(filteredClients, { pageSize: 20 });

  const handleCheckin = async (lead: Lead) => {
    if (loadingAction) return;
    setLoadingAction(`checkin-${lead.id}`);
    try {
      const now = new Date().toISOString();
      const notas = appendNota(lead.notas, "Check-in", "Cliente confirmado na loja", currentUser.nome);
      await updateLead(lead.id, {
        etapa: "confirmado",
        checkin: now,
        notas,
        id_recepcionista: currentUser.id,
        visitas_loja: (lead.visitas_loja ?? 0) + 1,
      } as any);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEmServico = async (lead: Lead) => {
    if (loadingAction) return;
    setLoadingAction(`servico-${lead.id}`);
    try {
      const notas = appendNota(lead.notas, "Em Serviço", "Carro em serviço", currentUser.nome);
      await updateLead(lead.id, { etapa: "na_loja", notas, id_recepcionista: currentUser.id } as any);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDispensarOpen = (lead: Lead) => {
    setDispensarLead(lead);
    setDispensarMotivo("");
    setDispensarTags([]);
    setDispensarOpen(true);
  };

  const handleDispensarSubmit = async () => {
    if (!dispensarLead || (!dispensarMotivo.trim() && dispensarTags.length === 0) || loadingAction) return;
    setLoadingAction("dispensar");
    try {
      const tagsText = dispensarTags.length > 0 ? `[${dispensarTags.join(", ")}]` : "";
      const fullMotivo = [tagsText, dispensarMotivo.trim()].filter(Boolean).join(" ");
      const notas = appendNota(dispensarLead.notas, "Dispensado", fullMotivo, currentUser.nome);
      await updateLead(dispensarLead.id, { etapa: "dispensado", checkout: null, tags_servico: null, notas, id_recepcionista: currentUser.id, tags_motivo: dispensarTags.length > 0 ? dispensarTags : null } as any);
      await supabase.functions.invoke("generate-followups");
      setDispensarOpen(false);
      setDispensarLead(null);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCheckoutSubmit = async () => {
    if (!checkoutLead || loadingAction) return;
    setLoadingAction("checkout");
    try {
      const now = new Date().toISOString();
      const updates: any = {
        etapa: "concluido", checkout: now,
        tags_servico: tags.length > 0 ? tags : checkoutLead.tags_servico,
        valor_servico: checkoutLead.valor_servico,
        id_recepcionista: currentUser.id,
      };
      if (checkoutMotivo.trim()) {
        updates.notas = appendNota(checkoutLead.notas, "Check-out", checkoutMotivo.trim(), currentUser.nome);
      } else {
        updates.notas = appendNota(checkoutLead.notas, "Check-out", "Serviço finalizado", currentUser.nome);
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

  const getGroupBadge = (group: string) => {
    const labels: Record<string, { label: string; cls: string }> = {
      hoje: { label: "Agendado Hoje", cls: "bg-primary/10 text-primary border-primary/30" },
      atrasado: { label: "Atrasado", cls: "bg-destructive/10 text-destructive border-destructive/30" },
      confirmado: { label: "Confirmado", cls: "bg-info/10 text-info border-info/30" },
      na_loja: { label: "Em Serviço", cls: "bg-warning/10 text-warning border-warning/30" },
    };
    return labels[group] || { label: group, cls: "" };
  };

  const getActions = (lead: Lead, group: string) => {
    if (group === "hoje" || group === "atrasado") {
      return (
        <Button onClick={(e) => { e.stopPropagation(); handleCheckin(lead); }} className="gap-1" size="sm" disabled={loadingAction === `checkin-${lead.id}`}>
          <LogIn className="h-3.5 w-3.5" /> {loadingAction === `checkin-${lead.id}` ? "..." : "Check-in"}
        </Button>
      );
    }
    if (group === "confirmado") {
      return (
        <div className="flex gap-1">
          <Button onClick={(e) => { e.stopPropagation(); handleEmServico(lead); }} className="gap-1" size="sm" disabled={loadingAction === `servico-${lead.id}`}>
            <Wrench className="h-3.5 w-3.5" /> {loadingAction === `servico-${lead.id}` ? "..." : "Em Serviço"}
          </Button>
          <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); handleDispensarOpen(lead); }} className="gap-1">
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    }
    if (group === "na_loja") {
      return (
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="gap-1 border-success/30 text-success hover:bg-success/10" onClick={(e) => { e.stopPropagation(); setCheckoutLead(lead); setTags(lead.tags_servico || []); setCheckoutMotivo(""); setCheckoutOpen(true); }}>
            <LogOut className="h-3.5 w-3.5" /> Check-out
          </Button>
          <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); handleDispensarOpen(lead); }} className="gap-1">
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    }
    return null;
  };

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

            {/* Search + Category Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone ou OS..."
                  value={agendSearch}
                  onChange={(e) => setAgendSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { key: null, label: "Todos", count: agendGroups.reduce((s, g) => s + g.leads.length, 0), cls: "bg-muted text-muted-foreground border-border" },
                  ...agendGroups.map((g) => ({ key: g.key, label: g.label, count: g.leads.length, cls: g.cls })),
                ].map((cat) => (
                  <Badge
                    key={cat.key ?? "all"}
                    variant="outline"
                    className={`cursor-pointer transition-all ${cat.cls} ${agendFilter === cat.key ? "ring-2 ring-ring ring-offset-1 scale-105 font-bold" : "opacity-80 hover:opacity-100"}`}
                    onClick={() => setAgendFilter(agendFilter === cat.key ? null : cat.key)}
                  >
                    {cat.label}: {cat.count}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Unified lead list */}
            <div className="space-y-2">
              {filteredAgendLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente encontrado.</p>
              ) : (
                filteredAgendLeads.map(({ lead, group }) => {
                  const badge = getGroupBadge(group);
                  const agente = profiles.find((u) => u.id === lead.id_agente);
                  return (
                    <div
                      key={lead.id}
                      className={`flex items-center gap-3 p-3 rounded-xl bg-card border transition-all hover:bg-muted/50 ${
                        group === "atrasado" ? "border-destructive/20" : "border-border"
                      }`}
                    >
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{lead.nome}</span>
                          <Badge variant="outline" className={`text-xs ${badge.cls}`}>
                            {badge.label}
                          </Badge>
                          {lead.tags_servico && lead.tags_servico.length > 0 && (
                            <div className="flex gap-1">
                              {lead.tags_servico.map((t) => (
                                <Badge key={t} variant="secondary" className="text-[10px] py-0">{t}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span>{formatPhone(lead.telefone)}</span>
                          {lead.numero_os && <span>OS: {lead.numero_os}</span>}
                          <span>Agente: {agente?.nome || "—"}</span>
                          {group === "atrasado" && lead.data_agendamento && (
                            <span className="text-destructive">Agendado: {formatDateBR(lead.data_agendamento)}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {getActions(lead, group)}
                      </div>
                    </div>
                  );
                })
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
              <Select value={clientStatusFilter} onValueChange={setClientStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  {ETAPAS_FUNIL.filter((e) => OS_STATUSES.includes(e.id)).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium">Entrada:</span>
              <Input type="date" value={clientEntradaStart} onChange={(e) => setClientEntradaStart(e.target.value)} className="w-[140px] h-8 text-xs" />
              <span className="text-muted-foreground">até</span>
              <Input type="date" value={clientEntradaEnd} onChange={(e) => setClientEntradaEnd(e.target.value)} className="w-[140px] h-8 text-xs" />
              <span className="text-muted-foreground font-medium ml-2">Agendamento:</span>
              <Input type="date" value={clientAgendStart} onChange={(e) => setClientAgendStart(e.target.value)} className="w-[140px] h-8 text-xs" />
              <span className="text-muted-foreground">até</span>
              <Input type="date" value={clientAgendEnd} onChange={(e) => setClientAgendEnd(e.target.value)} className="w-[140px] h-8 text-xs" />
              {(clientEntradaStart || clientEntradaEnd || clientAgendStart || clientAgendEnd) && (
                <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setClientEntradaStart(""); setClientEntradaEnd(""); setClientAgendStart(""); setClientAgendEnd(""); }}>Limpar datas</Button>
              )}
            </div>

            <p className="text-muted-foreground text-xs">{filteredClients.length} clientes encontrados</p>

            <div className="rounded-xl border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Agendamento</TableHead>
                    <TableHead>Entrada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientPagination.paginatedItems.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum cliente encontrado.</TableCell></TableRow>
                  ) : (
                    clientPagination.paginatedItems.map((lead) => {
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
                          <TableCell className="text-xs">{lead.data_agendamento ? <span className="text-primary font-medium">{formatDateBR(lead.data_agendamento)}</span> : "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{formatDateBR(lead.data_entrada)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              <TablePagination
                currentPage={clientPagination.currentPage} totalPages={clientPagination.totalPages}
                totalItems={clientPagination.totalItems} pageSize={clientPagination.pageSize}
                onPageChange={clientPagination.goToPage} hasNextPage={clientPagination.hasNextPage} hasPrevPage={clientPagination.hasPrevPage}
              />
            </div>
          </>
        )}
      </main>

      <NewLeadModal open={newLeadOpen} onOpenChange={setNewLeadOpen} isReceptionist unidadeId={unidadeId} />
      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />

      <Dialog open={dispensarOpen} onOpenChange={setDispensarOpen}>
        <DialogContent className="sm:max-w-md" onKeyDown={(e) => handleKeyDown(e, handleDispensarSubmit, (!dispensarMotivo.trim() && dispensarTags.length === 0) || loadingAction === "dispensar")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Dispensar: {dispensarLead?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold">Tags de Motivo</Label>
              <div className="mt-1.5">
                <MotivoTagSelector
                  tags={TAGS_MOTIVO_OS}
                  selected={dispensarTags}
                  onToggle={(tag) => setDispensarTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
                />
              </div>
            </div>
            <div>
              <Label>Motivo da dispensa</Label>
              <Textarea value={dispensarMotivo} onChange={(e) => setDispensarMotivo(e.target.value)} placeholder="Descreva o motivo (opcional se tag selecionada)..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispensarOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDispensarSubmit} disabled={(!dispensarMotivo.trim() && dispensarTags.length === 0) || loadingAction === "dispensar"}>
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
