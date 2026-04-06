

## Plano de Ajustes — 3 Correções

### 1. "Meu Dia" do Agente — Corrigir "Na Loja" e remover card "Concluídos"

**Problema:** `carrosHoje` (linha 96) filtra `data_agendamento === today` com status `[concluido, dispensado, perdido]`, mas exclui `confirmado` e `na_loja`. "Na Loja" deve incluir todos que foram confirmados naquele dia.

**Correção em `AgentDashboard.tsx`:**
- Linha 96: adicionar `confirmado` e `na_loja` ao filtro de `carrosHoje`:
  ```typescript
  const carrosHoje = todayAgendados.filter((l) =>
    ["confirmado", "na_loja", "concluido", "dispensado", "perdido"].includes(l.etapa)
  ).length;
  ```
- Remover o card "Concluídos" (linha 391) e o cálculo `concluidosHoje` (linha 97)
- Ajustar o grid de 4 para 3 colunas na primeira linha de cards

### 2. Relatório por Agente expansível (Supervisor e Gestor)

**Problema:** A tabela de agentes mostra apenas números resumidos. O pedido é que, ao clicar em um agente, apareça um painel detalhado similar ao "Meu Desempenho" do agente.

**Correção em `SupervisorDashboard.tsx` e `ManagerDashboard.tsx`:**
- Adicionar estado `expandedAgente` para controlar qual linha está expandida
- Ao clicar na linha do agente, expandir uma seção abaixo com:
  - KPIs: Leads Recebidos, Desqualificados, Produtivos, Agendamentos
  - KPIs: Média Carros Loja/Dia, Na Loja, No-Show
  - Taxas: Comparecimento (Na Loja / Agendados), Conversão (Na Loja / Produtivos)
  - Resgatados e Ganhos com FUP
- Calcular métricas usando os leads filtrados daquele agente no período selecionado
- Usar layout de cards compactos (grid 2x4) dentro da linha expandida

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `AgentDashboard.tsx` | Fix Na Loja + remover card Concluídos |
| `SupervisorDashboard.tsx` | Linha de agente expansível com métricas |
| `ManagerDashboard.tsx` | Linha de agente expansível com métricas |

