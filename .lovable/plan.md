# Ajuste da contagem de meta por mês

## Regra

Para cada lead, definir o "mês da meta" como:

```
mesMeta = mês(checkin) se checkin existir
        senão mês(data_agendamento)
        senão (lead não conta em nenhum mês)
```

Isso substitui a lógica atual `data_entrada OR data_agendamento` que duplicava leads em dois meses.

## Alterações

### 1. `src/components/MetasUnidadesPanel.tsx`
- `fetchMonthLeads`: buscar leads cujo `checkin` cai no mês OU `data_agendamento` cai no mês (sem usar `data_entrada`).
- `unitData`/`agentBreakdown`: filtrar `monthLeads` por `mesMeta(l) === mesRef`.

### 2. `src/components/MetasAgentesPanel.tsx`
- Mesma mudança no `fetchMonthLeads` e no filtro de `monthLeads`.
- **Meta semanal**: trocar filtro `data_entrada` por `mesMeta(l)` dentro do range da semana (usar `checkin ?? data_agendamento`).

### 3. Helper compartilhado
Adicionar em `src/lib/leadUtils.ts`:

```ts
export function getLeadMetaDate(lead: { checkin?: string|null; data_agendamento?: string|null }): string | null {
  if (lead.checkin) return lead.checkin.slice(0, 10);
  if (lead.data_agendamento) return lead.data_agendamento.slice(0, 10);
  return null;
}
```

Usar nos dois painéis para manter consistência.

## Impacto

- Cada lead conta em **exatamente um mês** (ou nenhum, se não tem agendamento nem check-in).
- Métricas de meses passados podem mudar (eliminando duplicações).
- Demais painéis (relatórios diários, dashboards) **não são afetados** — mudança restrita aos painéis de Meta.
