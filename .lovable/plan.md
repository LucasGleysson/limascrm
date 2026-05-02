# Plano: normalizar relacionamentos de Unidade, Agente, Recepcionista e Lead

## Diagnóstico do estado atual

Estrutura encontrada hoje:

```text
unidades (id, nome)
profiles (id, nome, cargo, unidade_padrao TEXT)   -- guarda 1 unidade como string
agente_unidades (id_agente, id_unidade)           -- N:N já existe, mas é subutilizada
leads (id, id_agente, id_unidade, id_recepcionista, ...)
```

Problemas reais verificados no banco:

```text
- 1.140 leads SEM id_unidade (de 2.186 leads no total, ~52%)
- Maria Eduarda atende 2 unidades, tem unidade_padrao=NULL e 486 leads sem unidade
- Yasmin tem unidade_padrao mas 0 vínculos em agente_unidades
- profiles.unidade_padrao é TEXT, não FK -> não há integridade
- Código usa em alguns pontos unidade_padrao, em outros agente_unidades, em outros faz "fallback" misturando os dois (ManagerDashboard, SupervisorDashboard)
- RLS de leads/eventos para recepcionista usa profiles.unidade_padrao::uuid (cast frágil)
```

Consequências práticas:

```text
- Contagens "leads por unidade" ficam erradas (lead sem id_unidade some do total da loja)
- Agente que atende 2 lojas nunca aparece corretamente em relatórios por loja
- Recepção pode não ver leads que o agente criou sem informar a loja
- Cada relatório resolve "qual a loja do lead" de um jeito diferente
```

## Objetivo

Tornar o modelo de dados realmente relacional para o domínio:

```text
Unidade  N---N  Agente          (via agente_unidades)
Unidade  1---N  Recepcionista   (recepcionista pertence a 1 unidade)
Unidade  1---N  Lead            (todo lead pertence a UMA unidade)
Agente   1---N  Lead            (lead pode ter um agente comercial responsável, opcional)
Recepcionista 1---N  Lead       (lead pode ter recepcionista que registrou, opcional)
```

Regra-chave: **`leads.id_unidade` passa a ser a única fonte de verdade da loja do cliente.**
Agente não "carrega" a unidade. A unidade está sempre no lead.

## Mudanças no banco (migration)

### 1. Backfill seguro do `leads.id_unidade`

Para cada lead onde `id_unidade IS NULL`:

```text
1. Se o agente do lead tem exatamente 1 vínculo em agente_unidades  -> usar essa unidade
2. Senão, se o agente tem profiles.unidade_padrao preenchida        -> usar essa
3. Senão, se o lead tem id_recepcionista com unidade_padrao         -> usar essa
4. Senão, deixar NULL e marcar para revisão manual no painel do gestor
```

Resultado esperado: praticamente todos os 1.140 leads ganham unidade automaticamente. Os que sobrarem aparecem numa lista "leads sem unidade" para o gestor corrigir.

### 2. Sincronizar `agente_unidades` com `profiles.unidade_padrao`

Para todo agente que tem `unidade_padrao` mas não tem linha equivalente em `agente_unidades`, inserir o vínculo. Isso resolve o caso da Yasmin.

### 3. Manter `agente_unidades` como única fonte de verdade do vínculo agente↔unidade

```text
- Adicionar FK: agente_unidades.id_agente -> profiles.id (ON DELETE CASCADE)
- Adicionar FK: agente_unidades.id_unidade -> unidades.id (ON DELETE RESTRICT)
- Constraint UNIQUE(id_agente, id_unidade) (provavelmente já existe via PK composta lógica; garantir)
- Index em (id_agente) e (id_unidade)
```

### 4. Tratar `profiles.unidade_padrao`

Para recepcionistas faz sentido (recepção pertence a 1 loja).
Para agentes vira um conceito legado e enganoso.

Decisão proposta:

```text
- Manter a coluna por enquanto (não dropar para não quebrar ninguém imediatamente)
- Para AGENTES: parar de ler unidade_padrao no app; ler sempre de agente_unidades
- Para RECEPCIONISTAS: continuar usando unidade_padrao (lá faz sentido como "lotação")
- Adicionar comentário SQL na coluna explicando: "Apenas para recepcionistas. Agentes usam agente_unidades."
- Em uma fase futura: mover recepcionistas também para uma tabela recepcionista_unidades para uniformidade (não nesta migration)
```

### 5. Reforçar integridade de `leads.id_unidade`

```text
- Adicionar FK leads.id_unidade -> unidades.id (ON DELETE RESTRICT) se ainda não existir
- Adicionar FK leads.id_agente -> profiles.id (ON DELETE SET NULL)
- Adicionar FK leads.id_recepcionista -> profiles.id (ON DELETE SET NULL)
- Index leads(id_unidade), leads(id_agente), leads(id_unidade, etapa), leads(id_unidade, data_agendamento)
```

Não tornar `id_unidade` NOT NULL agora (precisaria backfill 100%). Deixar como nullable após backfill, mas planejar transição para NOT NULL no futuro.

### 6. Trigger de proteção (opcional, recomendado)

Trigger BEFORE INSERT/UPDATE em `leads`:

```text
- Se id_unidade IS NULL e id_agente tem exatamente 1 unidade vinculada -> preencher automaticamente
- Se id_unidade IS NULL e id_recepcionista tem unidade_padrao -> preencher automaticamente
```

Assim novas inserções nunca mais ficam órfãs.

### 7. Funções utilitárias SQL (SECURITY DEFINER)

Para usar em RLS sem recursão e em queries do app:

```sql
-- Lista de unidades de um agente
agente_unidades_de(_user_id uuid) RETURNS SETOF uuid

-- O usuário (qualquer cargo) pode ver leads desta unidade?
pode_ver_unidade(_user_id uuid, _unidade uuid) RETURNS boolean
  -- gestor/supervisor: true
  -- recepcionista: profiles.unidade_padrao = _unidade
  -- agente: existe em agente_unidades
```

### 8. Atualizar RLS para usar essas funções

```text
- leads SELECT/UPDATE: usar pode_ver_unidade(auth.uid(), leads.id_unidade)
- eventos SELECT/UPDATE: via lead.id_unidade -> pode_ver_unidade
- Remover o cast frágil profiles.unidade_padrao::uuid das policies atuais
```

## Mudanças no código (sem quebrar nada)

### Princípios

```text
1. Para AGENTE: nunca mais usar currentUser.unidade_padrao. Sempre derivar de agentUnidades.
2. Para RECEPCIONISTA: continuar usando currentUser.unidade_padrao.
3. Para CONTAGEM POR UNIDADE: sempre filtrar por leads.id_unidade. Nunca por agente.unidade_padrao.
4. Remover toda lógica "getLeadUnidade(lead) = lead.id_unidade ?? agentUnitMap[lead.id_agente]?.[0]" 
   após o backfill — passa a ser sempre lead.id_unidade.
```

### Arquivos a ajustar

```text
src/contexts/LeadContext.tsx
  - Já está correto para agente. Validar.
  - Tipar agentUnidades com helper getUnidadesDoAgente(agenteId).

src/pages/AgentDashboard.tsx
  - Trocar leads.filter(l => l.id_unidade === currentUser.unidade_padrao)
    por leads.filter(l => myUnitIds.has(l.id_unidade))
  - "minha loja" deixa de existir como singular -> "minhas lojas"

src/pages/ManagerDashboard.tsx
src/pages/SupervisorDashboard.tsx
  - Remover getLeadUnidade com fallback. Usar sempre lead.id_unidade.
  - Listar agentes de uma unidade SEMPRE via agente_unidades.

src/components/MetasUnidadesPanel.tsx
  - unitAgents = profiles que aparecem em agente_unidades para essa unidade
    (não mais a.unidade_padrao === u.id)

src/components/DailyReportPanel.tsx
  - Igual: lista de agentes de uma unidade vem de agente_unidades.

src/components/AppSidebar.tsx
  - Para agente, mostrar lista de unidades atendidas (não unidade_padrao).
  - Para recepcionista, segue mostrando unidade_padrao.

src/components/NewLeadModal.tsx / ScheduleModal.tsx
  - Quando o agente cria um lead, exigir escolha de unidade entre as unidades dele
    (default = primeira; se só tem 1, pré-preenche).
  - Quando recepcionista cria, unidade já vem fixa da unidade_padrao dela.

src/pages/ReceptionistDashboard.tsx
  - Mantém filtro por unidade_padrao da recepcionista.

UI nova: "Leads sem unidade" no painel do gestor
  - Lista os leads que sobraram NULL após o backfill, com botão para atribuir unidade.
```

### Helper centralizado

Criar `src/lib/unidadeUtils.ts`:

```text
getUnidadesDoUsuario(user, agentUnidades) -> string[]
  - gestor/supervisor: todas as unidades
  - agente: ids de agente_unidades onde id_agente = user.id
  - recepcionista: [user.unidade_padrao]

podeVerLead(user, lead, agentUnidades) -> boolean
getAgentesDaUnidade(unidadeId, profiles, agentUnidades) -> Profile[]
contarLeadsPorUnidade(leads, unidadeId, filtro?) -> number
contarLeadsPorAgente(leads, agenteId, filtro?) -> number
```

Todos os componentes passam a chamar esses helpers. Acaba a divergência entre painéis.

## Compatibilidade e segurança da transição

```text
- Migration roda backfill ANTES de adicionar restrições
- Nada é deletado: unidade_padrao continua na tabela
- agente_unidades já existe e já é lida pelo app -> mudanças são incrementais
- RLS é trocada por funções equivalentes ou mais permissivas (nunca mais restritivas no momento da troca)
- Build verificado após cada bloco de alteração
```

## Resultado esperado

```text
- Toda contagem "X clientes na unidade Y" passa a bater entre todos os painéis
- Maria Eduarda (e qualquer agente multi-loja) consegue ver e ter seus leads contados nas 2 lojas corretamente
- Recepção da loja vê 100% dos leads da loja, mesmo os criados por agente que esqueceu de marcar a unidade (porque o trigger preenche)
- Gestor tem uma fila de "leads sem unidade" para corrigir, em vez de leads invisíveis
- Ao remover a coluna unidade_padrao no futuro (fase 2), nada do app quebra, porque agentes já não dependem dela
```

## Fora de escopo desta fase

```text
- Dropar profiles.unidade_padrao
- Migrar recepcionistas para tabela recepcionista_unidades
- Tornar leads.id_unidade NOT NULL
Esses passos ficam para uma fase 2, depois que a fila de "leads sem unidade" estiver zerada.
```
