

## Auditoria: Contagem "Na Loja" nos Dashboards

### Problema identificado

Há **inconsistência na lista de status** que define "passou na loja" entre os diferentes painéis. Cada local usa uma combinação ligeiramente diferente:

```text
Arquivo                          | Status usados para "Na Loja"
---------------------------------|--------------------------------------------
leadUtils.ts (foiNaLoja)         | confirmado, na_loja, concluido, dispensado, perdido
                                 | ❌ falta "reagendado"
                                 |
DailyReportPanel                 | confirmado, na_loja, concluido, dispensado, perdido, reagendado
                                 | ✅ inclui na_loja + reagendado
                                 |
ManagerDashboard (cards+funil)   | confirmado, concluido, dispensado, perdido, reagendado
                                 | ❌ falta "na_loja"
                                 |
SupervisorDashboard              | confirmado, concluido, dispensado, perdido, reagendado
                                 | ❌ falta "na_loja"
                                 |
AgentDashboard (desempenho)      | confirmado, concluido, dispensado, perdido, reagendado
                                 | ❌ falta "na_loja"
                                 |
AgentDailyChart (gráfico)        | confirmado, concluido, dispensado, perdido, reagendado
                                 | ❌ falta "na_loja"
                                 |
ManagerIntelligencePanel         | confirmado, concluido, dispensado, perdido, reagendado
                                 | ❌ falta "na_loja"
```

O status `na_loja` é um status intermediário real (cliente está fisicamente na loja mas ainda não concluiu). Se não for contado, clientes em atendimento ativo são ignorados da métrica "Na Loja".

O status `reagendado` indica resgate — o cliente já esteve na loja. Deve ser contado.

### Solução

Padronizar **todos os locais** para usar a mesma lista canônica, atualizando a função utilitária `foiNaLoja` e substituindo listas inline por chamadas a essa função.

**Lista canônica (6 status):**
`confirmado`, `na_loja`, `concluido`, `dispensado`, `perdido`, `reagendado`

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/leadUtils.ts` | Adicionar `reagendado` à função `foiNaLoja` |
| `src/pages/ManagerDashboard.tsx` | Substituir lista inline por `foiNaLoja` (2 locais) |
| `src/pages/SupervisorDashboard.tsx` | Substituir listas inline por `foiNaLoja` (3 locais) |
| `src/pages/AgentDashboard.tsx` | Substituir lista inline no `desempenho` e `dailyChartData` por `foiNaLoja` |
| `src/components/AgentDailyChart.tsx` | Substituir lista inline por `foiNaLoja` |
| `src/components/ManagerIntelligencePanel.tsx` | Substituir lista inline por `foiNaLoja` |
| `src/components/DailyReportPanel.tsx` | Substituir lista inline por `foiNaLoja` (já está correto, apenas centralizar) |

### Impacto esperado

- Clientes com status `na_loja` (em atendimento) passam a ser contados em **todos** os dashboards, não apenas no Relatório Diário
- Clientes `reagendado` passam a ser contados na função utilitária `foiNaLoja` (já eram contados nos dashboards mas não na função)
- Contagens entre cards e gráficos ficam 100% alinhadas em todos os perfis

