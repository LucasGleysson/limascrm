# Adicionar Reagendados aos Eventos

## Problema
Hoje, na aba de Eventos do agente, os leads com `etapa = "reagendado"` são agrupados junto com os `agendado` nas categorias `Amanhã / Agend. Hoje / Atrasados`, o que torna difícil identificá-los e priorizá-los separadamente.

## Solução
Separar "Reagendado" como uma categoria própria na lista de follow-ups pendentes, com botão de filtro próprio (no mesmo padrão dos botões "Atrasados" e "Dispensados").

## Mudanças

### `src/components/EventoPanel.tsx`

1. **`categorizeFollowup`**: Antes de cair na lógica de datas para `agendado/reagendado`, retornar `"reagendado"` quando `lead.etapa === "reagendado"`. Assim, reagendados não somem em `ignore` mesmo se a `data_agendamento` for futura (>amanhã).

2. **`followupsByCategory`**: Adicionar a chave `reagendado: []` no objeto de categorias inicial.

3. **Botões de filtro de categoria** (linhas ~409-): Adicionar uma nova entrada entre "Atrasados" e "Dispensados":
   ```
   { key: "reagendado", label: "Reagendados",
     count: followupsByCategory.reagendado.length,
     cls: "bg-warning/10 text-warning border-warning/30" }
   ```

4. Nenhuma mudança no edge function `generate-followups` — reagendados já estão incluídos lá (categoria `agendado`).

## Resultado
- Reagendados aparecem como um grupo próprio nos follow-ups pendentes.
- Novo botão "Reagendados (n)" filtra a lista por essa categoria, igual a "Atrasados" e "Dispensados".
- Reagendados com `data_agendamento` no futuro (não só hoje/amanhã/atrasado) também ficam visíveis nesse filtro.
