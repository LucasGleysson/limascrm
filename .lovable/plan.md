
# Plano revisado: Agente N↔N Loja + ficha editável + dedupe por telefone

Modelo continua **last-touch puro** (sem tabelas de histórico). Métricas seguem o `id_agente` e `id_unidade` atuais do lead.

## 1. Cadastro de lead (sem unidade)

`NewLeadModal`:
- **Remover** o campo de unidade do formulário. Lead nasce com `id_unidade = NULL`.
- Cadastro fica só com nome, telefone e origem (para agente). Recepcionista e fluxo "porta" continuam como hoje (recepcionista define a loja dela; porta usa a loja da tela).
- **Dedupe por telefone**: antes de inserir, normalizar o telefone para dígitos e fazer `SELECT id, nome, etapa, id_agente FROM leads WHERE telefone_digits = ?`.
  - Se existir, abrir um `AlertDialog`:
    - "Já existe um lead com este telefone: **Fulano** — etapa atual: **X** — agente: **Y**."
    - Botões: **Cancelar** | **Abrir lead existente** (foca/abre `LeadDetailSheet` do existente) | **Cadastrar mesmo assim** (só visível para gestor/supervisor).
  - Agente comum **não** pode forçar duplicata; só cancelar ou abrir o existente.
- Implementação do match: comparar pelos dígitos do telefone (`regexp_replace(telefone,'\D','','g')`) para ignorar máscara. Fazer via `.ilike` em coluna gerada não vale a pena agora — usar query simples no client comparando dígitos contra todos os leads visíveis ao usuário; se for gestor/supervisor, query direta no banco com `LIKE '%últimos 8 dígitos%'` (rápido o suficiente para o volume atual).

## 2. Agendamento (única hora em que a unidade é exigida)

`ScheduleModal`:
- Campo "Unidade" obrigatório.
- Opções = lojas do **agente responsável pelo lead** (via `agente_unidades`). Se o agente tem só 1 loja → pré-selecionada e o select fica desabilitado.
- Submit bloqueado sem unidade.
- Trigger no banco: se `etapa IN ('agendado','reagendado','confirmado','na_loja','concluido','dispensado','perdido','analise_supervisor')` então `id_unidade IS NOT NULL`. Bloqueia escapes via outras telas.
- Remover trigger `leads_autofill_unidade` (deixou de fazer sentido com agente N lojas).

## 3. Editar ficha completa (gestor / supervisor)

Hoje o `LeadDetailSheet` tem edição parcial. Adicionar um botão **"Editar ficha"** visível só para `cargo ∈ {gestor, supervisor}` que abre um modal `EditLeadModal` com todos os campos editáveis:

- Nome, telefone (com mesma máscara), origem
- **Agente responsável** — `Select` com todos os agentes ativos
- **Unidade** — `Select`; se o agente escolhido não atende a unidade atual, o sistema força reescolher entre as lojas dele (ou "Sem loja" se o lead ainda não foi agendado)
- Número da OS, tags de serviço, data de agendamento
- Notas livres

Regras:
- Trocar agente e/ou unidade salva direto em `leads` — métricas movem na mesma hora (last-touch).
- Toast: "Ficha atualizada — métricas recalculadas".
- Agente comum **não** vê esse botão; continua com a edição limitada que já tem.

## 4. Painel simples de vínculos agente↔loja

O `StoreAgentAssigner` atual fica preso à tela da loja. Criar **`AgentUnitMatrix`** — uma única matriz unificada acessível pelo gestor (ex.: dentro do `UserManagement` ou em nova aba "Vínculos"):

```text
                  Loja A   Loja B   Loja C   Loja D
  Agente 1          ☑        ☐        ☑        ☐
  Agente 2          ☐        ☑        ☑        ☑
  Agente 3          ☑        ☐        ☐        ☐
```

- Linhas = agentes, colunas = lojas, células = checkbox.
- Marcar/desmarcar faz `insert`/`delete` em `agente_unidades` imediatamente, com toast.
- Limite visual: cada agente até 3 lojas (warning, não bloqueio rígido).
- Busca por nome de agente no topo.

Isso resolve nos dois sentidos: dá pra atribuir começando pelo agente OU pela loja, sem navegar loja por loja. O `StoreAgentAssigner` existente pode continuar para edição rápida dentro da página da loja, mas a matriz vira a ferramenta principal.

## 5. Visibilidade e métricas

- `LeadContext` do agente já filtra por `agente_unidades` — ok.
- Recepcionista continua com `unidade_padrao` — ok.
- `profiles.unidade_padrao` deixa de ser usado em qualquer caminho de agente (grep e remover).
- Dashboards: nenhum cálculo muda. Adicionar bucket "Sem loja" no `MetasUnidadesPanel` e `DashboardOverviewPanel` apenas para leads ainda não agendados (informativo, não soma em meta).
- `MetasAgentesPanel` segue contando pelo agente atual.

## 6. Ordem de implementação

1. **Migração**: trigger de validação de `id_unidade` por etapa + remover `leads_autofill_unidade` + ajustar RLS de UPDATE em `leads` (agente só altera `id_unidade` para loja dele).
2. **`NewLeadModal`**: remover campo de unidade + dedupe por telefone com modal.
3. **`ScheduleModal`**: unidade obrigatória, opções = lojas do agente do lead, pré-seleção quando só 1.
4. **`EditLeadModal`** + botão "Editar ficha" no `LeadDetailSheet` (apenas gestor/supervisor).
5. **`AgentUnitMatrix`** — matriz unificada de vínculos.
6. **Dashboards**: bucket "Sem loja" + limpeza de leituras de `profiles.unidade_padrao` para agente.
7. **QA manual**: cadastrar sem unidade → tentar duplicar telefone → agendar (exige unidade) → gestor edita ficha trocando agente e loja → métricas batem.

## 7. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Leads antigos sem `id_unidade` em etapa avançada | Trigger só valida INSERT/UPDATE futuros; linhas existentes não são tocadas |
| Dedupe lento para gestor com base grande | Query indexada por sufixo do telefone; performance hoje é tranquila |
| Gestor trocar agente "errado" e bagunçar métrica do mês | Toast claro + log no campo `notas` ("ficha editada por X em Y") |
| Algum lugar ainda lendo `profiles.unidade_padrao` de agente | Grep final antes de fechar |

## 8. O que **não** entra (decisão explícita)

- Sem `lead_atribuicoes`, sem `lead_eventos_funil`, sem snapshot em `eventos`.
- Sem split de crédito entre agentes.
- Sem metas agente×loja agora (a estrutura permite no futuro).
