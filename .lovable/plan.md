

## Correção: `analise_supervisor` contado como "Na Loja"

### Problema

O status `analise_supervisor` indica um lead que passou pela loja, teve follow-up encerrado, e agora aguarda decisão do supervisor (Perda ou Desqualificado). Porém, ele **não está na lista canônica** de `foiNaLoja`, fazendo com que esses leads desapareçam da contagem "Na Loja" em todos os dashboards.

### Solução

Adicionar `analise_supervisor` à função `foiNaLoja` em `src/lib/leadUtils.ts`:

```typescript
export const foiNaLoja = (etapa: string): boolean =>
  ["confirmado", "na_loja", "concluido", "dispensado", "perdido", "reagendado", "analise_supervisor"].includes(etapa);
```

### Impacto

Como todos os dashboards (Gestor, Supervisor, Agente, Relatório Diário, Inteligência) já usam `foiNaLoja`, a correção é **uma única linha** e propaga automaticamente para todos os cards e gráficos.

### Arquivo afetado

| Arquivo | Mudança |
|---------|---------|
| `src/lib/leadUtils.ts` | Adicionar `"analise_supervisor"` à lista de `foiNaLoja` |

