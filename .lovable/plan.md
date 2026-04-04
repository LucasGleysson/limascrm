

## Plano de Ajustes — 6 Correções

### 1. LeadDetailSheet — Agente envia para Análise (não Perda)

**Problema:** O botão (Skull) e modal dizem "Marcar como Perda" e enviam para `perdido` diretamente, mesmo para agentes.

**Correção em `src/components/LeadDetailSheet.tsx`:**
- Para agentes (`!isSupervisorOrGestor`): trocar ícone Skull por AlertCircle, texto para "Enviar para Análise", cor warning (não destructive)
- `handleMarkLoss`: se agente → `analise_supervisor`; se supervisor/gestor → `perdido`
- Modal: título "Enviar para Análise do Supervisor", texto "será enviado para análise", botão "Enviar para Análise" (warning, ícone AlertCircle)
- Supervisor/gestor mantém o comportamento atual (Skull, "Confirmar Perda", `perdido`)

### 2. EventoPanel — Botão de análise consistente

**Problema:** Linhas 626-627 — botão diz "Confirmar Perda" com Skull no modal de análise.

**Correção em `src/components/EventoPanel.tsx`:**
- Trocar botão para: `variant="default"` (ou warning), ícone AlertCircle, texto "Enviar para Análise"
- Remover Skull desse modal

### 3. DispensaReportPanel — Busca, colunas e paginação

**Correções em `src/components/DispensaReportPanel.tsx`:**
- Adicionar input de busca por **nome, telefone e OS** (filtro de texto)
- Trocar coluna "FUP DISPENSA" → "OS" (mostra `lead.numero_os`)
- Trocar coluna "AÇÕES" → "VERIFICAÇÃO" com Badge (Pendente = `analise_supervisor`, Analisado = já decidido como perdido/desq)
- Manter botões de decisão inline apenas para leads `analise_supervisor`
- Adicionar filtros por etapa: dispensado, perdido, desq_agendado, desq_novo, analise_supervisor
- Adicionar paginação com `usePagination`

### 4. "Minha Loja" → "Meu Desempenho" (métricas do MÊS)

**Substituir completamente a aba `minha_loja` em `src/pages/AgentDashboard.tsx`:**

Renomear sidebar tab para "Meu Desempenho" (ícone TrendingUp).

Filtrar `allMyLeads` pelo **mês atual** (data_entrada entre 1º e último dia do mês).

**Cards KPI:**
- Leads Recebidos (total mês)
- Leads Desqualificados (desq_novo)
- Leads Produtivos (total - desq_novo)
- Agendamentos feitos (leads que saíram de "novo")
- Média de agendamentos/dia (meta: 4/dia) com indicador visual
- Na Loja (concluído + dispensado + perdido + confirmado + reagendado)
- Concluídos
- No-Show (agendados cujo `data_agendamento` já passou e etapa ainda é agendado/reagendado)
- Taxa comparecimento (na loja / agendados)
- Taxa conversão produtivos (na loja / produtivos)
- Resgatados Concluídos (leads que foram dispensados e depois concluídos)
- Ganhos com FUP (leads que passaram por analise_supervisor e depois concluídos)

**Gráficos:**
- BarChart: agendamentos por dia do mês + linha de média diária (meta 4)
- PieChart: aproveitamento — produtivos que foram na loja vs não foram
- Progress bar: progressão da meta do mês (carros concluídos / meta_carros)

Remover contadores de status individuais da "Minha Loja".

### 5. Supervisor — Lembretes pendentes

**Correção em `src/pages/SupervisorDashboard.tsx`:**
- Na contagem de `fupPendentes` por agente (linhas 85-95), adicionar lembretes pendentes (`tipo === "lembrete"`) com `data_prevista <= todayStr` e lead não concluído
- Exibir como "Pendentes (FUP + Lembretes)" no resumo por agente

### 6. Divergência de Metas

**Análise necessária em `MetasAgentesPanel.tsx` e `MetasUnidadesPanel.tsx`:**
- Garantir que o cálculo de "carros para meta" (concluído + perdido) use a mesma lógica de filtragem por período que a visão "Por Agente" e "Por Loja"
- Se Metas fazem fetch independente com dual-date, alinhar para que conte apenas leads cujo `data_agendamento` OU `data_entrada` cai no mês selecionado (sem duplicar)

---

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `LeadDetailSheet.tsx` | Botão perda → análise para agentes |
| `EventoPanel.tsx` | Texto/ícone do botão de análise |
| `DispensaReportPanel.tsx` | Busca, colunas OS/Verificação, paginação |
| `AgentDashboard.tsx` | "Meu Desempenho" com métricas mensais e gráficos |
| `SupervisorDashboard.tsx` | Incluir lembretes na contagem de pendentes |
| `MetasAgentesPanel.tsx` | Alinhar contagem de carros para meta |
| `MetasUnidadesPanel.tsx` | Alinhar contagem de carros para meta |

