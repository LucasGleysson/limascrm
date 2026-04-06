

## Plano de Correções e Melhorias

### Problema 1: Leads de 30/03 agendados em 01/04 não contam como concluídos

**Causa raiz:** No "Meu Desempenho" do agente (linha 168), `monthLeads` filtra por `data_entrada >= mesAtual.from`, ou seja, apenas leads que **entraram** no mês atual. Um lead com `data_entrada = 2025-03-30` e `data_agendamento = 2025-04-01` que está como `concluido` NÃO aparece porque entrou em março.

**Correção em `AgentDashboard.tsx`:**
- O filtro de `monthLeads` para "Meu Desempenho" deve incluir leads cujo `data_entrada` OU `data_agendamento` caia no mês atual (sem duplicar). Mesma lógica dual-date que os painéis de metas deveriam usar.

**Correção em `MetasAgentesPanel.tsx`:**
- O `fetchMonthLeads` (linha 120-128) filtra apenas por `data_entrada`. Deve também incluir leads cujo `data_agendamento` caia no mês, para capturar leads que entraram em meses anteriores mas visitaram/concluíram neste mês.
- Adicionar KPI de "Na Loja" no painel de metas (concluído + dispensado + perdido + confirmado + reagendado)

**Correção em `MetasUnidadesPanel.tsx`:** mesma lógica dual-date.

---

### Problema 2: Cores dos status nos painéis

**Correção:** Aplicar `getStatusBadgeClass` (de `leadUtils.ts`) consistentemente nos painéis de supervisor e gestor onde status são exibidos como texto sem cor. Adicionar cores semânticas nos cards de KPI e nas tabelas de resumo. Cada status terá cor distinta:
- Novo: `text-info` (azul)
- Agendado/Reagendado: `text-purple-500`
- Confirmado: `text-info`
- Na Loja: `text-warning` (amarelo)
- Concluído: `text-success` (verde)
- Dispensado: `text-orange-500`
- Perdido: `text-destructive` (vermelho)
- Desq. Novo: `text-muted-foreground`
- Desq. Agendado: `text-destructive`
- Análise Supervisor: `text-warning`

**Arquivos:** `SupervisorDashboard.tsx`, `ManagerDashboard.tsx`, `MetasAgentesPanel.tsx`

---

### Problema 3: Dashboard geral do supervisor/gestor — formato parecido com relatório diário + seletor de mês

**Correção em `SupervisorDashboard.tsx` (aba visao_geral):**
- Manter o `PeriodFilter` existente (semana, mês, 30 dias, total)
- Adicionar navegação por mês (setas ← →) quando período = "mes", permitindo ver meses anteriores
- Reestruturar layout para parecer mais com o DailyReportPanel: cards de KPI no topo, tabela de resumo por agente expandível, resumo por loja

**Correção em `ManagerDashboard.tsx` (aba dashboard):** espelhar o mesmo comportamento.

---

### Problema 4: Relatório adicional do Gestor — visão por Loja, por Agente e por Origem

**Adicionar à aba dashboard do `ManagerDashboard.tsx`:**

**Visão por Loja (tabela):**
- Colunas: Loja | Na Loja | Concluídos | Dispensados (incl. reagendados) | Perdidos

**Visão por Agente (tabela):**
- Colunas: Agente | Leads Recebidos | Produtivos | Agendamentos | Na Loja | No-Show

**Visão por Origem (tabela expandida):**
- Colunas: Origem | Leads | Desq. Novo | Outra Cidade | Na Loja | Dispensados | Agendamentos Feitos | Agendamentos No-Show | Perdidos | Concluídos

**Arquivo:** `ManagerDashboard.tsx`

---

### Resumo de Arquivos

| Arquivo | Mudança |
|---------|---------|
| `AgentDashboard.tsx` | Fix filtro dual-date no "Meu Desempenho" |
| `MetasAgentesPanel.tsx` | Fix fetch dual-date + KPI "Na Loja" |
| `MetasUnidadesPanel.tsx` | Fix fetch dual-date + KPI "Na Loja" |
| `SupervisorDashboard.tsx` | Cores de status + navegação por mês |
| `ManagerDashboard.tsx` | Cores + tabelas por Loja/Agente/Origem + navegação por mês |

