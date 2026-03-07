// Constants only - data now lives in the database

export const ORIGENS = ["WhatsApp", "Instagram", "Facebook", "Site", "Indicação", "Porta"] as const;

export const ETAPAS_FUNIL = [
  { id: "novo", label: "Novo Lead", color: "info" },
  { id: "agendado", label: "Agendado", color: "purple" },
  { id: "confirmado", label: "Confirmado", color: "info" },
  { id: "na_loja", label: "Na Loja", color: "warning" },
  { id: "concluido", label: "Serviço Concluído", color: "success" },
  { id: "dispensado", label: "Dispensado", color: "destructive" },
  { id: "perdido", label: "Perdido", color: "destructive" },
  { id: "desqualificado", label: "Desqualificado", color: "destructive" },
] as const;

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
}

export interface Evento {
  id: string;
  id_lead: string;
  tipo: "followup";
  numero: number;
  data_prevista: string;
  concluido: boolean;
  data_conclusao?: string | null;
  descricao_conclusao?: string | null;
  id_usuario?: string | null;
}

export interface Unidade {
  id: string;
  nome: string;
}