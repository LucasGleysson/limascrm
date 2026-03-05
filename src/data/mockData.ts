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
  { id: "agendado", label: "Agendado", color: "info" },
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

export interface Evento {
  id: string;
  id_lead: string;
  tipo: "followup";
  numero: number; // 1-7
  data_prevista: string; // date when event should be done
  concluido: boolean;
  data_conclusao?: string;
  descricao_conclusao?: string;
  id_usuario?: string;
}

export interface Interacao {
  id: string;
  id_lead: string;
  tipo: "mudanca_etapa" | "follow_up" | "checkin" | "checkout" | "nota" | "evento_concluido";
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
const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];
const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().split("T")[0];

export const MOCK_LEADS: Lead[] = [
  { id: "l1", nome: "Fernando Almeida", telefone: "(34) 99999-0001", origem: "WhatsApp", etapa: "novo", data_entrada: today, id_agente: "a1", id_unidade: "2" },
  { id: "l2", nome: "Camila Rocha", telefone: "(34) 99999-0002", origem: "Instagram", etapa: "agendado", data_entrada: twoDaysAgo, id_agente: "a1", id_unidade: "2", data_agendamento: today, numero_os: "OS-2024-001" },
  { id: "l3", nome: "Ricardo Souza", telefone: "(34) 99999-0003", origem: "Google Ads", etapa: "agendado", data_entrada: threeDaysAgo, id_agente: "a1", id_unidade: "6", data_agendamento: today, numero_os: "OS-2024-002" },
  { id: "l4", nome: "Juliana Martins", telefone: "(34) 99999-0004", origem: "Facebook", etapa: "novo", data_entrada: yesterday, id_agente: "a2", id_unidade: "3" },
  { id: "l5", nome: "Marcos Pereira", telefone: "(34) 99999-0005", origem: "Indicação", etapa: "agendado", data_entrada: threeDaysAgo, id_agente: "a2", id_unidade: "1", data_agendamento: today, numero_os: "OS-2024-003" },
  { id: "l6", nome: "Patricia Lima", telefone: "(34) 99999-0006", origem: "WhatsApp", etapa: "na_loja", data_entrada: threeDaysAgo, id_agente: "a1", id_unidade: "6", data_agendamento: today, numero_os: "OS-2024-004", checkin: `${today}T09:30:00` },
  { id: "l7", nome: "André Barbosa", telefone: "(34) 99999-0007", origem: "Porta", etapa: "na_loja", data_entrada: today, id_agente: "a1", id_unidade: "6", checkin: `${today}T10:00:00`, is_porta: true },
  { id: "l8", nome: "Sofia Dias", telefone: "(34) 99999-0008", origem: "Google Ads", etapa: "concluido", data_entrada: "2024-12-01", id_agente: "a2", id_unidade: "4", valor_servico: 450, tags_servico: ["Troca de Óleo", "Alinhamento"], checkout: "2024-12-02T15:00:00" },
  { id: "l9", nome: "Bruno Castro", telefone: "(34) 99999-0009", origem: "WhatsApp", etapa: "concluido", data_entrada: "2024-12-05", id_agente: "a1", id_unidade: "5", valor_servico: 1200, tags_servico: ["Revisão Completa"], checkout: "2024-12-06T16:00:00" },
  { id: "l10", nome: "Letícia Nunes", telefone: "(34) 99999-0010", origem: "Instagram", etapa: "dispensado", data_entrada: "2024-12-03", id_agente: "a3", id_unidade: "4" },
  { id: "l11", nome: "Gustavo Reis", telefone: "(34) 99999-0011", origem: "Facebook", etapa: "novo", data_entrada: twoDaysAgo, id_agente: "a3", id_unidade: "5" },
  { id: "l12", nome: "Helena Moura", telefone: "(34) 99999-0012", origem: "WhatsApp", etapa: "agendado", data_entrada: threeDaysAgo, id_agente: "a3", id_unidade: "4", data_agendamento: today, numero_os: "OS-2024-005" },
];

// Generate followup events for leads that are "novo" and older than 1 day
function generateFollowupEvents(): Evento[] {
  const events: Evento[] = [];
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  MOCK_LEADS.forEach((lead) => {
    if (lead.etapa !== "novo") return;
    const entryDate = new Date(lead.data_entrada);
    entryDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((todayDate.getTime() - entryDate.getTime()) / 86400000);

    for (let i = 1; i <= Math.min(daysDiff, 7); i++) {
      const eventDate = new Date(entryDate);
      eventDate.setDate(eventDate.getDate() + i);
      events.push({
        id: `ev-${lead.id}-${i}`,
        id_lead: lead.id,
        tipo: "followup",
        numero: i,
        data_prevista: eventDate.toISOString().split("T")[0],
        concluido: i < daysDiff, // past events are "done" for mock
        data_conclusao: i < daysDiff ? eventDate.toISOString() : undefined,
        descricao_conclusao: i < daysDiff ? `Follow-up ${i} realizado com sucesso` : undefined,
        id_usuario: lead.id_agente,
      });
    }
  });

  return events;
}

export const MOCK_EVENTOS: Evento[] = generateFollowupEvents();

export const MOCK_INTERACOES: Interacao[] = [
  { id: "i1", id_lead: "l1", tipo: "mudanca_etapa", descricao: "Lead criado como 'Novo Lead'", data: `${today}T08:00:00`, id_usuario: "a1" },
  { id: "i2", id_lead: "l2", tipo: "mudanca_etapa", descricao: "Movido para 'Agendado'", data: `${twoDaysAgo}T10:00:00`, id_usuario: "a1" },
  { id: "i3", id_lead: "l3", tipo: "mudanca_etapa", descricao: "Agendado para Catalão em " + today, data: `${threeDaysAgo}T14:00:00`, id_usuario: "a1" },
  { id: "i4", id_lead: "l6", tipo: "checkin", descricao: "Cliente chegou à unidade Catalão", data: `${today}T09:30:00`, id_usuario: "r1" },
  { id: "i5", id_lead: "l9", tipo: "checkout", descricao: "Serviço concluído - R$ 1.200,00 - Revisão Completa", data: "2024-12-06T16:00:00", id_usuario: "r1" },
];
