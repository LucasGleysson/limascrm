import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const [origem, setOrigem] = useState((isPorta || isReceptionist) ? "Porta" : "Instagram");
  const [numeroOs, setNumeroOs] = useState("");
  const [etapa, setEtapa] = useState(isPorta ? "na_loja" : "novo");
  const [confirmEntryOpen, setConfirmEntryOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome("");
    setTelefone("");
    setOrigem((isPorta || isReceptionist) ? "Porta" : "Instagram");
    setNumeroOs("");
    setEtapa(isPorta ? "na_loja" : "novo");
    setConfirmEntryOpen(false);
  }, [open, isPorta, isReceptionist]);

  const receptionistEtapas = ETAPAS_FUNIL.filter((e) =>
    ["na_loja", "agendado"].includes(e.id)
  );

  const handleSubmit = async (darEntradaAgora = isPorta || false) => {
    if (!nome || !telefone) return;
    const now = new Date().toISOString();
    const today = now.split("T")[0];
    const isWalkIn = isReceptionist ? darEntradaAgora : isPorta || false;
    const finalEtapa = isReceptionist ? (darEntradaAgora ? "confirmado" : "novo") : (isPorta ? "na_loja" : "novo");
    await addLead({
      nome,
      telefone: formatPhone(telefone),
      origem: origem || "Porta",
      etapa: finalEtapa,
      data_entrada: today,
      data_agendamento: isReceptionist && darEntradaAgora ? today : null,
      id_agente: isReceptionist ? null : currentUser.id,
      id_unidade: unidadeId || null,
      is_porta: isWalkIn,
      checkin: isWalkIn ? now : null,
      numero_os: numeroOs || null,
      id_recepcionista: isReceptionist ? currentUser.id : null,
      visitas_loja: isWalkIn ? 1 : 0,
    } as any);
    setNome("");
    setTelefone("");
    setOrigem("");
    setNumeroOs("");
    setEtapa(isPorta ? "na_loja" : "novo");
    onOpenChange(false);
  };

  const handlePrimarySubmit = () => {
    if (!canSubmit) return;
    if (isReceptionist) {
      setConfirmEntryOpen(true);
      return;
    }
    handleSubmit(isPorta || false);
  };

  const canSubmit = nome && telefone && (!isPorta && !isReceptionist ? !!origem : true);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && canSubmit) { e.preventDefault(); handlePrimarySubmit(); } }}>
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
              <Label>Número da OS <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input value={numeroOs} onChange={(e) => setNumeroOs(e.target.value)} placeholder="OS-2024-XXX" className="mt-1" />
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
          <Button onClick={handlePrimarySubmit} disabled={!canSubmit}>Cadastrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmEntryOpen} onOpenChange={setConfirmEntryOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Esse cliente vai dar entrada na loja agora?</AlertDialogTitle>
          <AlertDialogDescription>
            Se der entrada agora, ele ficará como confirmado para a recepção colocar em serviço ou dispensar. Caso contrário, será apenas cadastrado como cliente novo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleSubmit(false)}>Não, apenas cadastrar</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleSubmit(true)}>Sim, dar entrada</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};