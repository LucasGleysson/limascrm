# Rank de agentes — 15 a 31 de agosto de 2026

Dados extraídos direto do banco. Critérios usados:

- **Registros**: leads com data de entrada entre 15 e 31/08. Entre parênteses os **produtivos** (total menos "Desqualificado (Novo)").
- **Carros na loja**: check-in realizado entre 15 e 31/08.
- **Carros na meta**: leads em "Concluído" ou "Perdido" ancorados no check-in (ou na data de agendamento, quando não houve check-in) dentro do período.
- **Agendamentos**: ver observação abaixo — o banco não guarda a data em que o agendamento foi marcado, então há duas leituras possíveis.

## Tabela geral (ordenada por registros)

| # | Agente | Registros (produtivos) | Agendamentos (safra) | Agendamentos (amplo) | Carros na loja | Carros na meta |
|---|--------|------------------------|----------------------|----------------------|----------------|----------------|
| 1 | Taina Valeriano | 187 (141) | 60 | 95 | 56 | 52 |
| 2 | Auxiliar | 108 (64) | 18 | 34 | 14 | 9 |
| 3 | Gisele Mirtes | 96 (72) | 29 | 59 | 21 | 13 |
| 4 | Leonardo Mauro | 64 (47) | 18 | 19 | 13 | 7 |
| 5 | Julio Cesar | 47 (38) | 13 | 14 | 8 | 7 |
| 6 | Gabrielle Rezende | 27 (21) | 8 | 9 | 5 | 3 |
| 7 | Giovanna Borguini | 23 (23) | 13 | 23 | 8 | 4 |
| 8 | Auxiliar 2 | 5 (2) | 1 | 1 | 0 | 0 |
| 9 | Matheus Nigro | 0 (0) | 0 | 6 | 1 | 0 |

**Total**: 557 registros (408 produtivos), 126 agendamentos (safra) / 260 (amplo), 126 carros na loja, 95 carros na meta.

## Rank por agendamentos (critério amplo)

| # | Agente | Agendamentos |
|---|--------|--------------|
| 1 | Taina Valeriano | 95 |
| 2 | Gisele Mirtes | 59 |
| 3 | Auxiliar | 34 |
| 4 | Giovanna Borguini | 23 |
| 5 | Leonardo Mauro | 19 |
| 6 | Julio Cesar | 14 |
| 7 | Gabrielle Rezende | 9 |
| 8 | Matheus Nigro | 6 |
| 9 | Auxiliar 2 | 1 |

## Rank por carros na loja

| # | Agente | Na loja | Na meta | Aproveitamento (na loja / produtivos) |
|---|--------|---------|---------|----------------------------------------|
| 1 | Taina Valeriano | 56 | 52 | 40% |
| 2 | Gisele Mirtes | 21 | 13 | 29% |
| 3 | Auxiliar | 14 | 9 | 22% |
| 4 | Leonardo Mauro | 13 | 7 | 28% |
| 5 | Julio Cesar | 8 | 7 | 21% |
| 6 | Giovanna Borguini | 8 | 4 | 35% |
| 7 | Gabrielle Rezende | 5 | 3 | 24% |
| 8 | Matheus Nigro | 1 | 0 | — |
| 9 | Auxiliar 2 | 0 | 0 | 0% |

## Observação importante sobre "agendamentos feitos no período"

O banco guarda apenas a **data marcada** do agendamento, não a data em que o agendamento foi feito. Por isso duas colunas:

- **Safra**: leads que entraram entre 15 e 31/08 e possuem agendamento (independente da data agendada). Subestima, pois ignora leads antigos agendados no período.
- **Amplo**: os anteriores + leads que possuem agendamento e foram atualizados entre 15 e 31/08. É a melhor aproximação disponível de "agendamento feito no período", mas pode incluir leads alterados por outro motivo.

Se quiser exatidão nesse número daqui pra frente, o próximo passo seria registrar em coluna própria a data/hora em que o agendamento foi marcado (e por quem), passando a alimentar todos os relatórios com esse campo.
