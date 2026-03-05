import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORIGENS } from "@/data/mockData";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { UserPlus } from "lucide-react";
import { maskPhoneInput, formatPhone } from "@/lib/phoneUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPorta?: boolean;
  unidadeId?: string;
}

export const NewLeadModal = ({ open, onOpenChange, isPorta, unidadeId }: Props) => {
  const { addLead, addInteracao } = useLeads();
  const { currentUser } = useRole();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [origem, setOrigem] = useState(isPorta ? "Porta" : "");

  const handleSubmit = () => {
    if (!nome || !telefone) return;
    const id = `l${Date.now()}`;
    const now = new Date().toISOString();
    addLead({
      id,
      nome,
      telefone: formatPhone(telefone),
      origem: isPorta ? "Porta" : origem,
      etapa: isPorta ? "na_loja" : "novo",
      data_entrada: now.split("T")[0],
      id_agente: currentUser.id,
      id_unidade: unidadeId,
      is_porta: isPorta,
      checkin: isPorta ? now : undefined,
    });
    addInteracao({
      id: `i${Date.now()}`,
      id_lead: id,
      tipo: "mudanca_etapa",
      descricao: isPorta ? "Cliente de porta registrado com check-in" : "Lead criado como 'Novo Lead'",
      data: now,
      id_usuario: currentUser.id,
    });
    setNome("");
    setTelefone("");
    setOrigem("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {isPorta ? "Cliente de Porta" : "Novo Lead"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do cliente" className="mt-1" />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input
              value={telefone}
              onChange={(e) => setTelefone(maskPhoneInput(e.target.value))}
              placeholder="(00) 99999-9999"
              className="mt-1"
            />
          </div>
          {!isPorta && (
            <div>
              <Label>Origem</Label>
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {ORIGENS.filter((o) => o !== "Porta").map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!nome || !telefone || (!isPorta && !origem)}>Cadastrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
