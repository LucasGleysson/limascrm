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
  { id: "analise_supervisor", label: "Análise Supervisor", color: "warning" },
  { id: "trabalhado", label: "Trabalhado", color: "muted" },
  { id: "sem_retorno", label: "Sem retorno", color: "muted" },
  { id: "nao_convertido", label: "Não convertido", color: "destructive" },
  { id: "desqualificado_novo", label: "Desqualificado", color: "destructive" },
  { id: "desqualificado_agendado", label: "Agendados Trabalhados", color: "destructive" },
  { id: "perdido", label: "Perdido", color: "destructive" },
] as const;

// Helper sets for metric grouping
export const ETAPAS_ANTES_LOJA = ["novo", "agendado", "reagendado"] as const;
export const ETAPAS_NA_LOJA = ["confirmado", "na_loja", "concluido"] as const;
export const ETAPAS_EVASAO_ANTES = ["desqualificado_novo", "desqualificado_agendado", "sem_retorno", "nao_convertido"] as const;
export const ETAPAS_EVASAO_DEPOIS = ["dispensado", "perdido"] as const;
export const ETAPAS_CARRO_AGENTE = ["confirmado", "na_loja", "concluido", "dispensado", "perdido"] as const;

/** Serviços obrigatórios no agendamento */
export const SERVICOS_TAGS = [
  "Alinhamento", "Balanceamento", "Óleo e Filtro", "Suspensão", "Freios",
  "Avaliação", "Revisão/Checkup", "Cambagem", "Correia Dentada",
];

/** Motivos obrigatórios de dispensa (cliente esteve na loja) */
export const TAGS_MOTIVO_DISPENSA = [
  "Loja Cheia", "Orçamento Alto", "Mal Atendimento", "Reagendado pelo Gerente", "Falta de Peças",
];
// alias legado
export const TAGS_MOTIVO_OS = TAGS_MOTIVO_DISPENSA;

/** Motivos obrigatórios de desqualificação */
export const TAGS_MOTIVO_DESQUALIFICACAO = [
  "Não tem Carro", "Outra Cidade", "Clicou sem querer",
];
// alias legado
export const TAGS_MOTIVO_NOVO = TAGS_MOTIVO_DESQUALIFICACAO;

/** Motivos obrigatórios ao marcar como Trabalhado */
export const TAGS_MOTIVO_TRABALHADO = [
  "Sem interação", "Não fazemos serviço", "Em breve", "Retirada de peça",
  "Sem retorno pós orçamento", "Clicou sem querer", "Garantia",
];


export type UserRole = "agente" | "recepcionista" | "supervisor" | "gestor";

export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  origem: string;
  etapa: string;
  data_entrada: string;
  id_agente: string | null;
  id_unidade?: string | null;
  data_agendamento?: string | null;
  hora_agendamento?: string | null;
  numero_os?: string | null;
  valor_servico?: number | null;
  tags_servico?: string[] | null;
  checkin?: string | null;
  checkout?: string | null;
  is_porta?: boolean | null;
  notas?: string | null;
  id_recepcionista?: string | null;
  tags_motivo?: string[] | null;
  fup_concluido?: boolean;
  fup_concluido_em?: string | null;
  fup_concluido_numero?: number | null;
  fup_motivo_conclusao?: string | null;
  visitas_loja?: number;
  created_at?: string;
  updated_at?: string;
  dispensado_em?: string | null;
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
  ativa?: boolean;
  ordem?: number | null;
}
