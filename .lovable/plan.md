

## Análise da sua ideia

Sua proposta tem 2 mudanças independentes, ambas excelentes:

**1. Status `trabalhado` para novos leads com FUP encerrado**
Hoje, quando um lead `novo` tem o processo de followup encerrado, ele vira `desqualificado_novo` (junto com lead realmente ruim). Isso polui a métrica de evasão. Criar `trabalhado` separa "lead que foi trabalhado até o fim do processo, sem agendar" de "lead descartado por motivo claro (não fazemos serviço, outra cidade, etc.)".

**2. `na_loja` como contador inteiro (visitas)**
Hoje `na_loja` é uma **etapa do funil** misturada com **fato de ter visitado**. Isso causa confusão:
- Se cliente foi → dispensado → reagendado → voltou, hoje só conta como 1 visita ou perde o histórico.
- A função `foiNaLoja(etapa)` infere visita pelo status, o que é frágil.

A separação que você propõe é correta: **status descreve a situação atual**, **`visitas_loja` (int) descreve quantas vezes pisou na loja**. Para métricas de "carros na loja", continua contando **leads distintos com `visitas_loja >= 1`** (não soma de visitas) — exatamente como você pediu.

### Onde o contador incrementa
- Check-in (qualquer origem do botão): `visitas_loja += 1` + `etapa = "confirmado"` + `checkin = now`.
- Walk-in/Porta criado já presente: começa com `visitas_loja = 1`.
- Voltar de `dispensado` → `reagendado` → `confirmado`: o próximo check-in incrementa de novo. ✅

### Onde NÃO incrementa
- Mudanças de status entre etapas pós-loja (`na_loja` → `concluido` → `dispensado`) **não** incrementam — só o ato de check-in incrementa.

---

## Plano de implementação

### Fase 1 — Banco (migration)

```sql
ALTER TABLE public.leads
  ADD COLUMN visitas_loja integer NOT NULL DEFAULT 0;

-- Backfill: todo lead que hoje "foi na loja" pelo status antigo recebe pelo menos 1 visita.
UPDATE public.leads
SET visitas_loja = 1
WHERE etapa IN ('confirmado','na_loja','concluido','dispensado','perdido','reagendado','analise_supervisor')
  AND visitas_loja = 0;
```

Sem trigger automático: o incremento é feito **explicitamente no código de check-in** para manter controle e evitar duplicidade.

### Fase 2 — Constantes e tipos (`src/data/mockData.ts`)

- Adicionar etapa `trabalhado` em `ETAPAS_FUNIL` (color `muted`, label "Trabalhado").
- Adicionar `visitas_loja?: number` na interface `Lead`.

### Fase 3 — Utils (`src/lib/leadUtils.ts`)

- `foiNaLoja(lead)` muda de assinatura: passa a receber **o lead inteiro** e retornar `(lead.visitas_loja ?? 0) > 0`. Mais robusto e independente de status.
- Manter compat: se algum chamador ainda passar string, fallback para a lista atual.
- Adicionar badge class para `trabalhado`.

### Fase 4 — Check-in (incrementa contador)

Arquivos: `AgentReceptionPanel.tsx`, `ReceptionistDashboard.tsx`.

Passar a usar:
```ts
await updateLead(lead.id, {
  etapa: "confirmado",
  checkin: now,
  visitas_loja: (lead.visitas_loja ?? 0) + 1,
  notas, ...
});
```

`NewLeadModal.tsx`: leads criados como `is_porta` já entram com `visitas_loja: 1`.

### Fase 5 — Status `trabalhado` no encerramento de FUP

`EventoPanel.tsx` e `FollowUpTrackingPanel.tsx`, função `getEncerrarStatus`:
```ts
if (lead.etapa === "novo") return "trabalhado";  // antes: desqualificado_novo
if (["agendado","reagendado"].includes(lead.etapa)) return "desqualificado_agendado";
if (["na_loja","dispensado","confirmado"].includes(lead.etapa)) return "analise_supervisor";
```

### Fase 6 — Atualizar todos os contadores

Substituir em todos os painéis (Daily, Manager, Supervisor, Agent, TV, Metas, Intelligence):
- `foiNaLoja(l.etapa)` → `foiNaLoja(l)` (ou `(l.visitas_loja ?? 0) > 0`)
- Listas hardcoded `["confirmado","na_loja","concluido",...]` para "passou na loja" → mesmo critério via contador.
- Status `trabalhado` é incluído em "evasão antes da loja" mas **separado visualmente** do `desqualificado_novo` nos relatórios de dispensa/desqualificados.

### Fase 7 — UI: exibir nº de visitas

- `LeadDetailSheet`: mostrar badge "Visitas: N" quando `visitas_loja > 0`.
- `FichasPanel` / lista de clientes: tooltip ou coluna opcional indicando visitas múltiplas.
- Status `trabalhado`: aparece nos selects de filtro e no fluxo de transições permitidas (supervisor pode reativar).

### Fase 8 — Edge function `generate-followups`

Verificar se gera FUP para `trabalhado` — não deve gerar (é status final do processo, igual a `desqualificado_novo` hoje).

---

## Garantias contra bugs

- **Idempotência do check-in**: o incremento só acontece via fluxo de check-in (botão), nunca em mudança genérica de status. Evita contar 2x se o usuário clicar várias vezes — botão já tem `loadingAction` que bloqueia.
- **Compat retroativa**: backfill garante que dashboards históricos continuem corretos. `foiNaLoja` aceita ambos os formatos no período de transição.
- **Métricas de "carros na loja"**: continuam sendo `count(distinct lead)`, nunca `sum(visitas)`. Confirmado em todos os painéis.
- **Status `trabalhado`**: só afeta leads `novo` que tiveram FUP encerrado **agora**; leads antigos permanecem `desqualificado_novo` (sem reescrever histórico).

## Perguntas antes de executar

1. Lead **walk-in/porta** sem agendamento: cria já com `visitas_loja = 1` e `etapa = "na_loja"` (hoje cai direto como presente)? **Sim, é o comportamento atual** — só formalizo o contador.
2. No painel TV / Metas, o status `trabalhado` deve **contar como evasão** (junto com desqualificados) ou ficar **neutro/separado**? Minha recomendação: separado — não polui taxa de evasão, mas aparece como linha própria nos relatórios.
3. Se um lead `concluido` voltar (raro, mas possível), permitir reabrir para `reagendado` e novo check-in incrementar de novo? Recomendo: **sim**, supervisor pode fazer isso, e o contador reflete corretamente.

