import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ORIGENS, ETAPAS_FUNIL } from "@/data/mockData";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { UserPlus } from "lucide-react";
import { maskPhoneInput, formatPhone } from "@/lib/phoneUtils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPorta?: boolean;
  unidadeId?: string;
  isReceptionist?: boolean;
}

export const NewLeadModal = ({ open, onOpenChange, isPorta, unidadeId, isReceptionist }: Props) => {
  const { addLead } = useLeads();
  const { currentUser } = useRole();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [origem, setOrigem] = useState(isPorta ? "Porta" : "Instagram");
  const [numeroOs, setNumeroOs] = useState("");
  const [etapa, setEtapa] = useState(isPorta ? "na_loja" : "novo");

  const receptionistEtapas = ETAPAS_FUNIL.filter((e) =>
    ["na_loja", "agendado"].includes(e.id)
  );

  const handleSubmit = async () => {
    if (!nome || !telefone) return;
    if (isReceptionist && !numeroOs) return;
    const now = new Date().toISOString();
    const finalEtapa = isReceptionist ? etapa : (isPorta ? "na_loja" : "novo");
    await addLead({
      nome,
      telefone: formatPhone(telefone),
      origem: origem || "Porta",
      etapa: finalEtapa,
      data_entrada: now.split("T")[0],
      id_agente: currentUser.id,
      id_unidade: unidadeId || null,
      is_porta: isPorta || false,
      checkin: (isReceptionist && etapa === "na_loja") || isPorta ? now : null,
      numero_os: numeroOs || null,
    });
    setNome("");
    setTelefone("");
    setOrigem("");
    setNumeroOs("");
    setEtapa(isPorta ? "na_loja" : "novo");
    onOpenChange(false);
  };

  const canSubmit = nome && telefone && (isReceptionist ? !!numeroOs : (!isPorta ? !!origem : true));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {isReceptionist ? "Novo Cliente" : isPorta ? "Cliente de Porta" : "Novo Lead"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do cliente" className="mt-1" />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={telefone} onChange={(e) => setTelefone(maskPhoneInput(e.target.value))} placeholder="(00) 99999-9999" className="mt-1" />
          </div>
          {isReceptionist && (
            <div>
              <Label>Número da OS</Label>
              <Input value={numeroOs} onChange={(e) => setNumeroOs(e.target.value)} placeholder="OS-2024-XXX" className="mt-1" />
            </div>
          )}
          {isReceptionist && (
            <div>
              <Label>Status</Label>
              <Select value={etapa} onValueChange={setEtapa}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {receptionistEtapas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Origem {isReceptionist && <span className="text-muted-foreground text-xs">(opcional, padrão: Porta)</span>}</Label>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {ORIGENS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>Cadastrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};