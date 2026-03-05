export const UNIDADES = [
  { id: "1", nome: "Serrana" },
  { id: "2", nome: "Laranjeiras" },
  { id: "3", nome: "Grandville" },
  { id: "4", nome: "Patrocínio" },
  { id: "5", nome: "Araguari" },
  { id: "6", nome: "Catalão" },
] as const;

export const ORIGENS = ["WhatsApp", "Instagram", "Facebook", "Google Ads", "Indicação", "Porta"] as const;

export const ETAPAS_FUNIL = [
  { id: "novo", label: "Novo Lead", color: "info" },
  { id: "tentativa_contato", label: "Tentativa de Contato", color: "warning" },
  { id: "contato_feito", label: "Contato Feito", color: "primary" },
  { id: "agendado", label: "Agendado", color: "success" },
  { id: "compareceu", label: "Compareceu", color: "success" },
  { id: "concluido", label: "Concluído", color: "success" },
  { id: "perdido", label: "Perdido", color: "destructive" },
] as const;

export const SERVICOS_TAGS = [
  "Troca de Óleo", "Alinhamento", "Balanceamento", "Freios", "Suspensão",
  "Elétrica", "Ar Condicionado", "Revisão Completa", "Diagnóstico", "Outros"
];

export type UserRole = "agente" | "recepcionista" | "supervisor" | "gestor";

export interface Usuario {
  id: string;
  nome: string;
  cargo: UserRole;
  unidade_padrao?: string;
}

export interface Lead {
  id: string;
  nome: string;
  telefone: string;
  origem: string;
  etapa: string;
  data_entrada: string;
  id_agente: string;
  id_unidade?: string;
  data_agendamento?: string;
  numero_os?: string;
  valor_servico?: number;
  tags_servico?: string[];
  checkin?: string;
  checkout?: string;
  is_porta?: boolean;
}

export interface Interacao {
  id: string;
  id_lead: string;
  tipo: "mudanca_etapa" | "follow_up" | "checkin" | "checkout" | "nota";
  descricao: string;
  data: string;
  id_usuario: string;
}

export const MOCK_USUARIOS: Usuario[] = [
  { id: "a1", nome: "João Silva", cargo: "agente" },
  { id: "a2", nome: "Pedro Santos", cargo: "agente" },
  { id: "a3", nome: "Maria Oliveira", cargo: "agente" },
  { id: "r1", nome: "Ana Costa", cargo: "recepcionista", unidade_padrao: "6" },
  { id: "r2", nome: "Lucas Ferreira", cargo: "recepcionista", unidade_padrao: "1" },
  { id: "s1", nome: "Carlos Mendes", cargo: "supervisor" },
  { id: "g1", nome: "Roberto Lima", cargo: "gestor" },
];

const today = new Date().toISOString().split("T")[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

export const MOCK_LEADS: Lead[] = [
  { id: "l1", nome: "Fernando Almeida", telefone: "(34) 99999-0001", origem: "WhatsApp", etapa: "novo", data_entrada: today, id_agente: "a1" },
  { id: "l2", nome: "Camila Rocha", telefone: "(34) 99999-0002", origem: "Instagram", etapa: "contato_feito", data_entrada: yesterday, id_agente: "a1" },
  { id: "l3", nome: "Ricardo Souza", telefone: "(34) 99999-0003", origem: "Google Ads", etapa: "agendado", data_entrada: yesterday, id_agente: "a1", id_unidade: "6", data_agendamento: today, numero_os: "OS-2024-001" },
  { id: "l4", nome: "Juliana Martins", telefone: "(34) 99999-0004", origem: "Facebook", etapa: "novo", data_entrada: today, id_agente: "a2" },
  { id: "l5", nome: "Marcos Pereira", telefone: "(34) 99999-0005", origem: "Indicação", etapa: "agendado", data_entrada: yesterday, id_agente: "a2", id_unidade: "1", data_agendamento: today, numero_os: "OS-2024-002" },
  { id: "l6", nome: "Patricia Lima", telefone: "(34) 99999-0006", origem: "WhatsApp", etapa: "compareceu", data_entrada: yesterday, id_agente: "a1", id_unidade: "6", data_agendamento: today, numero_os: "OS-2024-003", checkin: `${today}T09:30:00` },
  { id: "l7", nome: "André Barbosa", telefone: "(34) 99999-0007", origem: "Porta", etapa: "compareceu", data_entrada: today, id_agente: "a1", id_unidade: "6", checkin: `${today}T10:00:00`, is_porta: true },
  { id: "l8", nome: "Sofia Dias", telefone: "(34) 99999-0008", origem: "Google Ads", etapa: "concluido", data_entrada: "2024-12-01", id_agente: "a2", id_unidade: "1", valor_servico: 450, tags_servico: ["Troca de Óleo", "Alinhamento"], checkout: "2024-12-02T15:00:00" },
  { id: "l9", nome: "Bruno Castro", telefone: "(34) 99999-0009", origem: "WhatsApp", etapa: "concluido", data_entrada: "2024-12-05", id_agente: "a1", id_unidade: "6", valor_servico: 1200, tags_servico: ["Revisão Completa"], checkout: "2024-12-06T16:00:00" },
  { id: "l10", nome: "Letícia Nunes", telefone: "(34) 99999-0010", origem: "Instagram", etapa: "perdido", data_entrada: "2024-12-03", id_agente: "a3" },
  { id: "l11", nome: "Gustavo Reis", telefone: "(34) 99999-0011", origem: "Facebook", etapa: "tentativa_contato", data_entrada: today, id_agente: "a3" },
  { id: "l12", nome: "Helena Moura", telefone: "(34) 99999-0012", origem: "WhatsApp", etapa: "agendado", data_entrada: yesterday, id_agente: "a3", id_unidade: "4", data_agendamento: today, numero_os: "OS-2024-004" },
];

export const MOCK_INTERACOES: Interacao[] = [
  { id: "i1", id_lead: "l1", tipo: "mudanca_etapa", descricao: "Lead criado como 'Novo Lead'", data: `${today}T08:00:00`, id_usuario: "a1" },
  { id: "i2", id_lead: "l2", tipo: "mudanca_etapa", descricao: "Movido para 'Contato Feito'", data: `${yesterday}T10:00:00`, id_usuario: "a1" },
  { id: "i3", id_lead: "l2", tipo: "follow_up", descricao: "Cliente interessado em revisão completa. Vai verificar agenda.", data: `${yesterday}T10:05:00`, id_usuario: "a1" },
  { id: "i4", id_lead: "l3", tipo: "mudanca_etapa", descricao: "Agendado para Catalão em " + today, data: `${yesterday}T14:00:00`, id_usuario: "a1" },
  { id: "i5", id_lead: "l6", tipo: "checkin", descricao: "Cliente chegou à unidade Catalão", data: `${today}T09:30:00`, id_usuario: "r1" },
  { id: "i6", id_lead: "l9", tipo: "checkout", descricao: "Serviço concluído - R$ 1.200,00 - Revisão Completa", data: "2024-12-06T16:00:00", id_usuario: "r1" },
];
