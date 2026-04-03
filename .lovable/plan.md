

## Plano de Melhorias — AutoCRM Lima's

### Parte 1: Corrigir Limite de 1000 Fichas (Crítico)

**Problema:** O Supabase/PostgREST limita respostas a 1000 linhas por requisição. O `.limit(5000)` no código é ignorado pelo servidor.

**Solução:** Implementar paginação server-side com `.range()` em loop no `LeadContext.tsx`:

```text
Bloco 1: range(0, 999)    → 1000 registros
Bloco 2: range(1000, 1999) → até 1000
Bloco 3: range(2000, 2999) → até 1000
... até que retorne < 1000 ou atinja 10.000
```

Isso será aplicado em:
- `LeadContext.tsx` — fetch global de leads para supervisor/gestor
- `MetasUnidadesPanel.tsx` e `MetasAgentesPanel.tsx` — fetch independente mensal (que também pode ultrapassar 1000)

**Arquivos:** `src/contexts/LeadContext.tsx`, `src/components/MetasUnidadesPanel.tsx`, `src/components/MetasAgentesPanel.tsx`

---

### Parte 2: Relação Agente ↔ Loja (Many-to-Many)

**Problema atual:** O campo `profiles.unidade_padrao` (texto, singular) só permite 1 loja por agente. Mas um agente pode atender 2+ lojas e uma loja pode ter 2+ agentes.

**Solução:** Criar tabela de junção `agente_unidades`:

```sql
CREATE TABLE public.agente_unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_agente uuid NOT NULL,
  id_unidade uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id_agente, id_unidade)
);
```

Com RLS para leitura autenticada e gestão por supervisor/gestor.

**Impacto no código:**
- `StoreAgentAssigner.tsx` — passa a inserir/deletar na tabela `agente_unidades` ao invés de atualizar `unidade_padrao`
- `SupervisorDashboard.tsx` e `ManagerDashboard.tsx` — o mapa `agentUnitMap` passa a retornar array de unidades por agente
- Relatórios "Por Loja" — filtram agentes via `agente_unidades` ao invés de `unidade_padrao`
- `profiles.unidade_padrao` continua existindo como "loja principal" para sidebar e conveniência, sem ser removido
- `LeadContext.tsx` — fetch da tabela `agente_unidades` junto com os demais dados

**Arquivos:** Migration SQL, `src/contexts/LeadContext.tsx`, `src/components/StoreAgentAssigner.tsx`, `src/pages/SupervisorDashboard.tsx`, `src/pages/ManagerDashboard.tsx`

---

### Parte 3: Novo Fluxo de "Perda" — Análise do Supervisor

**Mudança de regra de negócio:** Agentes não podem mais marcar leads como "perdido". Quando o follow-up é encerrado, ao invés de ir direto para "perdido", o lead vai para um status intermediário: `analise_supervisor`.

**Alterações:**

1. **`EventoPanel.tsx`** — Remover botão "Marcar como Perda" dos agentes. Na função `getEncerrarStatus`, leads que iriam para `perdido` agora vão para `analise_supervisor`.

2. **`FollowUpTrackingPanel.tsx`** — Mesma lógica: `getEncerrarStatus` retorna `analise_supervisor` ao invés de `perdido` para leads pós-loja.

3. **`DispensaReportPanel.tsx`** — Expandir para mostrar leads com `etapa === "analise_supervisor"` com botões de ação para o supervisor decidir: "Manter como Desqualificado" ou "Marcar como Perda".

4. **`leadUtils.ts`** — Adicionar `analise_supervisor` nas funções utilitárias. Este status NÃO conta como "Na Loja" nem como "Perda" até o supervisor decidir.

5. **`mockData.ts`** — Adicionar `analise_supervisor` ao array `ETAPAS_FUNIL`.

**Arquivos:** `src/components/EventoPanel.tsx`, `src/components/FollowUpTrackingPanel.tsx`, `src/components/DispensaReportPanel.tsx`, `src/lib/leadUtils.ts`, `src/data/mockData.ts`

---

### Parte 4: Reorganização do Agente (Desempenho)

**Manter as abas atuais** (Leads, Agendamentos, Recepção, Eventos) sem alterar — o usuário confirmou que funcionam bem e não quer perder funcionalidades.

**Adicionar a aba "Desempenho"** unificando "Meu Dia" + "Minha Loja" com seletor de período:

```text
Abas: Leads | Agendamentos | Recepção | Eventos | Desempenho
                                                     ↓
                                          [Hoje | Semana | Mês | Mês Anterior]
                                          
  Funil da Safra:
  Registros → Produtivos → Agendados → Na Loja → Concluídos
     100         85           60          30         22
                           tx:70%      tx:50%     tx:73%
  
  + Seção "Minha Loja" (quando aplicável)
```

**Arquivos:** `src/pages/AgentDashboard.tsx`

---

### Parte 5: Reorganização do Supervisor

**Unificar "Visão Geral" + "Relatório Diário"** num único "Dashboard" com seletor de data no topo:

```text
Abas: Dashboard | Agentes | Lojas | Fichas | Follow-ups | Análise | Metas
                                                            ↓
                                                  (antigo Rel. Dispensa
                                                   + análise de perdas)
```

- **Dashboard:** Cards de KPI + safra diária + resumo por agente, com seletor de período/data
- **Análise:** Evolução do antigo "Rel. Dispensa" para incluir leads `analise_supervisor` com ações de decisão
- Demais abas mantêm funcionalidade atual

**Arquivos:** `src/pages/SupervisorDashboard.tsx`, `src/pages/ManagerDashboard.tsx`

---

### Resumo de Execução

| Fase | Mudança | Risco | Prioridade |
|------|---------|-------|------------|
| 1 | Paginação server-side `.range()` | Baixo | Urgente |
| 2 | Tabela `agente_unidades` (N:N) | Médio | Alta |
| 3 | Status `analise_supervisor` | Médio | Alta |
| 4 | Aba "Desempenho" do agente | Baixo | Média |
| 5 | Unificar Dashboard do supervisor | Médio | Média |

Cada fase é independente e pode ser implementada sequencialmente sem quebrar as anteriores.

