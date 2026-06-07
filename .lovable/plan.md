## Objetivo

- Remover Catalão da operação sem apagar os 588 leads históricos.
- Criar nova unidade Pacaembu (entra "no lugar" da Catalão para leads novos).
- Forçar a ordem fixa de exibição: Laranjeiras, Grandville, Pacaembu, Patrocínio, Araguari, Serrana.

## Abordagem: flag `ativa` (soft-delete)

Em vez de deletar Catalão (o que apagaria FKs e quebraria histórico), adiciono uma coluna `ativa boolean` em `unidades`. Leads, métricas e relatórios antigos continuam funcionando porque `id_unidade` segue válido. Apenas as telas de criação/edição passam a listar somente unidades ativas.

### Mudanças no banco (1 migração)

1. `ALTER TABLE unidades ADD COLUMN ativa boolean NOT NULL DEFAULT true;`
2. `ALTER TABLE unidades ADD COLUMN ordem int;` (para ordem fixa configurável)
3. `UPDATE unidades SET ativa=false, ordem=NULL WHERE nome='Catalão';`
4. `INSERT INTO unidades (nome, ativa, ordem) VALUES ('Pacaembu', true, 3);`
5. Definir `ordem` nas demais: Laranjeiras=1, Grandville=2, Pacaembu=3, Patrocínio=4, Araguari=5, Serrana=6.
6. Trigger leve em `leads` (BEFORE INSERT): se `id_unidade` referenciar unidade inativa, bloquear. Updates de leads antigos não são afetados (só INSERT). Opcionalmente, permitir UPDATE quando `OLD.id_unidade = NEW.id_unidade` para não travar edições de leads antigos da Catalão.

### Mudanças no frontend

Um único helper em `LeadContext` já carrega `unidades`. Adicionar:
- Ordenação global por `ordem ASC NULLS LAST, nome ASC` no fetch.
- Helper `unidadesAtivas` derivado (`unidades.filter(u => u.ativa)`).

Telas que devem passar a usar **apenas** `unidadesAtivas` (criação/seleção para novos fluxos):
- `ScheduleModal` (selecionar unidade no agendamento)
- `UserManagement` (lojas atendidas / loja da recepcionista)
- `AgentUnitMatrix` (colunas)
- `StoreAgentAssigner`

Telas que continuam usando **todas** as `unidades` (para preservar histórico):
- `LeadDetailSheet` (edição de leads antigos — mostra a unidade atual mesmo se inativa, marcada como "(inativa)")
- Filtros de relatórios/dashboards (`MetasUnidadesPanel`, `DashboardOverviewPanel`, `FichasPanel`, etc.) — mostram unidades inativas só quando há leads delas no período.

### Vínculos `agente_unidades` da Catalão

Deletar os vínculos existentes de Catalão (não há mais razão para um agente "atender" Catalão). Isso é seguro: não afeta leads.

### Ordem fixa garantida

Como `ordem` vive no banco, todo lugar que faz `SELECT ... FROM unidades` herda a ordem certa via `ORDER BY ordem NULLS LAST, nome`. Frontend só replica a ordem do array recebido.

## Passos de implementação

1. Migração: coluna `ativa`, coluna `ordem`, update da Catalão, insert do Pacaembu, set de `ordem` nas demais, trigger anti-INSERT em unidade inativa, delete dos `agente_unidades` da Catalão.
2. `LeadContext`: aplicar `ORDER BY ordem NULLS LAST, nome` e expor `unidadesAtivas`.
3. Trocar `unidades` por `unidadesAtivas` nas telas de criação/seleção listadas acima.
4. `LeadDetailSheet`: ao mostrar unidade do lead, se inativa, exibir badge "(inativa)" e permitir mantê-la, mas não permitir trocar PARA uma inativa.
5. QA manual:
   - Lead antigo da Catalão continua visível, editável (sem trocar unidade) e contabilizado nas métricas do histórico.
   - Novo lead → agendamento só lista Laranjeiras, Grandville, Pacaembu, Patrocínio, Araguari, Serrana, nessa ordem.
   - Matrix agente↔loja não mostra mais Catalão.
   - Vínculo agente-Pacaembu funciona.

## Riscos

- Algum componente pode estar usando `unidades` direto sem passar pelo contexto — varrer com `rg "from.*unidades"` antes do passo 3.
- Edge function `generate-followups` provavelmente não toca `unidades.ativa`; verificar.
- Se algum agente estava vinculado SÓ à Catalão, ficará sem lojas e não conseguirá agendar — listar esses casos no QA e re-vincular manualmente.

## O que NÃO faço

- Não altero nenhum lead existente (nem nome, nem `id_unidade`).
- Não deleto Catalão fisicamente.
- Não mexo em metas históricas das unidades.
