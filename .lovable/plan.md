

## Diagnóstico confirmado

O **Painel TV está certo (3)**. O **Relatório Diário está inflando (4)** porque conta o LUIZ MAURO, que tem `visitas_loja=1` (histórico de visita anterior) e `data_agendamento=hoje` — mas ainda **não fez checkin hoje** (etapa `reagendado`, esperando chegar).

### Causa raiz
`DailyReportPanel.passaramNaLojaNoDia` usa esta regra:
```ts
foiNaLoja(l) && l.data_agendamento === dateStr
```
`foiNaLoja` retorna true para qualquer lead com `visitas_loja > 0` (histórico). Isso conta leads reagendados que vieram em outro dia como se tivessem passado hoje.

## Correção

Alinhar `DailyReportPanel` à mesma âncora do TV: **`checkin` do dia** é a única fonte de verdade para "passou na loja hoje". `data_agendamento` muda com reagendamento, não serve.

### Mudanças em `src/components/DailyReportPanel.tsx`

**1. `passaramNaLojaNoDia`** (linhas 26-35) — exigir checkin de hoje:
```ts
const passaramNaLojaNoDia = useMemo(() => {
  return leads.filter((l) => !!l.checkin && l.checkin.slice(0, 10) === dateStr);
}, [leads, dateStr]);
```

**2. `concluidosNoDia`** (linhas 38-46) — ancorar pelo checkin de hoje:
```ts
const concluidosNoDia = useMemo(() => {
  return leads.filter((l) =>
    l.etapa === "concluido" && !!l.checkin && l.checkin.slice(0, 10) === dateStr
  );
}, [leads, dateStr]);
```

**3. Subtítulo do card "Na Loja"** (linha 161): trocar `"Conf+Concl+Disp+Perd+Reag"` por `"Com check-in hoje"` para refletir a nova lógica.

### Impacto colateral

- `globalStats.agendados` (linha 60) continua usando `createdToday + etapas pós-agendamento` — isso mede "registros criados hoje que viraram agendamento", métrica diferente, mantém.
- Tabelas "Por Cidade" e "Por Agente" usam `passaramNaLojaNoDia` derivado, então automaticamente passam a bater com o TV.
- Leads reagendados (como LUIZ MAURO) deixam de inflar "Na Loja" do dia atual e aparecem corretamente no dia em que originalmente fizeram checkin.

### Arquivos editados

- `src/components/DailyReportPanel.tsx`

