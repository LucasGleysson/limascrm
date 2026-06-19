## Objetivo

Reduzir drasticamente o volume de requisições do app, sem perder integridade de:
- **Follow-ups** (todos os pendentes continuam carregados, independente da idade do lead);
- **Pesquisa de leads** (`LeadSearchPanel` continua buscando direto no banco com filtros próprios).

## Estratégia em camadas

### 1. Janela móvel de 90 dias no `LeadContext` (corte global)

Hoje `fetchAll` traz **todos os leads visíveis** ao usuário (gestor/supervisor = todos). Vamos restringir a:

- `data_entrada >= hoje - 90 dias`, **OU**
- lead com `fup_concluido = false` em etapa ativa (`novo`, `agendado`, `reagendado`, `dispensado`), **OU**
- lead referenciado por qualquer evento pendente (carregado em seguida).

Implementação:
1. Query principal: `.or("data_entrada.gte.<cutoff>,and(fup_concluido.eq.false,etapa.in.(novo,agendado,reagendado,dispensado))")`.
2. Buscar eventos pendentes (igual hoje).
3. Se algum `id_lead` de evento pendente não estiver no conjunto carregado → segundo fetch só desses ids para "preencher" e garantir que a aba Follow-ups nunca quebre.

Isso elimina março/fevereiro/janeiro inteiros para gestor/supervisor (que hoje puxam ~milhares de linhas a cada refresh), mantendo follow-ups intactos.

### 2. Paginação real server-side nos painéis pesados

Esses painéis hoje consomem `leads` do contexto e paginam em memória. Vão passar a buscar do banco por página, com filtros aplicados server-side:

| Painel | Filtros server-side | Page size |
|---|---|---|
| `FichasPanel` | unidade, agente, etapa, período (`data_entrada`), busca por nome/telefone/OS | 25 |
| `DispensaReportPanel` | unidade, período (`dispensado_em`) | 25 |
| `DailyReportPanel` | unidade, agente, dia | 50 |
| `ReceptionistReportPanel` | unidade, dia | 50 |

Cada painel ganha:
- hook próprio `usePaginatedLeads({ filtros, page, pageSize })` que faz `select` com `range()` e `count: "exact"` para total;
- `TablePagination` já existente reaproveitado;
- debounce de 300ms na busca para evitar disparos por tecla.

Esses painéis deixam de depender do array `leads` do contexto — apenas de `unidades`/`profiles` (que são pequenos).

### 3. Métricas sob demanda para meses antigos

`ManagerByAgent`, `ManagerByStore`, `ManagerIntelligence`, `MetasUnidades`, `MetasAgentes`, `DashboardOverviewPanel`, `TVDashboardPanel`:

- Enquanto o período selecionado estiver **dentro dos últimos 90 dias** → calcular em cima do `leads` já carregado no contexto (comportamento atual, zero requests extras).
- Se o usuário escolher mês **anterior aos 90 dias** → disparar fetch direcionado:
  ```
  supabase.from("leads").select("...campos necessários...")
    .gte("data_entrada", inicioPeriodo).lte("data_entrada", fimPeriodo)
  ```
  com `useQuery`-style cache local (Map por chave `unidade+mes`), evitando refetch ao alternar abas.

Mantém análise histórica disponível, mas só paga o custo quando alguém realmente abre um mês antigo.

### 4. Followups e Pesquisa: não tocar no fluxo

- `FollowUpTrackingPanel` continua usando `eventos`/`leads` do contexto — já garantido pelo passo 1.3 (preenchimento de leads órfãos referenciados por eventos pendentes).
- `LeadSearchPanel` permanece como está (já faz query direta paginada por período selecionável).

### 5. Realtime

Subscriptions atuais (agente/recepcionista) continuam, mas o handler de INSERT em `leads` passa a ignorar leads com `data_entrada` fora da janela de 90d (a menos que tenha evento pendente associado), evitando inflar o estado.

## Detalhes técnicos

- Adicionar constante `LEAD_WINDOW_DAYS = 90` em `src/lib/leadUtils.ts`.
- Novo helper `src/hooks/usePaginatedLeads.ts` (server-side range + count exact + filtros).
- Novo helper `src/hooks/useHistoricalLeads.ts` (fetch direcionado + cache em ref Map por chave).
- `LeadContext.fetchAll`: adicionar segundo passo "completar leads órfãos de eventos pendentes" via `.in("id", missingIds)` em chunks de 200.
- `TablePagination` reaproveitado; adicionar prop `loading` para skeleton durante fetch de página.
- Sem mudanças de schema, sem migrations.

## Ganhos esperados

- Gestor/supervisor: hoje cada refresh puxa o histórico inteiro de leads (vários milhares). Passa a puxar apenas ~últimos 3 meses + pendentes → redução estimada de **60–80%** no payload e tempo de carga.
- Fichas/Dispensa/Diários deixam de re-render dependendo do array global e fazem requests pequenos e direcionados.
- Cron de follow-ups e RLS continuam idênticos.

## Fora de escopo

- Pesquisa de leads (`LeadSearchPanel`): não mexe.
- Aba Follow-ups: não pagina; só ganha o "preenchimento" para nunca quebrar.
- Nenhuma alteração em métricas/regras de negócio do funil.
