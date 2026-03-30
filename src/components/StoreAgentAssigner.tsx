import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, X } from "lucide-react";

interface Agent {
  id: string;
  nome: string;
  unidade_padrao?: string | null;
}

interface Props {
  unidadeId: string;
  unitAgents: Agent[];
  allAgents: Agent[];
  onUpdated: () => void;
}

export const StoreAgentAssigner = ({ unidadeId, unitAgents, allAgents, onUpdated }: Props) => {
  const { toast } = useToast();
  const [assigning, setAssigning] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState("");

  const unassignedAgents = allAgents.filter(
    (a) => !unitAgents.some((u) => u.id === a.id)
  );

  const handleAssign = async () => {
    if (!selectedAgent) return;
    setAssigning(true);
    const { error } = await supabase
      .from("profiles")
      .update({ unidade_padrao: unidadeId })
      .eq("id", selectedAgent);

    if (error) {
      toast({ title: "Erro ao vincular agente", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agente vinculado com sucesso" });
      setSelectedAgent("");
      onUpdated();
    }
    setAssigning(false);
  };

  const handleUnassign = async (agentId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ unidade_padrao: null })
      .eq("id", agentId);

    if (error) {
      toast({ title: "Erro ao desvincular", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agente desvinculado" });
      onUpdated();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Agentes vinculados</h4>
        {unassignedAgents.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="Selecionar agente..." />
              </SelectTrigger>
              <SelectContent>
                {unassignedAgents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={handleAssign} disabled={!selectedAgent || assigning} className="h-8 gap-1 text-xs">
              <UserPlus className="h-3.5 w-3.5" /> Vincular
            </Button>
          </div>
        )}
      </div>

      {unitAgents.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {unitAgents.map((ag) => (
            <div key={ag.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm">
              <span className="font-medium">{ag.nome}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleUnassign(ag.id); }}
                className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Desvincular agente"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Nenhum agente vinculado a esta loja</p>
      )}
    </div>
  );
};
