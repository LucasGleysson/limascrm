import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { UNIDADES, SERVICOS_TAGS, Lead, MOCK_USUARIOS, ETAPAS_FUNIL } from "@/data/mockData";
import { StatsCard } from "@/components/StatsCard";
import { NewLeadModal } from "@/components/NewLeadModal";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LogIn, LogOut, UserPlus, CalendarCheck, Users, LayoutDashboard, Search, UsersRound, AlertTriangle } from "lucide-react";
import { formatPhone } from "@/lib/phoneUtils";

const SIDEBAR_TABS = [
  { id: "agendamentos", label: "Agendamentos", icon: CalendarCheck },
  { id: "clientes", label: "Clientes", icon: UsersRound },
];

export const ReceptionistDashboard = () => {
  const { leads, updateLead, addInteracao } = useLeads();
  const { currentUser } = useRole();
  const [activeTab, setActiveTab] = useState("agendamentos");
  const unidadeId = currentUser.unidade_padrao || "6";
  const unidadeNome = UNIDADES.find((u) => u.id === unidadeId)?.nome || "";

  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLead, setCheckoutLead] = useState<Lead | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<"concluido" | "perdido" | "desqualificado">("concluido");
  const [checkoutMotivo, setCheckoutMotivo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Client search state
  const [clientSearch, setClientSearch] = useState("");
  const [clientDateFilter, setClientDateFilter] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState("todos");

  const today = new Date().toISOString().split("T")[0];

  // All leads for this unit
  const unitLeads = useMemo(() => {
    return leads.filter((l) => l.id_unidade === unidadeId);
  }, [leads, unidadeId]);

  // Today + past pending agendados
  const agendados = useMemo(() => {
    return unitLeads.filter((l) => l.etapa === "agendado" && l.data_agendamento && l.data_agendamento <= today);
  }, [unitLeads, today]);

  const agendadosHoje = agendados.filter((l) => l.data_agendamento === today);
  const agendadosAtrasados = agendados.filter((l) => l.data_agendamento! < today);

  const presentes = unitLeads.filter((l) => l.etapa === "na_loja" && l.checkin?.startsWith(today));
  const concluidos = unitLeads.filter((l) => l.etapa === "concluido" && l.checkout?.startsWith(today));

  // Clients tab filtered
  const filteredClients = useMemo(() => {
    let filtered = unitLeads;
    if (clientSearch) {
      const q = clientSearch.toLowerCase();
      filtered = filtered.filter((l) =>
        l.nome.toLowerCase().includes(q) ||
        l.telefone.includes(q) ||
        (l.numero_os && l.numero_os.toLowerCase().includes(q))
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

  const handleCheckin = (lead: Lead) => {
    const now = new Date().toISOString();
    updateLead(lead.id, { etapa: "na_loja", checkin: now });
    addInteracao({
      id: `i${Date.now()}`,
      id_lead: lead.id,
      tipo: "checkin",
      descricao: `Check-in na unidade ${unidadeNome}`,
      data: now,
      id_usuario: currentUser.id,
    });
  };

  const handleCheckoutSubmit = () => {
    if (!checkoutLead) return;
    if ((checkoutStatus === "perdido" || checkoutStatus === "desqualificado") && !checkoutMotivo.trim()) return;
    const now = new Date().toISOString();
    updateLead(checkoutLead.id, {
      etapa: checkoutStatus,
      checkout: now,
      tags_servico: tags.length > 0 ? tags : checkoutLead.tags_servico,
    });
    const statusLabel = ETAPAS_FUNIL.find(e => e.id === checkoutStatus)?.label || checkoutStatus;
    const motivoText = checkoutMotivo.trim() ? ` — Motivo: ${checkoutMotivo.trim()}` : "";
    addInteracao({
      id: `i${Date.now()}`,
      id_lead: checkoutLead.id,
      tipo: "checkout",
      descricao: `Check-out: ${statusLabel}${tags.length > 0 ? ` - ${tags.join(", ")}` : ""}${motivoText}`,
      data: now,
      id_usuario: currentUser.id,
    });
    setCheckoutOpen(false);
    setTags([]);
    setCheckoutMotivo("");
    setCheckoutStatus("concluido");
  };

  const checkoutNeedsMotivo = checkoutStatus === "perdido" || checkoutStatus === "desqualificado";
  const canSubmitCheckout = checkoutNeedsMotivo ? !!checkoutMotivo.trim() : true;

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const etapaBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    novo: "secondary", agendado: "default", na_loja: "default", concluido: "default",
    dispensado: "destructive", perdido: "destructive", desqualificado: "destructive",
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
              <Button onClick={() => setNewLeadOpen(true)} size="lg" className="gap-2">
                <UserPlus className="h-4 w-4" /> Novo Cliente
              </Button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatsCard title="Agendados Hoje" value={agendadosHoje.length} icon={CalendarCheck} variant="info" />
              <StatsCard title="Presentes" value={presentes.length} icon={Users} variant="warning" />
              <StatsCard title="Concluídos" value={concluidos.length} icon={LogOut} variant="success" />
            </div>

            {/* Past pending */}
            {agendadosAtrasados.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" /> Agendamentos Pendentes (Dias Anteriores)
                </h2>
                <div className="space-y-2">
                  {agendadosAtrasados.map((lead) => {
                    const agente = MOCK_USUARIOS.find((u) => u.id === lead.id_agente);
                    return (
                      <div key={lead.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-destructive/20">
                        <div className="flex-1 cursor-pointer" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                          <span className="font-semibold">{lead.nome}</span>
                          <p className="text-sm text-muted-foreground">
                            {formatPhone(lead.telefone)} · OS: {lead.numero_os} · Agendado: {lead.data_agendamento} · Agente: {agente?.nome}
                          </p>
                        </div>
                        <Button onClick={() => handleCheckin(lead)} className="gap-2" size="lg">
                          <LogIn className="h-4 w-4" /> Check-in
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Agendados hoje */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Aguardando Chegada</h2>
              {agendadosHoje.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum agendamento pendente para hoje.</p>
              ) : (
                <div className="space-y-2">
                  {agendadosHoje.map((lead) => {
                    const agente = MOCK_USUARIOS.find((u) => u.id === lead.id_agente);
                    return (
                      <div key={lead.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
                        <div className="flex-1 cursor-pointer" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                          <span className="font-semibold">{lead.nome}</span>
                          <p className="text-sm text-muted-foreground">{formatPhone(lead.telefone)} · OS: {lead.numero_os} · Agente: {agente?.nome}</p>
                        </div>
                        <Button onClick={() => handleCheckin(lead)} className="gap-2" size="lg">
                          <LogIn className="h-4 w-4" /> Check-in
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Presentes */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Em Atendimento</h2>
              {presentes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ninguém em atendimento.</p>
              ) : (
                <div className="space-y-2">
                  {presentes.map((lead) => (
                    <div key={lead.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-success/20">
                      <div className="flex-1 cursor-pointer" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{lead.nome}</span>
                          {lead.is_porta && <Badge variant="outline">Porta</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{formatPhone(lead.telefone)}{lead.numero_os ? ` · OS: ${lead.numero_os}` : ""}</p>
                      </div>
                      <Button
                        variant="outline"
                        className="gap-2 border-success/30 text-success hover:bg-success/10"
                        size="lg"
                        onClick={() => { setCheckoutLead(lead); setCheckoutOpen(true); }}
                      >
                        <LogOut className="h-4 w-4" /> Check-out
                      </Button>
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
                  <Input
                    placeholder="Buscar por nome, telefone ou OS..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Input type="date" value={clientDateFilter} onChange={(e) => setClientDateFilter(e.target.value)} className="w-[160px]" />
              </div>
              <div>
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
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum cliente encontrado.</TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((lead) => {
                      const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
                      return (
                        <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                          <TableCell className="font-medium">{lead.nome}</TableCell>
                          <TableCell>{formatPhone(lead.telefone)}</TableCell>
                          <TableCell>{lead.numero_os || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={etapaBadgeVariant[lead.etapa] || "secondary"} className="text-xs">{etapa?.label}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{lead.data_agendamento || lead.data_entrada}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <NewLeadModal open={newLeadOpen} onOpenChange={setNewLeadOpen} isPorta isReceptionist unidadeId={unidadeId} />
        <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />

        {/* Checkout Modal */}
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
              <div>
                <Label>Tags de Serviço</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {SERVICOS_TAGS.map((tag) => (
                    <Badge
                      key={tag}
                      variant={tags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer text-sm py-1 px-3"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancelar</Button>
              <Button onClick={handleCheckoutSubmit}>Finalizar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ReceptionistDashboard;
