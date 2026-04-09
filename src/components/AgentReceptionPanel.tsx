import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { SERVICOS_TAGS, Lead, TAGS_MOTIVO_OS } from "@/data/mockData";
import { MotivoTagSelector } from "./MotivoTagSelector";
import { StatsCard } from "@/components/StatsCard";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LogIn, LogOut, CalendarCheck, AlertTriangle, Wrench, XCircle, Search } from "lucide-react";
import { formatPhone } from "@/lib/phoneUtils";
import { getToday, formatDateBR, getStatusBadgeClass } from "@/lib/leadUtils";
import { appendNota } from "@/lib/notasUtils";
import { supabase } from "@/integrations/supabase/client";

export const AgentReceptionPanel = () => {
  const { leads, updateLead, unidades } = useLeads();
  const { currentUser } = useRole();

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

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const today = getToday();

  const myLeads = useMemo(() => leads.filter((l) => l.id_agente === currentUser?.id), [leads, currentUser?.id]);

  const agendados = useMemo(() => myLeads.filter((l) => ["agendado", "reagendado"].includes(l.etapa) && l.data_agendamento && l.data_agendamento <= today), [myLeads, today]);
  const agendadosHoje = agendados.filter((l) => l.data_agendamento === today);
  const agendadosAtrasados = agendados.filter((l) => l.data_agendamento! < today);

  const confirmados = myLeads.filter((l) => l.etapa === "confirmado");
  const presentes = myLeads.filter((l) => l.etapa === "na_loja");
  const concluidos = myLeads.filter((l) => l.etapa === "concluido" && l.checkout?.startsWith(today));
  const dispensados = myLeads.filter((l) => l.etapa === "dispensado");

  // All actionable leads grouped for filtering
  const allLeads = useMemo(() => {
    const groups: { key: string; label: string; leads: Lead[]; cls: string }[] = [
      { key: "hoje", label: "Hoje", leads: agendadosHoje, cls: "bg-primary/10 text-primary border-primary/30" },
      { key: "atrasado", label: "Atrasados", leads: agendadosAtrasados, cls: "bg-destructive/10 text-destructive border-destructive/30" },
      { key: "confirmado", label: "Confirmados", leads: confirmados, cls: "bg-info/10 text-info border-info/30" },
      { key: "na_loja", label: "Em Serviço", leads: presentes, cls: "bg-warning/10 text-warning border-warning/30" },
    ];
    return groups;
  }, [agendadosHoje, agendadosAtrasados, confirmados, presentes]);

  const filteredLeads = useMemo(() => {
    let items: { lead: Lead; group: string }[] = [];

    if (activeFilter) {
      const group = allLeads.find((g) => g.key === activeFilter);
      if (group) items = group.leads.map((l) => ({ lead: l, group: group.key }));
    } else {
      allLeads.forEach((g) => g.leads.forEach((l) => items.push({ lead: l, group: g.key })));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(({ lead }) =>
        lead.nome.toLowerCase().includes(q) || lead.telefone.includes(q) || (lead.numero_os && lead.numero_os.toLowerCase().includes(q))
      );
    }
    return items;
  }, [allLeads, activeFilter, searchQuery]);

  const getUnidadeNome = (id?: string | null) =>
    id ? unidades.find((u) => u.id === id)?.nome || "—" : "—";

  const handleCheckin = async (lead: Lead) => {
    if (loadingAction) return;
    setLoadingAction(`checkin-${lead.id}`);
    try {
      const now = new Date().toISOString();
      const notas = appendNota(lead.notas, "Check-in", "Cliente confirmado na loja");
      await updateLead(lead.id, { etapa: "confirmado", checkin: now, notas });
    } finally { setLoadingAction(null); }
  };

  const handleEmServico = async (lead: Lead) => {
    if (loadingAction) return;
    setLoadingAction(`servico-${lead.id}`);
    try { await updateLead(lead.id, { etapa: "na_loja" }); }
    finally { setLoadingAction(null); }
  };

  const handleDispensarOpen = (lead: Lead) => {
    setDispensarLead(lead); setDispensarMotivo(""); setDispensarTags([]); setDispensarOpen(true);
  };

  const handleDispensarSubmit = async () => {
    if (!dispensarLead || (!dispensarMotivo.trim() && dispensarTags.length === 0) || loadingAction) return;
    setLoadingAction("dispensar");
    try {
      const tagsText = dispensarTags.length > 0 ? `[${dispensarTags.join(", ")}]` : "";
      const fullMotivo = [tagsText, dispensarMotivo.trim()].filter(Boolean).join(" ");
      const notas = appendNota(dispensarLead.notas, "Dispensado", fullMotivo);
      await updateLead(dispensarLead.id, { etapa: "dispensado", checkout: null, tags_servico: null, notas, tags_motivo: dispensarTags.length > 0 ? dispensarTags : null } as any);
      await supabase.functions.invoke("generate-followups");
      setDispensarOpen(false);
      setDispensarLead(null);
    } finally { setLoadingAction(null); }
  };

  const handleCheckoutSubmit = async () => {
    if (!checkoutLead || loadingAction) return;
    setLoadingAction("checkout");
    try {
      const now = new Date().toISOString();
      const updates: Partial<Lead> = {
        etapa: "concluido", checkout: now,
        tags_servico: tags.length > 0 ? tags : checkoutLead.tags_servico,
      };
      if (checkoutMotivo.trim()) {
        updates.notas = appendNota(checkoutLead.notas, "Check-out", checkoutMotivo.trim());
      }
      await updateLead(checkoutLead.id, updates);
      setCheckoutOpen(false); setTags([]); setCheckoutMotivo("");
    } finally { setLoadingAction(null); }
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

      {/* Search + Category Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou OS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { key: null, label: "Todos", count: allLeads.reduce((s, g) => s + g.leads.length, 0), cls: "bg-muted text-muted-foreground border-border" },
            ...allLeads.map((g) => ({ key: g.key, label: g.label, count: g.leads.length, cls: g.cls })),
          ].map((cat) => (
            <Badge
              key={cat.key ?? "all"}
              variant="outline"
              className={`cursor-pointer transition-all ${cat.cls} ${activeFilter === cat.key ? "ring-2 ring-ring ring-offset-1 scale-105 font-bold" : "opacity-80 hover:opacity-100"}`}
              onClick={() => setActiveFilter(activeFilter === cat.key ? null : cat.key)}
            >
              {cat.label}: {cat.count}
            </Badge>
          ))}
        </div>
      </div>

      {/* Unified lead list */}
      <div className="space-y-2">
        {filteredLeads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente encontrado.</p>
        ) : (
          filteredLeads.map(({ lead, group }) => {
            const badge = getGroupBadge(group);
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
                    {lead.is_porta && <Badge variant="outline" className="text-xs">Porta</Badge>}
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
                    <span>{getUnidadeNome(lead.id_unidade)}</span>
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

      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />

      <Dialog open={dispensarOpen} onOpenChange={setDispensarOpen}>
        <DialogContent className="sm:max-w-md" onKeyDown={(e) => handleKeyDown(e, handleDispensarSubmit, !dispensarMotivo.trim() && dispensarTags.length === 0 || loadingAction === "dispensar")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" /> Dispensar: {dispensarLead?.nome}
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
              <LogOut className="h-5 w-5 text-success" /> Check-out: {checkoutLead?.nome}
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
