// Constants only - data now lives in the database

export const ORIGENS = ["WhatsApp", "Instagram", "Facebook", "Site", "Indicação", "Porta", "Ligação"] as const;

export const ETAPAS_FUNIL = [
  { id: "novo", label: "Novo Lead", color: "info" },
  { id: "agendado", label: "Agendado", color: "purple" },
  { id: "reagendado", label: "Reagendado", color: "purple" },
  { id: "confirmado", label: "Confirmado", color: "info" },
  { id: "na_loja", label: "Na Loja", color: "warning" },
  { id: "concluido", label: "Serviço Concluído", color: "success" },
  { id: "dispensado", label: "Dispensado", color: "destructive" },
  { id: "desqualificado_novo", label: "Desqualificado (Novo)", color: "destructive" },
  { id: "desqualificado_agendado", label: "Desqualificado (Agendado)", color: "destructive" },
  { id: "perdido", label: "Perdido", color: "destructive" },
] as const;

// Helper sets for metric grouping
export const ETAPAS_ANTES_LOJA = ["novo", "agendado", "reagendado"] as const;
export const ETAPAS_NA_LOJA = ["confirmado", "na_loja", "concluido"] as const;
export const ETAPAS_EVASAO_ANTES = ["desqualificado_novo", "desqualificado_agendado"] as const;
export const ETAPAS_EVASAO_DEPOIS = ["dispensado", "perdido"] as const;
export const ETAPAS_CARRO_AGENTE = ["confirmado", "na_loja", "concluido", "dispensado", "perdido"] as const;

export const SERVICOS_TAGS = [
  "Troca de Óleo", "Alinhamento", "Balanceamento", "Freios", "Suspensão",
  "Elétrica", "Ar Condicionado", "Revisão Completa", "Diagnóstico", "Outros"
];

export type UserRole = "agente" | "recepcionista" | "supervisor" | "gestor";

export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  origem: string;
  etapa: string;
  data_entrada: string;
  id_agente: string;
  id_unidade?: string | null;
  data_agendamento?: string | null;
  numero_os?: string | null;
  valor_servico?: number | null;
  tags_servico?: string[] | null;
  checkin?: string | null;
  checkout?: string | null;
  is_porta?: boolean | null;
  notas?: string | null;
  fup_concluido?: boolean;
  fup_concluido_em?: string | null;
  fup_concluido_numero?: number | null;
  fup_motivo_conclusao?: string | null;
}

export interface Evento {
  id: string;
  id_lead: string;
  tipo: "followup" | "lembrete";
  numero: number;
  data_prevista: string;
  concluido: boolean;
  data_conclusao?: string | null;
  descricao_conclusao?: string | null;
  descricao?: string | null;
  id_usuario?: string | null;
}

export interface Unidade {
  id: string;
  nome: string;
}
