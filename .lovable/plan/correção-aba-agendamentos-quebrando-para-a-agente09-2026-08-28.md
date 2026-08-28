# Correção: aba "Agendamentos" quebrando para a agente09

## Causa confirmada

Reproduzi o problema logando no preview como agente09 (Gabrielle Rezende). Ao clicar em "Agendamentos" a tela fica em branco e o erro de execução é `Invalid time value`.

A origem é um dado inválido: a ficha da cliente **lorena** está com data de agendamento gravada como **`82026-08-25`** (ano digitado errado, "82026" em vez de "2026"). O painel monta a data com `new Date(data + "T12:00:00")` e formata; com esse valor a data é inválida, o `format` lança exceção e derruba a página inteira (tela branca), não apenas o card.

Como essa ficha cai na lista de "Próximos Agendamentos", só o painel de Agendamentos da agente quebra — os demais painéis que não formatam essa data seguem funcionando.

## O que fazer

1. **Corrigir o dado**: ajustar a ficha da lorena para `2026-08-25` (confirmar a data correta com a agente antes, se preferir). Também verificar se existem outras fichas com data fora de um intervalo plausível e corrigir.
2. **Blindar a renderização**: criar um helper de formatação de data segura (retorna "—" quando a data é inválida em vez de lançar erro) e usá-lo nos pontos que formatam `data_agendamento` / datas vindas do banco no painel de agendamentos e nos demais painéis que usam o mesmo padrão `new Date(x + "T12:00:00")`.
3. **Evitar novo caso**: validar a data no momento do agendamento (modal de agendamento e ajuste de data), rejeitando datas fora de uma faixa razoável (ex.: entre 2020 e 2 anos à frente), com mensagem clara ao usuário.
4. **Rede de segurança**: adicionar um error boundary em volta do conteúdo das abas do dashboard, para que um erro em um card mostre uma mensagem de erro no painel em vez de deixar o app em tela branca.

## Detalhes técnicos

- Arquivos: `src/components/AgentSchedulePanel.tsx`, `src/lib/leadUtils.ts` (helper `formatDataSegura`), `src/components/ScheduleModal.tsx` e o fluxo de "Ajustar data" em `src/components/LeadDetailSheet.tsx`, além de um novo `src/components/ErrorBoundary.tsx` aplicado nos dashboards.
- Correção de dado via update pontual no lead `23384a3c-0c42-4b1e-80c7-ee4fb02d4ad8`.
- Opcional (recomendado): constraint no banco em `leads.data_agendamento` limitando o intervalo de anos, para impedir gravação de datas absurdas por qualquer caminho.
