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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPorta?: boolean;
  unidadeId?: string;
  isReceptionist?: boolean;
  allowAgentSelection?: boolean;
}

export const NewLeadModal = ({ open, onOpenChange, isPorta, unidadeId, isReceptionist, allowAgentSelection }: Props) => {
  const { addLead, profiles } = useLeads() as any;
  const { currentUser } = useRole();
  const { toast } = useToast();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [origem, setOrigem] = useState((isPorta || isReceptionist) ? "Porta" : "Instagram");
  const [numeroOs, setNumeroOs] = useState("");
  const [etapa, setEtapa] = useState(isPorta ? "na_loja" : "novo");
  const [agenteId, setAgenteId] = useState<string>("");
  const [confirmEntryOpen, setConfirmEntryOpen] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [dupOpen, setDupOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isPrivileged = currentUser?.cargo === "gestor" || currentUser?.cargo === "supervisor";
  const agentes = (profiles || []).filter((p: any) => p.cargo === "agente");

  useEffect(() => {
    if (!open) return;
    setNome("");
    setTelefone("");
    setOrigem((isPorta || isReceptionist) ? "Porta" : "Instagram");
    setNumeroOs("");
    setEtapa(isPorta ? "na_loja" : "novo");
    setAgenteId("");
    setConfirmEntryOpen(false);
    setDuplicates([]);
    setDupOpen(false);
    setSubmitting(false);
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
    // Unidade só vem do contexto da tela (porta/recepcionista). Agente registra sem unidade.
    const finalUnidade = unidadeId || (isReceptionist ? (currentUser?.unidade_padrao || null) : null);
    const finalAgente = allowAgentSelection
      ? (agenteId || null)
      : (isReceptionist ? null : currentUser.id);
    await addLead({
      nome,
      telefone: formatPhone(telefone),
      origem: origem || "Porta",
      etapa: finalEtapa,
      data_entrada: today,
      data_agendamento: isReceptionist && darEntradaAgora ? today : null,
      id_agente: finalAgente,
      id_unidade: finalUnidade,
      is_porta: isWalkIn,
      checkin: isWalkIn ? now : null,
      numero_os: numeroOs || null,
      id_recepcionista: isReceptionist ? currentUser.id : null,
      visitas_loja: isWalkIn ? 1 : 0,
    } as any);
    onOpenChange(false);
  };

  const checkDuplicateAndSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const digits = telefone.replace(/\D/g, "");
      if (digits.length >= 8) {
        const { data } = await supabase.rpc("find_lead_by_phone" as any, { _phone_digits: digits });
        if (data && (data as any[]).length > 0) {
          setDuplicates(data as any[]);
          setDupOpen(true);
          return;
        }
      }
      await proceedSubmit();
    } catch (e: any) {
      toast({ title: "Erro ao verificar duplicidade", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const proceedSubmit = async () => {
    if (!canSubmit) return;
    if (isReceptionist) {
      setConfirmEntryOpen(true);
      return;
    }
    await handleSubmit(isPorta || false);
  };

  const canSubmit =
    !!nome && !!telefone &&
    (!isPorta && !isReceptionist ? !!origem : true) &&
    (allowAgentSelection ? !!agenteId : true);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && canSubmit) { e.preventDefault(); checkDuplicateAndSubmit(); } }}>
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
          {allowAgentSelection && (
            <div>
              <Label>Agente responsável</Label>
              <Select value={agenteId} onValueChange={setAgenteId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o agente..." /></SelectTrigger>
                <SelectContent>
                  {agentes.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {!isReceptionist && !isPorta && (
            <p className="text-xs text-muted-foreground">
              A unidade será definida na hora do agendamento.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={checkDuplicateAndSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Verificando..." : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog open={dupOpen} onOpenChange={setDupOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Telefone já cadastrado</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>Já existe {duplicates.length === 1 ? "um lead" : `${duplicates.length} leads`} com este telefone:</p>
              <ul className="space-y-1 text-sm">
                {duplicates.map((d) => (
                  <li key={d.id} className="rounded-md border border-border bg-muted/30 p-2">
                    <span className="font-semibold">{d.nome}</span>
                    <span className="text-muted-foreground"> • {d.etapa}</span>
                    {d.agente_nome && <span className="text-muted-foreground"> • {d.agente_nome}</span>}
                    {d.unidade_nome && <span className="text-muted-foreground"> • {d.unidade_nome}</span>}
                  </li>
                ))}
              </ul>
              {!isPrivileged && (
                <p className="text-xs text-muted-foreground">
                  Procure o lead existente. Caso precise criar mesmo assim, peça a um gestor.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {isPrivileged && (
            <AlertDialogAction onClick={async () => { setDupOpen(false); await proceedSubmit(); }}>
              Cadastrar mesmo assim
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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