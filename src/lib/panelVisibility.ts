/** Presentation only: never filter the lead arrays used to calculate totals. */
export const CURRENT_PANEL_AGENT_IDS = new Set([
  "3c0802d2-4c9e-4ca2-b191-5c93a3960640", // Leonardo
  "3f3308ec-6596-48e2-a779-674431bfb4e1", // Taina
  "9d80b227-f5b1-4b24-ac94-b23c14ec64f0", // Maylla
  "fc88fff8-3e5b-4504-b17d-090be0b50147", // Auxiliar - Sup
  "ab9f6961-245b-47f2-9fbb-0591f1f7581d", // Junior (Julio Cesar)
]);

export type PanelPeriod = { from: string | null; to: string | null };
export type PanelActivity = {
  id_agente?: string | null;
  id_unidade?: string | null;
  data_entrada?: string | null;
  data_agendamento?: string | null;
  checkin?: string | null;
};

export function historicalPeriod(period: PanelPeriod, now = new Date()): boolean {
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  return !!period.to && period.to < currentMonth;
}

function hasActivity(rows: readonly PanelActivity[], key: "id_agente" | "id_unidade", id: string, period: PanelPeriod): boolean {
  return rows.some((row) => row[key] === id &&
    [row.data_entrada, row.data_agendamento, row.checkin].some((date) => {
      if (!date) return false;
      const day = date.slice(0, 10);
      return (!period.from || day >= period.from) && (!period.to || day <= period.to);
    }));
}

export function isAgentVisible(id: string, rows: readonly PanelActivity[], period: PanelPeriod, now = new Date()): boolean {
  return historicalPeriod(period, now)
    ? hasActivity(rows, "id_agente", id, period)
    : CURRENT_PANEL_AGENT_IDS.has(id);
}

export function isUnitVisible(unit: { id: string; nome: string }, rows: readonly PanelActivity[], period: PanelPeriod, now = new Date()): boolean {
  const name = unit.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return name !== "patrocinio" || (historicalPeriod(period, now) && hasActivity(rows, "id_unidade", unit.id, period));
}
