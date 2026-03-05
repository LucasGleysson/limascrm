import { useState, useMemo } from "react";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { UNIDADES, SERVICOS_TAGS, Lead, MOCK_USUARIOS } from "@/data/mockData";
import { StatsCard } from "@/components/StatsCard";
import { NewLeadModal } from "@/components/NewLeadModal";
import { LeadDetailSheet } from "@/components/LeadDetailSheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, LogOut, UserPlus, CalendarCheck, Users, DollarSign } from "lucide-react";

export const ReceptionistDashboard = () => {
  const { leads, updateLead, addInteracao } = useLeads();
  const { currentUser } = useRole();
  const unidadeId = currentUser.unidade_padrao || "6";
  const unidadeNome = UNIDADES.find((u) => u.id === unidadeId)?.nome || "";

  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLead, setCheckoutLead] = useState<Lead | null>(null);
  const [valor, setValor] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const todayLeads = useMemo(() => {
    return leads.filter(
      (l) => l.id_unidade === unidadeId && (l.data_agendamento === today || (l.checkin && l.checkin.startsWith(today)))
    );
  }, [leads, unidadeId, today]);

  const agendados = todayLeads.filter((l) => l.etapa === "agendado");
  const presentes = todayLeads.filter((l) => l.etapa === "compareceu");
  const concluidos = todayLeads.filter((l) => l.etapa === "concluido" && l.checkout?.startsWith(today));

  const faturamentoHoje = concluidos.reduce((s, l) => s + (l.valor_servico || 0), 0);

  const handleCheckin = (lead: Lead) => {
    const now = new Date().toISOString();
    updateLead(lead.id, { etapa: "compareceu", checkin: now });
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
    if (!checkoutLead || !valor) return;
    const now = new Date().toISOString();
    updateLead(checkoutLead.id, {
      etapa: "concluido",
      checkout: now,
      valor_servico: parseFloat(valor),
      tags_servico: tags,
    });
    addInteracao({
      id: `i${Date.now()}`,
      id_lead: checkoutLead.id,
      tipo: "checkout",
      descricao: `Serviço concluído - R$ ${parseFloat(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} - ${tags.join(", ")}`,
      data: now,
      id_usuario: currentUser.id,
    });
    setCheckoutOpen(false);
    setValor("");
    setTags([]);
  };

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recepção — {unidadeNome}</h1>
          <p className="text-muted-foreground text-sm">Chegadas e atendimentos do dia</p>
        </div>
        <Button onClick={() => setNewLeadOpen(true)} size="lg" className="gap-2">
          <UserPlus className="h-4 w-4" /> Cliente de Porta
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Agendados Hoje" value={agendados.length} icon={CalendarCheck} variant="info" />
        <StatsCard title="Presentes" value={presentes.length} icon={Users} variant="warning" />
        <StatsCard title="Concluídos" value={concluidos.length} icon={LogOut} variant="success" />
        <StatsCard title="Faturamento Hoje" value={`R$ ${faturamentoHoje.toLocaleString("pt-BR")}`} icon={DollarSign} variant="primary" />
      </div>

      {/* Agendados */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Aguardando Chegada</h2>
        {agendados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum agendamento pendente.</p>
        ) : (
          <div className="space-y-2">
            {agendados.map((lead) => {
              const agente = MOCK_USUARIOS.find((u) => u.id === lead.id_agente);
              return (
                <div key={lead.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border animate-slide-in">
                  <div className="flex-1 cursor-pointer" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                    <span className="font-semibold">{lead.nome}</span>
                    <p className="text-sm text-muted-foreground">{lead.telefone} · OS: {lead.numero_os} · Agente: {agente?.nome}</p>
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
              <div key={lead.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-success/20 animate-slide-in">
                <div className="flex-1 cursor-pointer" onClick={() => { setDetailLead(lead); setDetailOpen(true); }}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{lead.nome}</span>
                    {lead.is_porta && <Badge variant="outline">Porta</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{lead.telefone}</p>
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

      <NewLeadModal open={newLeadOpen} onOpenChange={setNewLeadOpen} isPorta unidadeId={unidadeId} />
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
              <Label>Valor do Serviço (R$)</Label>
              <Input type="number" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className="mt-1 text-lg" />
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
            <Button onClick={handleCheckoutSubmit} disabled={!valor}>Finalizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceptionistDashboard;
