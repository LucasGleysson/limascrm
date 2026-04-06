// Utility to append timestamped entries to the notas field

export function appendNota(existingNotas: string | null | undefined, label: string, text: string, autor?: string): string {
  const timestamp = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const prefix = autor ? `[${autor}] ` : "";
  const entry = `[${timestamp}] ${prefix}${label}: ${text}`;
  return existingNotas ? `${existingNotas}\n${entry}` : entry;
}
