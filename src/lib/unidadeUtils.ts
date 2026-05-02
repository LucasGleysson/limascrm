import type { Lead, Unidade } from "@/data/mockData";

export interface MinimalUser {
  id: string;
  cargo: "agente" | "recepcionista" | "supervisor" | "gestor";
  unidade_padrao?: string | null;
}

export interface AgentUnidadeRow {
  id_agente: string;
  id_unidade: string;
}

export interface MinimalProfile {
  id: string;
  nome: string;
  cargo: string;
  unidade_padrao?: string | null;
}

/**
 * Returns the unit IDs the user is allowed to operate on.
 * - gestor / supervisor: every unit
 * - agente: every unit linked via agente_unidades (N:N)
 * - recepcionista: only their unidade_padrao
 */
export function getUnidadesDoUsuario(
  user: MinimalUser | null | undefined,
  agentUnidades: AgentUnidadeRow[],
  unidades: Unidade[]
): string[] {
  if (!user) return [];
  if (user.cargo === "gestor" || user.cargo === "supervisor") {
    return unidades.map((u) => u.id);
  }
  if (user.cargo === "agente") {
    return agentUnidades
      .filter((au) => au.id_agente === user.id)
      .map((au) => au.id_unidade);
  }
  if (user.cargo === "recepcionista" && user.unidade_padrao) {
    return [user.unidade_padrao];
  }
  return [];
}

/** True if the user can see/operate on this lead. */
export function podeVerLead(
  user: MinimalUser | null | undefined,
  lead: Pick<Lead, "id_agente" | "id_unidade">,
  agentUnidades: AgentUnidadeRow[]
): boolean {
  if (!user) return false;
  if (user.cargo === "gestor" || user.cargo === "supervisor") return true;
  if (user.cargo === "agente") {
    if (lead.id_agente === user.id) return true;
    if (!lead.id_unidade) return false;
    return agentUnidades.some(
      (au) => au.id_agente === user.id && au.id_unidade === lead.id_unidade
    );
  }
  if (user.cargo === "recepcionista") {
    return !!user.unidade_padrao && lead.id_unidade === user.unidade_padrao;
  }
  return false;
}

/** Agents linked to a given unit (using ONLY the N:N table — no unidade_padrao fallback). */
export function getAgentesDaUnidade(
  unidadeId: string,
  profiles: MinimalProfile[],
  agentUnidades: AgentUnidadeRow[]
): MinimalProfile[] {
  const ids = new Set(
    agentUnidades.filter((au) => au.id_unidade === unidadeId).map((au) => au.id_agente)
  );
  return profiles.filter((p) => p.cargo === "agente" && ids.has(p.id));
}

/** Units a given agent is responsible for. */
export function getUnidadesDoAgente(
  agenteId: string,
  agentUnidades: AgentUnidadeRow[]
): string[] {
  return agentUnidades.filter((au) => au.id_agente === agenteId).map((au) => au.id_unidade);
}

/** Count leads attached to a unit, with optional extra filter. */
export function contarLeadsPorUnidade(
  leads: Lead[],
  unidadeId: string,
  filtro?: (l: Lead) => boolean
): number {
  return leads.reduce((acc, l) => {
    if (l.id_unidade !== unidadeId) return acc;
    if (filtro && !filtro(l)) return acc;
    return acc + 1;
  }, 0);
}

/** Count leads owned by an agent, with optional extra filter. */
export function contarLeadsPorAgente(
  leads: Lead[],
  agenteId: string,
  filtro?: (l: Lead) => boolean
): number {
  return leads.reduce((acc, l) => {
    if (l.id_agente !== agenteId) return acc;
    if (filtro && !filtro(l)) return acc;
    return acc + 1;
  }, 0);
}
