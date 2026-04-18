

O usuário quer que o Painel TV funcione como um **registro do dia** (snapshot histórico), não como um contador volátil que reflete apenas o status atual do lead. 

**Problema atual**: se um lead agendado para hoje passa na loja, é dispensado e depois reagendado para outro dia, ele desaparece de TODAS as métricas do dia (agendados E na loja), porque a query filtra por `data_agendamento === hoje` — e o reagendamento muda essa data.

**Solução**: usar `checkin` como fonte de verdade para "passou hoje" e separar a lógica de "agendado hoje" para incluir leads que **estavam** agendados hoje, mesmo que tenham sido reagendados depois.

## Mudanças no `TVDashboardPanel.tsx`

Reescrever o `unitStats` com duas fontes:

```text
1. naLoja (passou na loja HOJE) — REGISTRO HISTÓRICO:
   leads onde checkin existe AND checkin::date === hoje
   — independe de etapa atual ou data_agendamento atual
   — se o lead foi reagendado depois, AINDA conta (porque passou hoje)

2. agendados (esperados HOJE) — REGISTRO + STATUS ATUAL:
   leads onde:
     (a) data_agendamento === hoje E etapa in [agendado, reagendado, confirmado]
         → ainda esperando chegar
     OU
     (b) checkin::date === hoje
         → já chegou hoje (mesmo se data_agendamento foi alterada depois para reagendar)
   
   Exclui: desqualificado_agendado SEM checkin hoje (nunca chegou)

3. emLoja (no momento, na loja agora):
   data_agendamento === hoje AND etapa in [na_loja, analise_supervisor]
   OU checkin hoje AND checkout NULL AND etapa in [na_loja, analise_supervisor]

4. concluidos / dispensados / perdidos (HOJE):
   checkin::date === hoje AND etapa === respectiva
   — usa checkin como âncora do dia, não data_agendamento
```

**Princípio**: `checkin` é imutável e marca "esteve aqui hoje". `data_agendamento` muda com reagendamento e não serve como âncora histórica.

### Pie chart por unidade

Recalcular `pieData` com base nos leads que tiveram `checkin` hoje + os que ainda estão agendados pendentes — para que o donut reflita o "movimento real do dia".

### Arquivos editados

- `src/components/TVDashboardPanel.tsx`

