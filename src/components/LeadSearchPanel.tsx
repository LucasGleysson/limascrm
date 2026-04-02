import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadDetailSheet } from "./LeadDetailSheet";
import { useLeads } from "@/contexts/LeadContext";
import { useRole } from "@/contexts/RoleContext";
import { Lead, ETAPAS_FUNIL } from "@/data/mockData";
import { Search, Loader2, Trash2, User, Phone, FileText, MapPin } from "lucide-react";
import { formatPhone } from "@/lib/phoneUtils";
import { formatDateBR } from "@/lib/leadUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const LeadSearchPanel = () => {
  const { unidades, profiles, deleteLead } = useLeads();
  const { currentUser } = useRole();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Lead[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canDelete = currentUser?.cargo === "gestor" || currentUser?.cargo === "supervisor";

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);

    try {
      // Search by nome (ilike), telefone (ilike), or numero_os (ilike)
      const [byNome, byTelefone, byOs] = await Promise.all([
        supabase.from("leads").select("*").ilike("nome", `%${q}%`).order("created_at", { ascending: false }).limit(50),
        supabase.from("leads").select("*").ilike("telefone", `%${q}%`).order("created_at", { ascending: false }).limit(50),
        supabase.from("leads").select("*").ilike("numero_os", `%${q}%`).order("created_at", { ascending: false }).limit(50),
      ]);

      // Merge and deduplicate
      const allRows = [
        ...(byNome.data || []),
        ...(byTelefone.data || []),
        ...(byOs.data || []),
      ];
      const seen = new Set<string>();
      const unique: Lead[] = [];
      for (const row of allRows) {
        if (!seen.has(row.id)) {
          seen.add(row.id);
          unique.push({
            id: row.id,
            nome: row.nome,
            telefone: row.telefone,
            origem: row.origem,
            etapa: row.etapa,
            data_entrada: row.data_entrada,
            id_agente: row.id_agente,
            id_unidade: row.id_unidade,
            data_agendamento: row.data_agendamento,
            numero_os: row.numero_os,
            valor_servico: row.valor_servico ? Number(row.valor_servico) : null,
            tags_servico: row.tags_servico,
            checkin: row.checkin,
            checkout: row.checkout,
            is_porta: row.is_porta,
            notas: row.notas,
          });
        }
      }
      setResults(unique);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLead(deleteTarget.id);
      setResults((prev) => prev.filter((l) => l.id !== deleteTarget.id));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getAgentName = (id: string) => profiles.find((p) => p.id === id)?.nome || "—";
  const getUnidadeName = (id?: string | null) => id ? unidades.find((u) => u.id === id)?.nome || "—" : "—";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pesquisa de Leads</h1>
        <p className="text-muted-foreground text-sm">Busque por nome, telefone ou OS em todas as cidades e agentes</p>
      </div>

      <div className="flex gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome, telefone ou número da OS..."
          className="max-w-md"
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
        />
        <Button onClick={handleSearch} disabled={loading || !query.trim()} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar
        </Button>
      </div>

      {searched && !loading && results.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum resultado encontrado.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{results.length} resultado(s)</p>
          {results.map((lead) => {
            const etapa = ETAPAS_FUNIL.find((e) => e.id === lead.etapa);
            return (
              <div
                key={lead.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border cursor-pointer hover:bg-muted/50 transition-all"
                onClick={() => { setDetailLead(lead); setDetailOpen(true); }}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{lead.nome}</span>
                    <Badge variant={["dispensado", "perdido", "desqualificado_novo", "desqualificado_agendado"].includes(lead.etapa) ? "destructive" : lead.etapa === "novo" ? "secondary" : "default"}>
                      {etapa?.label || lead.etapa}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{formatPhone(lead.telefone)}</span>
                    {lead.numero_os && <span className="flex items-center gap-1"><FileText className="h-3 w-3" />OS: {lead.numero_os}</span>}
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{getUnidadeName(lead.id_unidade)}</span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{getAgentName(lead.id_agente)}</span>
                    <span>{formatDateBR(lead.data_entrada)}</span>
                  </div>
                </div>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(lead); }}
                    title="Excluir registro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <LeadDetailSheet lead={detailLead} open={detailOpen} onOpenChange={setDetailOpen} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lead <strong>{deleteTarget?.nome}</strong>? Esta ação não pode ser desfeita. Todos os eventos relacionados também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
