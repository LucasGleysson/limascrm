// Shared utility functions for lead management
import { format as formatDateFns } from "date-fns";
import type { Lead } from "@/data/mockData";

/**
 * Janela móvel padrão (em dias) para carregar leads no contexto global.
 * Leads fora dessa janela só são carregados sob demanda (Manager/Daily/Recep/Fichas
 * com período antigo, LeadSearchPanel, ou referenciados por follow-ups pendentes).
 */
export const LEAD_WINDOW_DAYS = 90;

/** Meta padrão de carros por agente no mês */
export const META_AGENTE_PADRAO = 90;

/** Melhor faixa de bonificação — usada nos cálculos de potencial */
export const COMISSAO_RATE_MAX = 10;

/** Faixas de bonificação (comissão) por carros que viraram meta no mês */
export const COMISSAO_FAIXAS = [
  { min: 0, max: 50, valor: 0 },
  { min: 51, max: 60, valor: 5 },
  { min: 61, max: 70, valor: 6 },
  { min: 71, max: 80, valor: 7 },
  { min: 81, max: 90, valor: 8 },
  { min: 91, max: Infinity, valor: 10 },
];

/** Valor por carro conforme a quantidade de carros que viraram meta */
export function comissaoRate(carros: number): number {
  const faixa = COMISSAO_FAIXAS.find((f) => carros >= f.min && carros <= f.max);
  return faixa ? faixa.valor : 0;
}

/** Quantos carros faltam para subir de faixa (null se já está na faixa máxima) */
export function proximaFaixaComissao(carros: number): { faltam: number; valor: number } | null {
  const idx = COMISSAO_FAIXAS.findIndex((f) => carros >= f.min && carros <= f.max);
  const prox = COMISSAO_FAIXAS[idx + 1];
  if (!prox) return null;
  return { faltam: prox.min - carros, valor: prox.valor };
}


/** Etapas consideradas "ativas" — leads aqui são SEMPRE carregados, independentemente da idade. */
export const ACTIVE_FUNNEL_ETAPAS = [
  "novo",
  "agendado",
  "reagendado",
  "confirmado",
  "na_loja",
  "dispensado",
  "analise_supervisor",
] as const;

/** Retorna o cutoff ISO (YYYY-MM-DD) para a janela móvel. */
export function getLeadWindowCutoff(days: number = LEAD_WINDOW_DAYS): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

export const getStatusBadgeClass = (etapa: string): string => {
  const map: Record<string, string> = {
    novo: "bg-info/15 text-info border-info/30",
    agendado: "bg-purple/15 text-purple border-purple/30",
    reagendado: "bg-purple/15 text-purple border-purple/30",
    confirmado: "bg-info/15 text-info border-info/30",
    na_loja: "bg-warning/15 text-warning border-warning/30",
    concluido: "bg-success/15 text-success border-success/30",
    dispensado: "bg-destructive/15 text-destructive border-destructive/30",
    analise_supervisor: "bg-warning/15 text-warning border-warning/30",
    desqualificado_novo: "bg-muted text-muted-foreground border-muted",
    desqualificado_agendado: "bg-destructive/15 text-destructive border-destructive/30",
    perdido: "bg-destructive/15 text-destructive border-destructive/30",
    trabalhado: "bg-muted text-foreground border-border",
    sem_retorno: "bg-muted text-muted-foreground border-border",
    nao_convertido: "bg-destructive/10 text-destructive border-destructive/25",
    // Legacy support
    desqualificado: "bg-muted text-muted-foreground border-muted",
  };
  return map[etapa] || "";
};

const STATUS_NA_LOJA_LEGACY = ["confirmado", "na_loja", "concluido", "dispensado", "perdido", "reagendado", "analise_supervisor"];

/**
 * Check if a lead went to the store.
 * Accepts a Lead object (preferred — uses visitas_loja counter)
 * or an etapa string (legacy — falls back to status-based inference).
 */
export const foiNaLoja = (leadOrEtapa: Lead | string | null | undefined): boolean => {
  if (!leadOrEtapa) return false;
  if (typeof leadOrEtapa === "string") {
    return STATUS_NA_LOJA_LEGACY.includes(leadOrEtapa);
  }
  // Lead object: prefer counter, fallback to etapa for safety
  if ((leadOrEtapa.visitas_loja ?? 0) > 0) return true;
  return STATUS_NA_LOJA_LEGACY.includes(leadOrEtapa.etapa);
};

/** Na Loja = Concluído + Dispensado + Perdido */
export const isCarroDoAgente = (etapa: string): boolean =>
  ["concluido", "dispensado", "perdido"].includes(etapa);

/** Meta count = Concluídos + Perdidos (carros que contam para meta) */
export const isCarroParaMeta = (etapa: string): boolean =>
  ["concluido", "perdido"].includes(etapa);

/** Check if a lead was lost before going to the store */
export const isPerdidoAntesLoja = (etapa: string): boolean =>
  ["desqualificado_novo", "desqualificado_agendado", "sem_retorno", "nao_convertido"].includes(etapa);

/** Check if a lead was lost after going to the store */
export const isPerdidoDepoisLoja = (etapa: string): boolean =>
  ["dispensado", "perdido"].includes(etapa);

/** Check if a lead is pending supervisor analysis */
export const isAnaliseSupervisor = (etapa: string): boolean =>
  etapa === "analise_supervisor";

/** Lead trabalhado: novo lead que percorreu o processo de FUP até o fim sem agendar */
export const isTrabalhado = (etapa: string): boolean =>
  etapa === "trabalhado";

export const getToday = (): string => new Date().toISOString().split("T")[0];

/**
 * "Carros na loja" ancorado em data única e imutável (checkin).
 * Garante que cada carro é contado em exatamente um mês, e que números
 * de meses fechados não mudam retroativamente quando o status do lead muda.
 */
export function foiNaLojaNoPeriodo(
  lead: { checkin?: string | null },
  from: string | null | undefined,
  to: string | null | undefined,
): boolean {
  if (!lead.checkin) return false;
  if (!from || !to) return true;
  const dia = lead.checkin.slice(0, 10);
  return dia >= from && dia <= to;
}

/**
 * Mês de referência da meta para um lead:
 * - Se houve check-in, usa a data do check-in.
 * - Senão, usa data_agendamento.
 * - Senão, retorna null (não conta em nenhum mês de meta).
 * Retorna no formato 'YYYY-MM-DD'.
 */
export function getLeadMetaDate(lead: { checkin?: string | null; data_agendamento?: string | null }): string | null {
  if (lead.checkin) return lead.checkin.slice(0, 10);
  if (lead.data_agendamento) return lead.data_agendamento.slice(0, 10);
  return null;
}

export const formatDateBR = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "—";
  const d = parseDataLocal(dateStr);
  if (!d) return "—";
  return d.toLocaleDateString("pt-BR");
};

/** Ano mínimo aceito em datas digitadas/armazenadas. */
export const MIN_DATA_ANO = 2020;
/** Quantos anos à frente uma data ainda é considerada plausível. */
export const MAX_DATA_ANOS_FUTURO = 2;

/**
 * Converte 'YYYY-MM-DD' (ou ISO completo) em Date local ao meio-dia.
 * Retorna null se a string for inválida (ex: ano digitado errado como '82026-08-25').
 */
export function parseDataLocal(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const base = dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr;
  const d = new Date(base);
  if (isNaN(d.getTime())) return null;
  return d;
}

/** True quando a data existe e está em uma faixa de anos razoável. */
export function isDataPlausivel(dateStr: string | null | undefined): boolean {
  const d = parseDataLocal(dateStr);
  if (!d) return false;
  const ano = d.getFullYear();
  return ano >= MIN_DATA_ANO && ano <= new Date().getFullYear() + MAX_DATA_ANOS_FUTURO;
}

/**
 * Formata com date-fns sem nunca lançar "Invalid time value".
 * Datas inválidas retornam o fallback.
 */
export function formatDataSegura(
  dateStr: string | null | undefined,
  pattern: string,
  fallback = "—"
): string {
  const d = parseDataLocal(dateStr);
  if (!d) return fallback;
  try {
    return formatDateFns(d, pattern);
  } catch {
    return fallback;
  }
}

