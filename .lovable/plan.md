## Mudanças no processo de Follow-up

### 1. Cadência sempre a partir da última conclusão

Hoje o `agendado`/`reagendado` ancora todos os FUPs em `data_agendamento`. Vou mudar para que, depois do 1º FUP, os próximos sejam contados a partir da data da última conclusão (mesmo padrão que `novo` já usa).

**Cadência final (gaps em dias):**

| Categoria | FUP1 ancora em | Gaps seguintes (a partir da conclusão anterior) |
|---|---|---|
| novo | `data_entrada` + 1 | +2, +3, +4 |
| agendado | `data_agendamento` + 0 | +1, +3 |
| reagendado | `data_agendamento` + 0 | +1, +3 |
| dispensado | `dispensado_em` + 1 | +1, +1, +1 |

Exemplo prático (novo entrando segunda 15/06):
- FUP1: terça 16/06 (+1 de 15/06)
- conclui terça → FUP2: quinta 18/06 (+2)
- conclui quinta → FUP3: domingo 21/06 (+3)
- conclui domingo → FUP4: quinta 25/06 (+4)
- sem retorno → vira `trabalhado`

Exemplo prático (dispensado em 15/06):
- FUP1: 16/06 (+1) → FUP2: 17/06 → FUP3: 18/06 → FUP4: 19/06 → `analise_supervisor`.

### 2. Separar destino final de `agendado` vs `reagendado`

| Categoria | Destino ao esgotar FUPs |
|---|---|
| agendado | `desqualificado_agendado` (cliente nunca foi à loja) |
| reagendado | `analise_supervisor` (cliente já visitou; supervisor decide entre dispensado/perdido) |

Implementação: separar `reagendado` em sua própria categoria no `generate-followups` (hoje cai junto com `agendado`).

### 3. Proteger lead quando agente atualiza `data_agendamento` sem mudar status

Hoje o trigger `leads_reset_fup_on_reagendamento` só reseta FUPs quando `etapa IN ('agendado','reagendado')`. Resultado: se o agente está no último FUP de um lead `novo` ou `dispensado`, preenche nova `data_agendamento` mas esquece de mudar o status, o cron fecha o ciclo e transforma em `trabalhado`/`analise_supervisor`, perdendo o resgate.

Correção no trigger:
- Disparar sempre que `data_agendamento` mudar para uma data futura, independente da etapa atual.
- Promover etapa automaticamente:
  - `novo` → `agendado` (primeiro agendamento).
  - `dispensado` → `reagendado` (cliente já passou pela loja anteriormente).
  - `agendado`/`reagendado` → mantém etapa.
- Apagar FUPs pendentes e zerar `fup_concluido*` para iniciar o novo ciclo.

Assim, qualquer atualização da data de agendamento "salva" o lead, mesmo que o agente esqueça de alterar o status manualmente.

### Arquivos afetados

- `supabase/functions/generate-followups/index.ts`: nova categoria `reagendado`, destino final próprio, cadência do `dispensado` virando [1,1,1,1], ancoragem de `agendado`/`reagendado` na última conclusão a partir do FUP2.
- Nova migration: atualizar função `leads_reset_fup_on_reagendamento` para também promover etapa automaticamente quando `data_agendamento` muda em leads `novo`/`dispensado`.