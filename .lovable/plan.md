## Problema

No painel **Fichas**, ao filtrar por cidade (ex.: Araguari), apenas leads com `id_unidade` preenchido aparecem. Leads em etapa `novo` e `desqualificado_novo` ainda não possuem unidade (a regra só exige unidade a partir de `agendado`), então não aparecem no filtro — mesmo quando foram cadastrados por agentes vinculados àquela cidade.

Exemplo real (16/06): a agente Taina (vinculada apenas a Araguari) criou 12 leads hoje. Filtrando por Araguari, apenas 3 (já agendados) aparecem; os outros 9 (`novo`/`desq_novo`) parecem "sumidos".

## Solução

Ampliar o filtro de cidade no Fichas para incluir leads **sem unidade** cujo agente está vinculado àquela cidade via `agente_unidades`.

### Regra exata

Um lead aparece no filtro `cidade = X` quando:
- `lead.id_unidade = X` **OU**
- `lead.id_unidade IS NULL` **E** o `lead.id_agente` está vinculado a `X` em `agente_unidades`

Isso resolve a percepção de "leads perdidos" sem alterar o schema nem a obrigatoriedade de unidade nas etapas avançadas.

## Implementação

Apenas frontend — uma única alteração em `src/components/FichasPanel.tsx`:

1. Construir um mapa `agentesPorUnidade: Record<unidadeId, Set<agenteId>>` a partir de `agentUnidades` (já disponível em `useLeads()`).
2. No `useMemo` `filtered`, substituir:
   ```ts
   if (unidadeFilter !== "todas") result = result.filter((l) => l.id_unidade === unidadeFilter);
   ```
   por:
   ```ts
   if (unidadeFilter !== "todas") {
     const agentesDaUnidade = agentesPorUnidade[unidadeFilter] ?? new Set();
     result = result.filter((l) =>
       l.id_unidade === unidadeFilter ||
       (l.id_unidade == null && agentesDaUnidade.has(l.id_agente))
     );
   }
   ```
3. Adicionar `agentUnidades` ao `useLeads()` destructuring no topo do componente.

### Fora do escopo

- **Não** mexer no Relatório Diário (já está correto, conta tudo que o agente criou).
- **Não** alterar schema, triggers, ou tornar `id_unidade` obrigatório em `novo`.
- **Não** mexer em outros painéis (Manager, Supervisor, etc.) — se aparecer a mesma divergência neles, tratar em um pedido separado.

## Validação

Após a mudança, no perfil gestor:
- Filtrar Fichas por **Araguari** + **data de entrada hoje** → deve mostrar 12 leads (3 agendados + 9 novos/desq_novo da Taina).
- Filtrar por **outra cidade** sem leads `novo` daquela agente → contagem inalterada.
- Sem filtro de cidade → contagem total inalterada.
