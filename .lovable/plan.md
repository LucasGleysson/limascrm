## Objetivo
Corrigir duas regras de transição de status que estão inconsistentes com a realidade do funil:

1. Lead **desqualificado_agendado** que é reagendado deve voltar para **agendado** (e não "reagendado"), pois ele nunca esteve na loja.
2. Lead **reagendado** que completa/encerra o processo de follow-up deve ir para **analise_supervisor** (e não "desqualificado_agendado"), pois o status reagendado indica que o cliente já passou pela loja antes.

## Diagnóstico atual

**`src/components/ScheduleModal.tsx` (linha 65-66)** — ao reagendar, hoje considera qualquer etapa em `["dispensado", "perdido", "desqualificado_agendado", "reagendado"]` como reagendamento e marca como `reagendado`. Isso está errado para `desqualificado_agendado`, que nunca foi à loja.

**`supabase/functions/generate-followups/index.ts`** — já está correto: quando follow-up de `reagendado` esgota, vai para `analise_supervisor`. Não precisa mudar.

**`src/components/FollowUpTrackingPanel.tsx` (linhas 78-81)** — no encerramento manual do follow-up, hoje:
- `na_loja / dispensado / confirmado` → `analise_supervisor`
- `agendado / reagendado` → `desqualificado_agendado`

Isso joga lead `reagendado` para `desqualificado_agendado` ao encerrar, contradizendo a regra do usuário.

## Mudanças

### 1. ScheduleModal — reagendar desqualificado vira `agendado`
- Tratar `desqualificado_agendado` (e `desqualificado_novo`) como primeiro agendamento: status final = `agendado`.
- Manter `reagendado` apenas para quem realmente já passou da loja: `dispensado`, `perdido`, `reagendado` (re-reagendamento).

```text
etapaAtual                       → novoStatus
desqualificado_novo              → agendado
desqualificado_agendado          → agendado   (mudança)
novo                             → agendado
dispensado / perdido / reagendado → reagendado
```

### 2. FollowUpTrackingPanel — encerrar follow-up de reagendado
- Mudar a regra para que `reagendado` caia em `analise_supervisor` ao encerrar:
  - `na_loja / dispensado / confirmado / reagendado` → `analise_supervisor`
  - `agendado` → `desqualificado_agendado` (mantém)

Também ajustar o helper de classificação `getCategoria` (linha 70) se necessário para refletir a nova semântica de exibição, mantendo `reagendado` agrupado como pós-loja para fins de encerramento, sem alterar a contagem do funil de captação.

### 3. Sem mudanças em banco
Nenhuma migração, gatilho ou política. O trigger `leads_reset_fup_on_reagendamento` continua válido (ele só atua quando `data_agendamento` muda e a etapa atual é `novo` ou `dispensado` — não afeta `desqualificado_agendado`, então não conflita com a nova regra do front).

## Arquivos afetados
- `src/components/ScheduleModal.tsx`
- `src/components/FollowUpTrackingPanel.tsx`

## Fora de escopo
- Geração automática de follow-ups (já correta).
- Métricas, RLS, schema, contagem do painel diário/TV.
