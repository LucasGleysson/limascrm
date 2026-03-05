import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { ETAPAS_FUNIL, Lead } from "@/data/mockData";
import { StatsCard } from "@/components/StatsCard";
import { NewLeadModal } from "@/components/NewLeadModal";
import { ScheduleModal } from "@/components/ScheduleModal";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Phone, Users, CalendarCheck, TrendingUp, ChevronRight, Search } from "lucide-react";

export const AgentDashboard = () => {
  const { leads, updateLead, addInteracao } = useLeads();
  const { currentUser } = useRole();
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleLead, setScheduleLead] = useState<{ id: string; nome: string } | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [etapaFilter, setEtapaFilter] = useState("todos");
  const [search, setSearch] = useState("");

  const myLeads = useMemo(() => {
    return leads
      .filter((l) => l.id_agente === currentUser.id)
      .filter((l) => etapaFilter === "todos" || l.etapa === etapaFilter)
      .filter((l) => !search || l.nome.toLowerCase().includes(search.toLowerCase()) || l.telefone.includes(search));
  }, [leads, currentUser.id, etapaFilter, search]);

  const stats = useMemo(() => {
    const mine = leads.filter((l) => l.id_agente === currentUser.id);
    return {
      total: mine.length,
      novos: mine.filter((l) => l.etapa === "novo").length,
      agendados: mine.filter((l) => ["agendado", "compareceu", "concluido"].includes(l.etapa)).length,
      faturamento: mine.reduce((sum, l) => sum + (l.valor_servico || 0), 0),
    };
  }, [leads, currentUser.id]);

  const handleMoveEtapa = (lead: Lead, novaEtapa: string) => {
    if (novaEtapa === "agendado") {
      setScheduleLead({ id: lead.id, nome: lead.nome });
      setScheduleOpen(true);
      return;
    }
    updateLead(lead.id, { etapa: novaEtapa });
    const etapaLabel = ETAPAS_FUNIL.find((e) => e.id === novaEtapa)?.label;
    addInteracao({
      id: `i${Date.now()}`,
      id_lead: lead.id,
      tipo: "mudanca_etapa",
      descricao: `Movido para '${etapaLabel}'`,
      data: new Date().toISOString(),
      id_usuario: currentUser.id,
    });
  };

  const getEtapaColor = (etapa: string) => {
    const map: Record<string, string> = {
      novo: "bg-info/10 text-info border-info/30",
      tentativa_contato: "bg-warning/10 text-warning border-warning/30",
      contato_feito: "bg-primary/10 text-primary border-primary/30",
      agendado: "bg-success/10 text-success border-success/30",
      compareceu: "bg-success/10 text-success border-success/30",
      concluido: "bg-success/15 text-success border-success/40",
      perdido: "bg-destructive/10 text-destructive border-destructive/30",
    };
    return map[etapa] || "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Minha Carteira</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus leads e agendamentos</p>
        </div>
        <Button onClick={() => setNewLeadOpen(true)} size="lg" className="gap-2">
          <Plus className="h-4 w-4" /> Novo Lead
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total de Leads" value={stats.total} icon={Users} variant="info" />
        <StatsCard title="Novos Hoje" value={stats.novos} icon={Phone} variant="warning" />
        <StatsCard title="Agendados" value={stats.agendados} icon={CalendarCheck} variant="success" />
        <StatsCard title="Faturamento" value={`R$ ${stats.faturamento.toLocaleString("pt-BR")}`} icon={TrendingUp} variant="primary" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar lead..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={etapaFilter} onValueChange={setEtapaFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as etapas</SelectItem>
            {ETAPAS_FUNIL.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {myLeads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhum lead encontrado.</div>
        ) : (
          myLeads.map((lead) => {
            const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
            return (
              <div
                key={lead.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all cursor-pointer animate-slide-in"
                onClick={() => { setDetailLead(lead); setDetailOpen(true); }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{lead.nome}</span>
                    <Badge variant="outline" className={`text-xs ${getEtapaColor(lead.etapa)}`}>
                      {etapa?.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{lead.telefone} · {lead.origem}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {lead.etapa !== "concluido" && lead.etapa !== "perdido" && (
                    <Select
                      value=""
                      onValueChange={(v) => { handleMoveEtapa(lead, v); }}
                    >
                      <SelectTrigger className="w-40 h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                        <SelectValue placeholder="Mover para..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ETAPAS_FUNIL.filter((e) => e.id !== lead.etapa).map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            );
          })
        )}
      </div>

      <NewLeadModal open={newLeadOpen} onOpenChange={setNewLeadOpen} />
      {scheduleLead && (
        <ScheduleModal
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          leadId={scheduleLead.id}
          leadNome={scheduleLead.nome}
        />
      )}
      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
};

export default AgentDashboard;
