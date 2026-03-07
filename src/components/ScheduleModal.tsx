import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLeads } from "@/contexts/LeadContext";
import { CalendarCheck } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadNome: string;
}

export const ScheduleModal = ({ open, onOpenChange, leadId, leadNome }: Props) => {
  const { updateLead, unidades } = useLeads();
  const [unidade, setUnidade] = useState("");
  const [data, setData] = useState("");
  const [os, setOs] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];

  const handleSubmit = async () => {
    if (!unidade || !data || !os) return;
    await updateLead(leadId, {
      etapa: "agendado",
      id_unidade: unidade,
      data_agendamento: data,
      numero_os: os,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Agendar: {leadNome}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Unidade / Cidade</Label>
            <Select value={unidade} onValueChange={setUnidade}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a unidade..." /></SelectTrigger>
              <SelectContent>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data do Agendamento</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} min={todayStr} className="mt-1" />
          </div>
          <div>
            <Label>Número da OS</Label>
            <Input value={os} onChange={(e) => setOs(e.target.value)} placeholder="OS-2024-XXX" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!unidade || !data || !os}>Confirmar Agendamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};