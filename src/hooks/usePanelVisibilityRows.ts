import { useQuery } from "@tanstack/react-query";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { historicalPeriod, type PanelActivity, type PanelPeriod } from "@/lib/panelVisibility";

/** Historical presence lookup only; its rows must never enter KPI calculations. */
export function usePanelVisibilityRows(rows: readonly PanelActivity[], period: PanelPeriod): readonly PanelActivity[] {
  const { currentUser } = useRole();
  const historical = historicalPeriod(period);
  const { data } = useQuery({
    queryKey: ["panel-visibility", currentUser.id, period.from, period.to],
    enabled: historical && !!currentUser.id,
    staleTime: 60_000,
    queryFn: async () => {
      const result: PanelActivity[] = [];
      const dates = ["data_entrada", "data_agendamento", "checkin"].map((column) => {
        const clauses: string[] = [];
        if (period.from) clauses.push(`${column}.gte.${period.from}${column === "checkin" ? "T00:00:00" : ""}`);
        if (period.to) clauses.push(`${column}.lte.${period.to}${column === "checkin" ? "T23:59:59.999999" : ""}`);
        return `and(${clauses.join(",")})`;
      });
      for (let offset = 0; ; offset += 1000) {
        const { data: page, error } = await supabase.from("leads")
          .select("id_agente,id_unidade,data_entrada,data_agendamento,checkin")
          .or(dates.join(","))
          .order("id")
          .range(offset, offset + 999);
        if (error) throw error;
        result.push(...(page ?? []));
        if (!page || page.length < 1000) break;
      }
      return result;
    },
  });
  return historical && data ? [...rows, ...data] : rows;
}