import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Lead, UNIDADES, ETAPAS_FUNIL, MOCK_USUARIOS } from "@/data/mockData";
import { LeadTimeline } from "./LeadTimeline";
import { Phone, MapPin, Calendar, FileText, User, Tag } from "lucide-react";

const etapaBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  novo: "secondary",
  tentativa_contato: "outline",
  contato_feito: "default",
  agendado: "default",
  compareceu: "default",
  concluido: "default",
  perdido: "destructive",
};

export const LeadDetailSheet = ({ lead, open, onOpenChange }: { lead: Lead | null; open: boolean; onOpenChange: (v: boolean) => void }) => {
  if (!lead) return null;
  const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
  const unidade = UNIDADES.find((u) => u.id === lead.id_unidade);
  const agente = MOCK_USUARIOS.find((u) => u.id === lead.id_agente);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{lead.nome}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant={etapaBadgeVariant[lead.etapa] || "secondary"}>{etapa?.label}</Badge>
            {lead.is_porta && <Badge variant="outline">Porta</Badge>}
            {lead.origem && <Badge variant="outline">{lead.origem}</Badge>}
          </div>

          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" /> {lead.telefone}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" /> Agente: {agente?.nome || "—"}
            </div>
            {unidade && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" /> {unidade.nome}
              </div>
            )}
            {lead.data_agendamento && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" /> {lead.data_agendamento}
              </div>
            )}
            {lead.numero_os && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" /> {lead.numero_os}
              </div>
            )}
            {lead.valor_servico && (
              <div className="flex items-center gap-2 font-semibold">
                R$ {lead.valor_servico.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            )}
            {lead.tags_servico && lead.tags_servico.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {lead.tags_servico.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-semibold mb-3">Timeline</h4>
            <LeadTimeline leadId={lead.id} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
