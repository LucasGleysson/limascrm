import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLeads } from "@/contexts/LeadContext";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, AlertTriangle } from "lucide-react";

const SOFT_LIMIT = 3;

export const AgentUnitMatrix = () => {
  const { unidadesAtivas: unidades, profiles, agentUnidades, refreshAll } = useLeads();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [localLinks, setLocalLinks] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());

  // build local set "agentId:unitId" from canonical data, refreshed when source changes
  useEffect(() => {
    setLocalLinks(new Set(agentUnidades.map((au) => `${au.id_agente}:${au.id_unidade}`)));
  }, [agentUnidades]);

  const agentes = useMemo(
    () => profiles
      .filter((p) => p.cargo === "agente")
      .filter((p) => !search.trim() || p.nome.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => a.nome.localeCompare(b.nome)),
    [profiles, search]
  );

  const isLinked = (a: string, u: string) => localLinks.has(`${a}:${u}`);
  const countForAgent = (a: string) =>
    [...localLinks].filter((k) => k.startsWith(a + ":")).length;

  const toggle = async (agentId: string, unitId: string) => {
    const key = `${agentId}:${unitId}`;
    if (pending.has(key)) return;
    const linked = isLinked(agentId, unitId);
    // optimistic
    setLocalLinks((prev) => {
      const next = new Set(prev);
      if (linked) next.delete(key); else next.add(key);
      return next;
    });
    setPending((prev) => new Set(prev).add(key));
    try {
      if (linked) {
        const { error } = await supabase
          .from("agente_unidades")
          .delete()
          .eq("id_agente", agentId)
          .eq("id_unidade", unitId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("agente_unidades")
          .insert({ id_agente: agentId, id_unidade: unitId });
        if (error) throw error;
      }
      await refreshAll();
    } catch (e: any) {
      // revert
      setLocalLinks((prev) => {
        const next = new Set(prev);
        if (linked) next.add(key); else next.delete(key);
        return next;
      });
      toast({ title: "Erro ao atualizar vínculo", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Vínculos Agente ↔ Loja</h2>
          <p className="text-xs text-muted-foreground">
            Marque as lojas que cada agente atende. Sugerido até {SOFT_LIMIT} lojas por agente.
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar agente..."
            className="pl-8 h-9"
          />
        </div>
      </div>

      {agentes.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nenhum agente encontrado.</p>
      ) : (
        <div className="overflow-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 sticky left-0 bg-muted/50 z-10">Agente</th>
                {unidades.map((u) => (
                  <th key={u.id} className="px-3 py-2 text-center whitespace-nowrap">{u.nome}</th>
                ))}
                <th className="px-3 py-2 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {agentes.map((ag) => {
                const total = countForAgent(ag.id);
                return (
                  <tr key={ag.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 sticky left-0 bg-card font-medium z-10">{ag.nome}</td>
                    {unidades.map((u) => {
                      const key = `${ag.id}:${u.id}`;
                      return (
                        <td key={u.id} className="px-3 py-2 text-center">
                          <Checkbox
                            checked={isLinked(ag.id, u.id)}
                            disabled={pending.has(key)}
                            onCheckedChange={() => toggle(ag.id, u.id)}
                          />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      {total > SOFT_LIMIT ? (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1">
                          <AlertTriangle className="h-3 w-3" />{total}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{total}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};