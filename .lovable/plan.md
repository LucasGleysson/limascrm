
## Diagnóstico

Sim, hoje um mesmo carro pode ser contado como "na loja" em mais de um mês. O bug está em `ManagerDashboard.tsx` (linhas 60-85) e `SupervisorDashboard.tsx` (linhas 62-74), no cálculo de `filteredLeads`:

```ts
const entradaIn = l.data_entrada >= from && l.data_entrada <= to;
const agendIn = l.data_agendamento && l.data_agendamento >= from && l.data_agendamento <= to;
if (entradaIn || agendIn) return true;
```

O lead entra em `filteredLeads` se **a data de entrada OU a data de agendamento** caem no mês. Depois, `carrosNaLoja = filteredLeads.filter(foiNaLoja).length` apenas olha o status atual do lead.

Consequências reais:

1. **Duplicidade entre meses** — lead que entrou em abril e foi reagendado para maio:
   - Abril: `data_entrada` em abril → entra no filtro → se status é `na_loja/concluido/...` é contado.
   - Maio: `data_agendamento` em maio → também entra no filtro → contado de novo.
   - O mesmo carro aparece em "carros na loja" de abril E de maio.

2. **Contagem retroativa** — lead que entrou em abril mas só foi à loja em maio:
   - No início de maio (status ainda `agendado`), abril mostrava ele como agendamento, não como na loja.
   - Quando o status virou `na_loja/concluido` em maio, abril passou a contá-lo (porque `data_entrada` é abril e `foiNaLoja` agora é true).
   - É exatamente o que você observou: o número de "carros na loja" de abril cresceu depois.

Observação: `DailyReportPanel` e `TVDashboardPanel` já usam a regra correta (`checkin` do dia). `MetasUnidadesPanel`/`MetasAgentesPanel` usam `getLeadMetaDate` (checkin → data_agendamento) que já é uma data única por lead. O problema está concentrado nos dashboards "Visão Geral" e "Por Loja/Por Agente" do gestor e supervisor.

## Correção proposta

Ancorar **"carros na loja"** em uma data única e imutável por lead: a data do `checkin`. Sem checkin, o carro nunca foi à loja, ponto.

Para os demais indicadores manter a lógica atual de leads que "tocaram o mês" (entrada OU agendamento), mas adicionar um helper claro para distinguir:

1. **Em `src/lib/leadUtils.ts`**: adicionar
   ```ts
   export function foiNaLojaNoPeriodo(lead, from, to): boolean {
     if (!lead.checkin) return false;
     const dia = lead.checkin.slice(0, 10);
     return dia >= from && dia <= to;
   }
   ```
   Isso garante que **cada carro conta em exatamente um mês** (o mês do check-in real).

2. **`ManagerDashboard.tsx` e `SupervisorDashboard.tsx`**:
   - Substituir `filteredLeads.filter((l) => foiNaLoja(l)).length` por `leads.filter((l) => foiNaLojaNoPeriodo(l, from, to)).length` para os cards/blocos:
     - "Carros na loja"
     - Concluídos / Dispensados / Perdidos / Análise supervisor (quando contados como "na loja do mês")
     - Os recortes equivalentes em "Por Origem", "Por Unidade" e "Por Agente" (linhas ~94, 123, 320, 422 em DashboardOverviewPanel e equivalentes nos dashboards).
   - Manter `filteredLeads` como está para "novos", "agendados", "trabalhados", "desqualificados" — essas etapas continuam fazendo sentido pela data de entrada/agendamento.

3. **`DashboardOverviewPanel.tsx`**: aceitar `periodRange` (já recebe) e usar `foiNaLojaNoPeriodo` nos mesmos pontos. As contagens "snapshot" de status atual (`confirmado`, `na_loja`, `analise_supervisor`) continuam usando `filteredLeads` porque representam o pipeline corrente, não histórico fechado.

4. **Sem mudanças em**: `DailyReportPanel`, `TVDashboardPanel`, `MetasUnidadesPanel`, `MetasAgentesPanel`, `FichasPanel`, `FollowUpTrackingPanel` — já usam regra correta ou não somam "na loja" por período.

## Resultado esperado

- Cada carro conta em **um único mês** (o do check-in).
- O número de "carros na loja" de um mês fechado **não muda mais** depois que o mês acabou (porque depende só de `checkin`, que é imutável após o atendimento).
- Leads antigos sem `checkin` mas com status legado (`confirmado`, `perdido` em dados históricos pré-checkin) deixam de ser contados como "na loja" — alinhado com a regra que já vale no Relatório Diário e no Painel TV.

## Pontos a confirmar antes de implementar

1. Concorda em **ancorar "carros na loja" exclusivamente no `checkin`** (regra que já vale no Relatório Diário e no Painel TV)? Leads históricos com status `dispensado/perdido/concluido` mas sem `checkin` deixarão de aparecer no card, mas continuam visíveis na ficha.
2. Para "Concluídos" e "Perdidos" no card do mês: contar pelo mês do `checkin` também (recomendado, casa com Metas) ou manter pelo mês de entrada/agendamento?
