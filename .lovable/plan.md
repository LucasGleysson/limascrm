
# Plano: corrigir follow-ups e agendamentos pendentes para agentes e apoios

## Objetivo

Garantir que agentes e recepcionistas/apoios vejam todos os agendamentos e reagendamentos pendentes das unidades pelas quais são responsáveis, sem perda por limite de consulta, vínculo incompleto de agente ou eventos de follow-up criados com outro responsável.

O problema principal parece estar em dois pontos:

1. O agente hoje enxerga principalmente leads vinculados diretamente a `id_agente`.
2. As consultas de recepcionista ainda podem cair no limite padrão de 1000 registros em algumas situações.

Isso faz com que um carro atrasado apareça para a apoio da unidade, mas não apareça no painel de follow-up do agente responsável pela unidade.

---

## Regra funcional final

### Para agentes

O agente deve visualizar no painel de follow-up e agendamentos:

```text
Leads onde:
- id_agente = agente logado
OU
- id_unidade pertence às unidades que esse agente atende em agente_unidades
```

Isso cobre casos como:

```text
Agente cuida de Grandville e Laranjeiras
Lead está em Grandville
Lead está agendado/reagendado atrasado
Mesmo que id_agente esteja vazio ou diferente, ele deve aparecer para follow-up da unidade
```

Sem substituir o agente comercial do cadastro: o sistema apenas dá visibilidade operacional pelo vínculo da unidade.

---

### Para recepcionistas/apoios

A apoio deve continuar vendo apenas clientes da sua unidade:

```text
lead.id_unidade = unidade_padrao da recepcionista
```

Mas sem limite de 1000 registros, tanto para:
- agendamentos
- reagendamentos atrasados
- clientes
- lembretes
- eventos relacionados à unidade

---

## Implementação proposta

### 1. Corrigir carregamento de leads no `LeadContext`

Arquivo:

```text
src/contexts/LeadContext.tsx
```

Ajustar a busca inicial para carregar `agente_unidades` antes de montar a regra de visibilidade do agente.

Para agente:

```text
buscar leads onde:
id_agente = currentUser.id
OU
id_unidade IN unidades vinculadas ao agente
```

Para recepcionista:

```text
buscar leads da unidade_padrao
```

Para gestor/supervisor:

```text
buscar todos os leads
```

Também ajustar a paginação interna para incluir recepcionistas, não apenas gestor/supervisor/agente.

Hoje a paginação ampla já existe, mas a recepcionista pode cair no `.then(r => r.data)` sem `.range()`, o que pode limitar dados.

---

### 2. Corrigir carregamento de eventos/follow-ups

Arquivo:

```text
src/contexts/LeadContext.tsx
```

Não depender apenas de:

```text
eventos.id_usuario = agente logado
```

Porque alguns follow-ups podem ter sido criados com:
- `id_usuario` antigo
- `id_usuario` vazio
- `id_usuario` de outro usuário
- lead criado pela recepção sem agente direto

A regra correta deve ser:

```text
carregar eventos relacionados aos leads visíveis para aquele perfil
```

Fluxo proposto:

```text
1. Buscar leads visíveis do usuário
2. Montar lista de ids desses leads
3. Buscar eventos onde id_lead está nessa lista
4. Fazer isso com paginação/chunks para não cair em limite
```

Para gestor/supervisor, pode continuar buscando todos os eventos paginados.

Resultado:

```text
Se o lead atrasado aparece para a unidade, o follow-up também aparece para o agente responsável pela unidade e para a apoio da unidade.
```

---

### 3. Corrigir painel de follow-up do agente

Arquivo:

```text
src/components/EventoPanel.tsx
```

Hoje o painel usa:

```ts
leads.filter((l) => l.id_agente === currentUser.id)
```

Trocar para uma função de visibilidade do agente:

```text
lead pertence ao agente
OU
lead pertence a uma unidade que o agente atende
```

Isso deve ser aplicado em:
- `myLeads`
- `myLeadIds`
- follow-ups pendentes
- categorias de follow-up:
  - novos
  - amanhã
  - agendados hoje
  - agendados atrasados
  - dispensados
- busca por nome/telefone
- lista de leads disponíveis para criar lembrete/evento

---

### 4. Corrigir painel de agendamentos do agente

Arquivo:

```text
src/components/AgentSchedulePanel.tsx
```

Hoje também usa:

```ts
leads.filter((l) => l.id_agente === currentUser.id)
```

Ajustar para a mesma regra:

```text
lead do agente
OU
lead de unidade atendida pelo agente
```

Assim, agendamentos e reagendamentos atrasados das unidades Grandville/Laranjeiras aparecem para o agente que cuida dessas lojas.

---

### 5. Garantir que apoio/recepção não perca dados

Arquivo:

```text
src/pages/ReceptionistDashboard.tsx
```

A lógica visual da recepção já filtra por unidade:

```ts
lead.id_unidade === currentUser.unidade_padrao
```

Ajuste principal será garantir que o `LeadContext` entregue todos os dados da unidade, sem limite de 1000 registros.

Também revisar:
- aba Agendamentos
- grupo Atrasados
- grupo Hoje
- grupo Novos
- aba Clientes
- aba Lembretes

Para garantir que todos usem `unitLeads` completo e não listas parciais.

---

### 6. Ajustar permissões do backend para não bloquear conclusão/atualização

Será necessário revisar as regras de segurança de `leads` e `eventos`.

#### Leads

Permitir que agente atualize lead se:

```text
id_agente = auth.uid()
OU
id_unidade está em agente_unidades do auth.uid()
OU
usuário é gestor/supervisor
OU
recepcionista está na unidade do lead
```

Isso permite que o agente conclua follow-up de um lead da unidade que ele atende, mesmo que o lead tenha sido criado pela recepção.

#### Eventos

Permitir que usuário atualize/conclua evento se:

```text
id_usuario = auth.uid()
OU
evento pertence a lead do agente
OU
evento pertence a lead de unidade atendida pelo agente
OU
evento pertence à unidade da recepcionista
OU
usuário é gestor/supervisor
```

Isso evita erro ao concluir follow-ups que foram criados com `id_usuario` vazio ou diferente.

---

## O que não será alterado

Não vamos mudar a propriedade comercial do lead automaticamente.

Ou seja:

```text
id_agente não será sobrescrito só porque o agente viu ou concluiu o follow-up.
```

O lead pode continuar tendo:
- agente comercial
- recepcionista/apoio
- unidade
- eventos/follow-ups operacionais

Isso preserva a regra que você definiu:

```text
Recepcionista não substitui agente.
Cliente pode ter interação com agente e recepção, ou apenas com recepção.
```

---

## Sobre paginação visual

A interface pode continuar mostrando 20 itens por página para manter o layout organizado.

Mas isso será apenas paginação visual.

O total real deve considerar todos os registros carregados, sem cortar em 1000 registros.

---

## Arquivos previstos

```text
src/contexts/LeadContext.tsx
src/components/EventoPanel.tsx
src/components/AgentSchedulePanel.tsx
src/pages/ReceptionistDashboard.tsx
supabase/migrations/*
```

---

## Resultado esperado

Depois da implementação:

```text
Agente que atende Grandville e Laranjeiras verá todos os agendamentos/reagendamentos atrasados dessas unidades.
```

```text
Apoio/recepcionista verá todos os agendamentos/reagendamentos/lembretes da sua unidade.
```

```text
Follow-ups não deixarão de aparecer por causa de id_usuario, id_agente vazio ou limite de consulta.
```

```text
Nenhum cliente será atribuído automaticamente a outro agente apenas por aparecer no painel de follow-up.
```
