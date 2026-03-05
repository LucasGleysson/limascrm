import { useLeads } from "@/contexts/LeadContext";
import { MOCK_USUARIOS } from "@/data/mockData";
import { MessageSquare, ArrowRight, LogIn, LogOut, StickyNote } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const tipoIcons = {
  mudanca_etapa: ArrowRight,
  follow_up: MessageSquare,
  checkin: LogIn,
  checkout: LogOut,
  nota: StickyNote,
};

const tipoColors = {
  mudanca_etapa: "bg-info/10 text-info border-info/20",
  follow_up: "bg-primary/10 text-primary border-primary/20",
  checkin: "bg-success/10 text-success border-success/20",
  checkout: "bg-success/10 text-success border-success/20",
  nota: "bg-muted text-muted-foreground border-border",
};

export const LeadTimeline = ({ leadId }: { leadId: string }) => {
  const { interacoes } = useLeads();
  const timeline = interacoes
    .filter((i) => i.id_lead === leadId)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  if (timeline.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Nenhuma interação registrada.</p>;
  }

  return (
    <div className="space-y-3">
      {timeline.map((item) => {
        const Icon = tipoIcons[item.tipo];
        const user = MOCK_USUARIOS.find((u) => u.id === item.id_usuario);
        return (
          <div key={item.id} className="flex gap-3 animate-fade-in">
            <div className={`rounded-full p-2 border shrink-0 ${tipoColors[item.tipo]}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">{item.descricao}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {user?.nome} · {format(new Date(item.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
