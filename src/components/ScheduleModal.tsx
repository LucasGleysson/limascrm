import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLeads } from "@/contexts/LeadContext";
import { CalendarCheck } from "lucide-react";
import { appendNota } from "@/lib/notasUtils";
import { isDataPlausivel, formatDataSegura, MAX_DATA_ANOS_FUTURO } from "@/lib/leadUtils";
import { toast } from "sonner";
import { SERVICOS_TAGS } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadNome: string;
}

export const ScheduleModal = ({ open, onOpenChange, leadId, leadNome }: Props) => {
  const { updateLead, unidades, unidadesAtivas, leads, agentUnidades } = useLeads();
  const [unidade, setUnidade] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [os, setOs] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const submittingRef = useRef(false);

  const leadAtual = leads.find((l) => l.id === leadId);
  // Unidades do agente responsável pelo lead (N:N). Se não houver vínculos, cai pra todas as unidades.
  const agentUnitIds = leadAtual?.id_agente
    ? agentUnidades.filter((au) => au.id_agente === leadAtual.id_agente).map((au) => au.id_unidade)
    : [];
  const availableUnidades = agentUnitIds.length > 0
    ? unidadesAtivas.filter((u) => agentUnitIds.includes(u.id))
    : unidadesAtivas;
  const onlyOneUnit = availableUnidades.length === 1;

  useEffect(() => {
    if (open) {
      // pre-select if agent has only one unit, otherwise keep current lead unit if it's allowed
      const preselect = onlyOneUnit
        ? availableUnidades[0].id
        : (leadAtual?.id_unidade && availableUnidades.some((u) => u.id === leadAtual.id_unidade)
            ? leadAtual.id_unidade
            : "");
      setUnidade(preselect);
      setData("");
      setHora("");
      setOs("");
      setTags([]);
      submittingRef.current = false;
    }
  }, [open, leadId, onlyOneUnit, availableUnidades.length]);

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const maxDataStr = `${new Date().getFullYear() + MAX_DATA_ANOS_FUTURO}-12-31`;

  const handleSubmit = async () => {
    if (!unidade || !data || !os || tags.length === 0 || submittingRef.current) return;
    if (!isDataPlausivel(data)) {
      toast.error("Data de agendamento inválida. Confira o ano digitado.");
      return;
    }
    submittingRef.current = true;
    try {
      const unidadeNome = unidades.find((u) => u.id === unidade)?.nome || "Unidade";
      // Apenas leads que já passaram pela loja (ou já são re-reagendamentos) viram "reagendado".
      // "desqualificado_agendado" e "desqualificado_novo" nunca foram à loja → voltam para "agendado".
      const isReagendamento = !!leadAtual && ["dispensado", "perdido", "reagendado"].includes(leadAtual.etapa);
      const novoStatus = isReagendamento ? "reagendado" : "agendado";
      const notaLabel = isReagendamento ? "Reagendado" : "Agendado";
      const horaTxt = hora ? ` às ${hora}` : "";
      const notaTexto = `${unidadeNome} • ${formatDataSegura(data, "dd/MM/yyyy")}${horaTxt} • OS: ${os}`;
      const notas = appendNota(leadAtual?.notas, notaLabel, notaTexto);

      await updateLead(leadId, {
        etapa: novoStatus,
        id_unidade: unidade,
        data_agendamento: data,
        hora_agendamento: hora || null,
        numero_os: os,
        tags_servico: tags.length > 0 ? tags : null,
        notas,
      });
      onOpenChange(false);
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && unidade && data && os && tags.length > 0) { e.preventDefault(); handleSubmit(); } }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Agendar: {leadNome}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Unidade / Cidade</Label>
            <Select value={unidade} onValueChange={setUnidade} disabled={onlyOneUnit}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a unidade..." /></SelectTrigger>
              <SelectContent>
                {availableUnidades.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onlyOneUnit && (
              <p className="text-xs text-muted-foreground mt-1">Única unidade atendida pelo agente.</p>
            )}
            {availableUnidades.length === 0 && (
              <p className="text-xs text-destructive mt-1">Agente sem unidades vinculadas. Avise o gestor.</p>
            )}
          </div>
          <div>
            <Label>Data do Agendamento</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} min={todayStr} max={maxDataStr} className="mt-1" />
            {data && !isDataPlausivel(data) && (
              <p className="text-xs text-destructive mt-1">Data inválida — confira o ano digitado.</p>
            )}
          </div>
          <div>
            <Label>Horário de Atendimento</Label>
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="mt-1" />
            <p className="text-[11px] text-muted-foreground mt-1">Opcional — ajuda a ordenar a agenda do dia.</p>
          </div>
          <div>
            <Label>Número da OS</Label>
            <Input value={os} onChange={(e) => setOs(e.target.value)} placeholder="OS-2024-XXX" className="mt-1" />
          </div>
          <div>
            <Label>Serviços <span className="text-destructive">*</span></Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {SERVICOS_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={tags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            {tags.length === 0 && (
              <p className="text-xs text-destructive mt-1">Selecione ao menos um serviço.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!unidade || !data || !os || tags.length === 0 || submittingRef.current}>Confirmar Agendamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
