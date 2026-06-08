
# Meu Painel — Nova primeira aba do Agente

Substitui a aba **"Meu Desempenho"** por uma nova aba **"Meu Painel"** focada em mostrar ao agente, de forma gamificada, sua situação do dia, semana e mês — com destaque para a META.

## Mudanças na navegação

- Renomeia a tab `minha_loja` ("Meu Desempenho") para `meu_painel` ("Meu Painel"), ícone `Trophy`.
- Move `meu_painel` para a **primeira posição** do sidebar (substituindo `leads` como entrada inicial).
- `activeTab` inicial passa a ser `"meu_painel"` em `AgentDashboard.tsx`.
- O conteúdo antigo de "Meu Desempenho" (gráficos detalhados, pie, etc.) é removido — sai do escopo desta aba.

## Estrutura da nova aba (top → bottom)

### 1. Cabeçalho de boas-vindas
- "Olá, {nome do agente} 👋" + data atual.
- Subtítulo curto motivacional ("Vamos bater a meta de hoje!").

### 2. Card META do mês (destaque máximo)
- Card grande, full-width, com gradiente do primary.
- Mostra: **Progresso da Meta = Concluídos + Perdidos** vs **75**.
- Barra de progresso grande (`Progress`) com % alcançado.
- Texto: "X de 75 carros" + "faltam Y".
- Badge dinâmica de status: 🏆 "Meta batida!" (≥75) / 🔥 "No ritmo" (em dia c/ dias úteis) / ⚠️ "Acelerar" (abaixo).
- Mostra média diária realizada e a média necessária para fechar 75 (em dias úteis restantes).
- Soma somente os leads onde o agente é responsável (`l.id_agente === currentUser.id`) no mês corrente, usando `getLeadMetaDate` para ancorar o mês.

### 3. Calendário da semana atual
- Faixa horizontal com 7 dias (Seg→Dom da semana atual, destacando hoje).
- Cada dia mostra: data + nº de agendamentos (`agendado` + `reagendado` + `confirmado` com `data_agendamento` naquele dia).
- Pequena barrinha colorida indicando densidade (vazio / leve / cheio).
- Click no dia abre a aba "Agendamentos" filtrada (fase 2; nesta entrega só destaque visual).

### 4. Grid de status (mês atual)
Cards pequenos coloridos com contagens do mês para os leads do agente, na ordem pedida:
- Novo Lead • Agendados • Confirmados • Na Loja • Reagendados • Dispensados • Em Análise • Concluídos • Perdidos
- Cada card usa cor semântica via `getStatusBadgeClass` e ícone.
- Cards menores que o card META, em grid responsivo (3-5 colunas).

### 5. Desempenho por Loja
- Se o agente atende **N lojas** (via `agente_unidades`), renderiza **N cards** lado a lado.
- Cada card de loja mostra:
  - Nome da unidade.
  - Mini-meta: progresso (Concluídos + Perdidos do agente naquela loja) vs **75**.
  - Barra de progresso.
  - Mini contagens: Agendados / Na Loja / Concluídos / Perdidos (do agente, naquela loja, no mês).
- Se o agente tem só 1 loja, mostra 1 card; se 3 lojas, 3 cards.

## Lógica de cálculo

- **Mês corrente:** `mesAtual.from`/`to` (já existe).
- **Leads do agente no mês:** filtrar `allMyLeads` por `l.id_agente === currentUser.id` e `getLeadMetaDate(l)` dentro do mês.
- **Meta (75):** constante por enquanto (`META_AGENTE = 75`). Futuramente pode vir de `metas_agentes`.
- **Progresso meta:** `concluidos + perdidos` (regra já consolidada via `isCarroParaMeta`).
- **Dias úteis:** reutilizar contagem já presente em `desempenho.bizDays`.
- **Por loja:** filtrar leads do agente onde `l.id_unidade === unidade.id`.
- **Semana atual:** `startOfWeek`/`endOfWeek` do `date-fns` com `weekStartsOn: 1`.

## Arquivos afetados

- `src/pages/AgentDashboard.tsx`
  - Atualiza `SIDEBAR_TABS` (renomeia, reordena, novo ícone).
  - Muda `useState("leads")` → `useState("meu_painel")`.
  - Remove bloco JSX da antiga `minha_loja` e adiciona novo bloco `meu_painel` montando o componente novo.
- `src/components/AgentPanelOverview.tsx` (novo)
  - Componente da nova aba, com todas as seções acima. Recebe leads/unidades/agentUnidades/currentUser via props ou via `useLeads`/`useRole`.
- (Opcional) pequeno subcomponente `WeekStrip` interno ao mesmo arquivo.

## Fora de escopo
- Editar a meta de 75 por agente (mantida como constante; pode virar configurável depois).
- Click no dia da semana abrir a aba de agendamentos filtrada.
- Animações elaboradas (mantemos gamificação leve: ícones, emojis, cores, badge de status, barra de progresso).
