# Rank de agentes — 24 a 31 de agosto de 2026

Dados extraídos direto do banco. Critérios usados:

- **Registros**: leads com data de entrada entre 24 e 31/08. Entre parênteses os **produtivos** (total menos "Desqualificado (Novo)").
- **Carros na loja**: check-in realizado entre 24 e 31/08.
- **Carros na meta**: leads em "Concluído" ou "Perdido" ancorados no check-in (ou na data de agendamento, quando não houve check-in) dentro do período.
- **Agendamentos**: ver observação abaixo — o banco não guarda a data em que o agendamento foi marcado, então há duas leituras possíveis.

## Tabela geral (ordenada por registros)

| # | Agente | Registros (produtivos) | Agendamentos (safra) | Agendamentos (amplo) | Carros na loja | Carros na meta |
|---|--------|------------------------|----------------------|----------------------|----------------|----------------|
| 1 | Taina Valeriano | 72 (53) | 17 | 65 | 21 | 17 |
| 2 | Leonardo Mauro | 64 (47) | 18 | 19 | 13 | 7 |
| 3 | Julio Cesar | 48 (39) | 13 | 14 | 8 | 7 |
| 4 | Gabrielle Rezende | 28 (22) | 8 | 9 | 5 | 3 |
| 5 | Auxiliar | 18 (13) | 4 | 26 | 2 | 2 |
| 6 | Giovanna Borguini | 11 (11) | 6 | 15 | 4 | 2 |
| 7 | Gisele Mirtes | 2 (2) | 0 | 22 | 1 | 0 |
| 8 | Matheus Nigro | 0 (0) | 0 | 4 | 0 | 0 |

**Total**: 243 registros (187 produtivos), 66 agendamentos (safra) / 174 (amplo), 54 carros na loja, 38 carros na meta.

## Rank por agendamentos (critério amplo)

| # | Agente | Agendamentos |
|---|--------|--------------|
| 1 | Taina Valeriano | 65 |
| 2 | Auxiliar | 26 |
| 3 | Gisele Mirtes | 22 |
| 4 | Leonardo Mauro | 19 |
| 5 | Giovanna Borguini | 15 |
| 6 | Julio Cesar | 14 |
| 7 | Gabrielle Rezende | 9 |
| 8 | Matheus Nigro | 4 |

## Rank por carros na loja

| # | Agente | Na loja | Na meta | Aproveitamento (na loja / produtivos) |
|---|--------|---------|---------|----------------------------------------|
| 1 | Taina Valeriano | 21 | 17 | 40% |
| 2 | Leonardo Mauro | 13 | 7 | 28% |
| 3 | Julio Cesar | 8 | 7 | 21% |
| 4 | Gabrielle Rezende | 5 | 3 | 23% |
| 5 | Giovanna Borguini | 4 | 2 | 36% |
| 6 | Auxiliar | 2 | 2 | 15% |
| 7 | Gisele Mirtes | 1 | 0 | 50% |
| 8 | Matheus Nigro | 0 | 0 | — |

## Observação importante sobre "agendamentos feitos no período"

O banco guarda apenas a **data marcada** do agendamento, não a data em que o agendamento foi feito. Por isso duas colunas:

- **Safra**: leads que entraram entre 24 e 31/08 e possuem agendamento (independente da data agendada). Subestima, pois ignora leads antigos agendados no período.
- **Amplo**: os anteriores + leads que possuem agendamento e foram atualizados entre 24 e 31/08. É a melhor aproximação disponível de "agendamento feito no período", mas pode incluir leads alterados por outro motivo.

Se quiser exatidão nesse número daqui pra frente, o próximo passo seria registrar em coluna própria a data/hora em que o agendamento foi marcado (e por quem), passando a alimentar todos os relatórios com esse campo.
