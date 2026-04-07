

## Correção: Alinhar gráfico diário com card de Agendamentos

### Problema

O gráfico de barras "Agendamentos por Dia" conta leads usando uma condição dupla (`data_agendamento === dateStr` OU `data_entrada === dateStr` com status avançado), causando duplicatas e divergência com o card de Agendamentos que usa apenas status.

### Solução

Corrigir a lógica do `dailyChartData` (linha 226-228) para contar agendamentos **apenas** por `data_agendamento`:

```typescript
const agendamentos = monthLeads.filter((l) =>
  l.data_agendamento === dateStr
).length;
```

Isso garante que:
- Cada lead aparece em **um único dia** no gráfico (o dia do agendamento)
- A soma de todos os dias do gráfico bate com o total do card
- Leads sem `data_agendamento` não inflam a contagem

### Arquivo afetado

| Arquivo | Mudança |
|---------|---------|
| `AgentDashboard.tsx` | Simplificar filtro do `dailyChartData` (linha 226-228) |

