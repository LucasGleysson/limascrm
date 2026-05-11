## Objetivo

Reduzir o acúmulo de follow-ups dos agentes alterando: (1) a quantidade de FUPs por categoria de lead e (2) o intervalo entre eles. O próximo FUP continua sendo gerado **apenas após a conclusão do anterior** (não pela passagem do tempo). Adicionar também um painel de **alertas** para leads parados em status críticos.

## Nova régua de FUPs

| Categoria | Qtd | Quando gerar | Status final se chegar ao fim |
|---|---|---|---|
| **Novo** (`novo`) | 4 | FUP1: 1 dia após `data_entrada`. FUP2: 2d após conclusão do FUP1. FUP3: 3d após FUP2. FUP4: 4d após FUP3. | `trabalhado` |
| **Agendado** (`agendado`/`reagendado`) | 3 | FUP1: no dia do `data_agendamento`. FUP2: 1d após FUP1 (sem check-in). FUP3: 3d após FUP2. | `desqualificado_agendado` |
| **Dispensado** (`dispensado`) | 4 | FUP1: 1d após `dispensado_em`. FUP2: 2d. FUP3: 3d. FUP4: 4d. | `perdido` |

Regras gerais:
- Se já existe FUP pendente para o lead, o gerador não cria outro.
- Mudança de etapa interrompe o ciclo naturalmente.
- Removido o "lembrete véspera" (D-1) do agendamento.

## Novo: Alertas de leads parados

Painel de atenção (não é FUP, é só sinalização visual) para leads com status:
`confirmado`, `na_loja`, `reagendado`, `analise_supervisor`

**Critério:** lead permanece nesse status há **mais de 1 dia** (comparando `updated_at` com hoje).

**Onde aparecer:**
- Card de KPI no `FollowUpTrackingPanel` ("Atenção: X leads parados").
- Lista expansível abaixo dos pendentes, mostrando: nome, status, dias parado, agente, unidade — clicável para abrir o `LeadDetailSheet`.
- Badge de cor `warning` quando >1 dia, `destructive` quando >3 dias.

## Simulação de impacto

Base atual: 248 `novo` + 130 `agendado` + 30 `dispensado` em FUP ativo. 1.241 FUPs pendentes hoje (Maria Eduarda 615, Gisele 286).

| Categoria | Leads | Máx atual (7) | Máx novo | Redução |
|---|---|---|---|---|
| Novo | 248 | 1.736 | 992 | −43% |
| Agendado | 130 | 910 | 390 | −57% |
| Dispensado | 30 | 210 | 120 | −43% |
| **Total** | **408** | **2.856** | **1.502** | **−47%** |

Pico diário cai ~50% após a primeira semana, pois os intervalos escalonados (1-2-3-4) distribuem as pendências ao longo do tempo.

## Implementação

### 1. Banco — migração
- Adicionar coluna `dispensado_em timestamptz NULL` em `leads`.
- Trigger `BEFORE UPDATE` em `leads`: quando `etapa` muda **para** `dispensado`, setar `dispensado_em = now()`. Quando sai de `dispensado`, manter o valor (histórico).
- Backfill: para leads atualmente em `dispensado`, popular `dispensado_em = updated_at`.

### 2. `supabase/functions/generate-followups/index.ts`
Reescrever a lógica:
```ts
const GAPS = {
  novo:       [1, 2, 3, 4],   // dias até cada FUP a partir da âncora/anterior
  agendado:   [0, 1, 3],
  dispensado: [1, 2, 3, 4],
};
const MAX = { novo: 4, agendado: 3, dispensado: 4 };
const FINAL = { novo: "trabalhado", agendado: "desqualificado_agendado", dispensado: "perdido" };
```
- Âncora do FUP1: `data_entrada` (novo) | `data_agendamento` (agendado) | `dispensado_em` (dispensado).
- FUPn (n>1): `data_conclusao` do FUP(n−1) + `GAPS[cat][n−1]` dias.
- Ao atingir `MAX[cat]`: aplicar `FINAL[cat]` e marcar `fup_concluido=true`.
- Remover ramo `data_agendamento === tomorrowStr`.
- Não gerar FUP com data futura.

### 3. `src/components/FollowUpTrackingPanel.tsx`
- Substituir loop fixo `1..7` por loops por categoria com `MAX[cat]`.
- Ajustar grid "FUP1..FUPn" (até 4 colunas) com cabeçalho contextual.
- **Adicionar seção "Atenção — Leads parados"**:
  - Calcular: `leads.filter(l => ['confirmado','na_loja','reagendado','analise_supervisor'].includes(l.etapa) && diasDesde(l.updated_at) >= 1)`.
  - KPI no topo + lista expansível (Accordion) com badge de severidade.
  - Click → abre `LeadDetailSheet`.
- Manter "Encerrar FUP" e `getEncerrarStatus` (já cobre os finais).

### 4. Migração de dados existentes
- **Não apagar** os 1.241 FUPs pendentes — agentes drenam concluindo ou encerrando.
- Nova régua vale para o **próximo** FUP de cada lead (após o atual ser concluído).
- Estoque atual escoa em ~1 semana, sem reset traumático.

### 5. Memória
Atualizar `mem://features/lead-workflow` com a nova régua (4/3/4, intervalos, status finais) e o painel de alertas.

## O que **não** muda
- Painéis de meta, dashboard, relatórios diários.
- Lógica de check-in, status de loja, análise supervisor.
- Permissões/RLS, cron de geração (continua diário, gera menos).