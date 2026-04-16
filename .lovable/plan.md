

## Causa raiz

No `LeadContext`, a busca de eventos para **gestor/supervisor** usa `fetchAllRows` (paginação que ultrapassa o limite de 1000 do PostgREST), mas para **agente** não. Maria Eduarda tem **1.074 eventos** no total — o cliente carrega só os 1.000 primeiros (ordenados por `data_prevista ASC`, ou seja, os mais antigos, já concluídos), perdendo 74 eventos recentes onde estão vários follow-ups pendentes. Resultado: contagem do agente fica abaixo dos 61 reais.

Confirmei via SQL:
- A lógica de filtro está idêntica nos dois painéis (ambas dão 61).
- A diferença é exclusivamente na **quantidade de eventos carregada no cliente**.

O mesmo risco existe para `leads` do agente quando ultrapassa 1.000 (ainda não é o caso da Maria Eduarda, mas pode acontecer).

## Plano de correção

Arquivo único: `src/contexts/LeadContext.tsx`

1. Aplicar `fetchAllRows` também para o cargo **agente** ao buscar `leads` e `eventos` — assim a paginação ultrapassa o limite de 1.000 e nenhum evento/lead é cortado.
2. Manter recepcionista no caminho atual (volume baixo, filtrado por unidade + `concluido=false`), mas considerar a mesma blindagem como melhoria preventiva (se quiser, aplico também).
3. Nenhuma mudança de UI, RLS, schema ou lógica de categorização.

## Trecho-alvo (referência)

```ts
// hoje:
const needsPagination = user?.cargo === "gestor" || user?.cargo === "supervisor";

// depois:
const needsPagination =
  user?.cargo === "gestor" ||
  user?.cargo === "supervisor" ||
  user?.cargo === "agente";
```

## Validação esperada após o fix

- Aba **Eventos** do agente Maria Eduarda passa a mostrar os mesmos **61 follow-ups pendentes** que aparecem no painel do supervisor/gestor.
- Lista de pendentes na aba do agente passa a incluir os leads que hoje estão "sumidos" (cortados pelo limite de 1.000).
- Sem impacto nos demais cargos.

