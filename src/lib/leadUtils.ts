// Shared utility functions for lead management

export const getStatusBadgeClass = (etapa: string): string => {
  const map: Record<string, string> = {
    novo: "bg-info/15 text-info border-info/30",
    agendado: "bg-purple/15 text-purple border-purple/30",
    reagendado: "bg-purple/15 text-purple border-purple/30",
    confirmado: "bg-info/15 text-info border-info/30",
    na_loja: "bg-warning/15 text-warning border-warning/30",
    concluido: "bg-success/15 text-success border-success/30",
    dispensado: "bg-destructive/15 text-destructive border-destructive/30",
    desqualificado_novo: "bg-muted text-muted-foreground border-muted",
    desqualificado_agendado: "bg-destructive/15 text-destructive border-destructive/30",
    perdido: "bg-destructive/15 text-destructive border-destructive/30",
    // Legacy support
    desqualificado: "bg-muted text-muted-foreground border-muted",
  };
  return map[etapa] || "";
};

/** Check if a lead went to the store (confirmado+) */
export const foiNaLoja = (etapa: string): boolean =>
  ["confirmado", "na_loja", "concluido", "dispensado", "perdido"].includes(etapa);

/** Check if a lead is a "car for the agent" (arrived at store) */
export const isCarroDoAgente = (etapa: string): boolean =>
  ["confirmado", "na_loja", "concluido", "dispensado", "perdido"].includes(etapa);

/** Check if a lead was lost before going to the store */
export const isPerdidoAntesLoja = (etapa: string): boolean =>
  ["desqualificado_novo", "desqualificado_agendado"].includes(etapa);

/** Check if a lead was lost after going to the store */
export const isPerdidoDepoisLoja = (etapa: string): boolean =>
  ["dispensado", "perdido"].includes(etapa);

export const getToday = (): string => new Date().toISOString().split("T")[0];

export const formatDateBR = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr + (dateStr.length === 10 ? "T12:00:00" : "")).toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
};
