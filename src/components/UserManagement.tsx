import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLeads } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, Shield } from "lucide-react";
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

type AppRole = "agente" | "recepcionista" | "supervisor" | "gestor";

interface Profile {
  id: string;
  nome: string;
  email: string;
  cargo: AppRole;
  unidade_padrao: string | null;
  created_at: string;
}

const CARGO_LABELS: Record<AppRole, string> = {
  agente: "Agente",
  recepcionista: "Recepcionista",
  supervisor: "Supervisor",
  gestor: "Gestor",
};

const CARGO_COLORS: Record<AppRole, string> = {
  agente: "bg-info/10 text-info border-info/20",
  recepcionista: "bg-warning/10 text-warning border-warning/20",
  supervisor: "bg-purple/10 text-purple border-purple/20",
  gestor: "bg-primary/10 text-primary border-primary/20",
};

export const UserManagement = () => {
  const { unidades } = useLeads();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [deletingUser, setDeletingUser] = useState<Profile | null>(null);
  const { toast } = useToast();

  // Form state
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargo, setCargo] = useState<AppRole>("agente");
  const [unidadePadrao, setUnidadePadrao] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await supabase.functions.invoke("manage-users", {
      body: { action: "list" },
    });

    if (res.data?.profiles) {
      setProfiles(res.data.profiles);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const openCreate = () => {
    setEditingUser(null);
    setNome("");
    setEmail("");
    setPassword("");
    setCargo("agente");
    setUnidadePadrao("");
    setModalOpen(true);
  };

  const openEdit = (profile: Profile) => {
    setEditingUser(profile);
    setNome(profile.nome);
    setEmail(profile.email);
    setPassword("");
    setCargo(profile.cargo);
    setUnidadePadrao(profile.unidade_padrao || "");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim() || !email.trim()) {
      toast({ title: "Preencha nome e email", variant: "destructive" });
      return;
    }
    if (!editingUser && !password.trim()) {
      toast({ title: "Defina uma senha para o novo usuário", variant: "destructive" });
      return;
    }

    setSaving(true);

    if (editingUser) {
      const res = await supabase.functions.invoke("manage-users", {
        body: {
          action: "update",
          user_id: editingUser.id,
          nome,
          email: email !== editingUser.email ? email : undefined,
          cargo,
          unidade_padrao: unidadePadrao || null,
          password: password || undefined,
        },
      });

      if (res.error) {
        toast({ title: "Erro ao atualizar", description: String(res.error), variant: "destructive" });
      } else {
        toast({ title: "Usuário atualizado com sucesso" });
        setModalOpen(false);
        fetchProfiles();
      }
    } else {
      const res = await supabase.functions.invoke("manage-users", {
        body: {
          action: "create",
          nome,
          email,
          password,
          cargo,
          unidade_padrao: unidadePadrao || null,
        },
      });

      if (res.error || res.data?.error) {
        toast({ title: "Erro ao criar usuário", description: res.data?.error || String(res.error), variant: "destructive" });
      } else {
        toast({ title: "Usuário criado com sucesso" });
        setModalOpen(false);
        fetchProfiles();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    const res = await supabase.functions.invoke("manage-users", {
      body: { action: "delete", user_id: deletingUser.id },
    });

    if (res.error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Usuário excluído" });
      fetchProfiles();
    }
    setDeleteDialogOpen(false);
    setDeletingUser(null);
  };

  const needsUnidade = cargo === "recepcionista";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Usuários</h1>
          <p className="text-muted-foreground text-sm">Crie, edite e gerencie os perfis do sistema</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Users list */}
      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : profiles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Nenhum usuário cadastrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {profiles.map((profile) => {
            const unidade = UNIDADES.find((u) => u.id === profile.unidade_padrao);
            return (
              <div
                key={profile.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow"
              >
                <div className="rounded-full bg-muted h-10 w-10 flex items-center justify-center text-sm font-bold">
                  {profile.nome.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{profile.nome}</p>
                  <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                </div>
                <Badge variant="outline" className={`text-xs ${CARGO_COLORS[profile.cargo]}`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {CARGO_LABELS[profile.cargo]}
                </Badge>
                {unidade && (
                  <Badge variant="outline" className="text-xs">
                    {unidade.nome}
                  </Badge>
                )}
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(profile)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => { setDeletingUser(profile); setDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Altere as informações do usuário." : "Preencha os dados para criar um novo perfil."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome de exibição</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
            </div>

            <div className="space-y-2">
              <Label>Email (login)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" />
            </div>

            <div className="space-y-2">
              <Label>{editingUser ? "Nova senha (deixe em branco para manter)" : "Senha"}</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={editingUser ? "••••••••" : "Mínimo 6 caracteres"}
              />
            </div>

            <div className="space-y-2">
              <Label>Cargo / Função</Label>
              <Select value={cargo} onValueChange={(v) => setCargo(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agente">Agente</SelectItem>
                  <SelectItem value="recepcionista">Recepcionista</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(needsUnidade || unidadePadrao) && (
              <div className="space-y-2">
                <Label>Unidade padrão {needsUnidade && <span className="text-destructive">*</span>}</Label>
                <Select value={unidadePadrao} onValueChange={setUnidadePadrao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingUser ? "Salvar" : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deletingUser?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
