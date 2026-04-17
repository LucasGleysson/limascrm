

O usuário está questionando: depois do backfill que converteu 233 leads de `desqualificado_novo` para `trabalhado`, por que o card "Desq. Novo" ainda mostra 142 (abril) e não diminuiu?

Preciso investigar com SELECT real na base, separando por mês, para mostrar o antes/depois.

Vou consultar:
1. Quantos `desqualificado_novo` existem hoje no total e em abril/2026.
2. Quantos `trabalhado` existem hoje no total e em abril/2026.
3. Confirmar que o backfill rodou (233 trabalhados no total bate).

## Plano (apenas explicação, sem código)

Vou rodar 2 queries para confirmar a contabilidade antes/depois do backfill e responder com os números reais — diferenciando "total histórico" de "abril/2026", já que o card mostra apenas o período filtrado.

**Hipótese:** o backfill reduziu sim o número de `desqualificado_novo`, mas:
- Os 142 de abril são o que **sobrou** após a conversão (já é o número pós-backfill).
- Antes do backfill, abril tinha ~142 + 62 = ~204 desq.novo. Os 62 viraram trabalhado, restaram 142.
- Você não viu "diminuir ao vivo" porque a conversão aconteceu antes de você abrir o painel.

Vou confirmar isso com SQL e te mostrar a prova numérica.

