## Objetivo
Reagendados com `data_agendamento` vencida ainda devem entrar no processo de follow-up (FUP1 cai no dia do agendamento — quando vencido, é gerado para hoje). Hoje eles já caem no grupo "Reagendados" do EventoPanel, mas:
- não há destaque visual de "atrasado";
- não há sub-contador para os vencidos;
- o backlog (leads que já passaram da data sem FUP gerado) só vai virar evento na próxima execução do cron.

## Mudanças

### 1. `src/components/EventoPanel.tsx` — destacar reagendados atrasados
- Computar `reagendadoAtrasadosCount` = nº de eventos na categoria `reagendado` cujo `lead.data_agendamento < today`.
- No botão de filtro "Reagendados", quando houver atrasados, mostrar sufixo em destaque, por ex.:
  `Reagendados: N  (M atrasados)` — sub-texto em `text-destructive`.
- Em cada linha da lista, quando o lead for `reagendado` e `data_agendamento < today`, adicionar:
  - badge extra `Atrasado` em vermelho ao lado do badge de etapa;
  - manter a borda vermelha já aplicada por `isOverdue(evento.data_prevista)` (já cobre, pois o FUP gerado fica com data ≤ hoje).
- Nenhuma mudança em `categorizeFollowup`/elegibilidade — `reagendado` continua sempre elegível.

### 2. Backlog — gerar FUPs agora para reagendados vencidos
- Invocar manualmente a edge function `generate-followups` (já cobre `reagendado` com `data_agendamento` no passado e sem `checkin`).
- Hoje há 1 lead nessa condição; após executar, ele recebe FUP1 com `data_prevista = data_agendamento` (no passado) → aparece no grupo Reagendados marcado como atrasado.
- Não precisa alterar a lógica da edge function nem da trigger `leads_reset_fup_on_reagendamento` — a regra atual já gera o FUP corretamente.

### Detalhes técnicos
- A categoria `reagendado` no `followupsByCategory` já existe (lines 139, 419); a contagem extra é puramente derivada e local ao componente.
- `isOverdue` (já presente no arquivo) usa `data_prevista` do evento; como o FUP gerado para reagendado vencido sai com data passada, a borda vermelha aparece automaticamente.
- Sem novas migrações, sem mudanças de schema, sem mudanças nas demais telas.

## Resultado
- Reagendados vencidos continuam no botão "Reagendados", mas com contador "(M atrasados)" em vermelho e badge "Atrasado" por linha.
- O lead atualmente vencido (e quaisquer outros que entrarem nessa condição) ganha imediatamente o FUP1 ao rodar a função uma vez.
