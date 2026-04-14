

## Painel de Exibição (TV Dashboard) — Central de Atendimento

### Conceito

Um painel visual de alto impacto, otimizado para exibição em telas grandes (TVs, monitores), seguindo as melhores práticas de wallboards de vendas:

- **Fontes grandes e legíveis à distância** (mínimo 24px para números, 18px para labels)
- **Cores semânticas fortes** — verde para meta batida, amarelo para em progresso, vermelho para atraso
- **Atualização em tempo real** via dados do LeadContext
- **Layout limpo** com foco em 5-6 métricas máximas por card
- **Elementos motivacionais** — animações sutis, ícones de conquista, barra de progresso visual

### Layout

```text
┌──────────────────────────────────────────────────────────┐
│ [☰ Toggle Sidebar]  🚗 AutoCRM — Painel do Dia  📅 14/04│
│                      ⏰ 14:32 (atualiza a cada 60s)     │
├──────────────────────────────────────────────────────────┤
│  RESUMO GERAL (barra horizontal)                        │
│  [🚗 Total Na Loja: 18/20] [📅 Agendados Hoje: 25]     │
│  [✅ Concluídos: 12] [⏳ Faltam: 2 para meta]           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │LARANJEI.│ │GRANDVIL.│ │PATROCÍN│ │ARAGUARI │       │
│  │         │ │         │ │         │ │         │       │
│  │  [PIE]  │ │  [PIE]  │ │  [PIE]  │ │  [PIE]  │       │
│  │  3/4    │ │  5/4 🏆│ │  2/4    │ │  4/4 ✅│       │
│  │         │ │         │ │         │ │         │       │
│  │Agend: 6 │ │Agend: 8 │ │Agend: 4 │ │Agend: 7 │       │
│  │Falta: 1 │ │Meta! 🎉│ │Falta: 2 │ │Meta! ✅│       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                    ┌─────────┐                           │
│                    │ CATALÃO │                           │
│                    │  [PIE]  │                           │
│                    │  2/4    │                           │
│                    │Agend: 3 │                           │
│                    │Falta: 2 │                           │
│                    └─────────┘                           │
└──────────────────────────────────────────────────────────┘
```

### Detalhes de cada Card de Unidade

Cada card terá:
1. **Nome da unidade** em destaque
2. **Gráfico de pizza (donut)** — segmentos: Concluído (verde), Na Loja (amarelo), Dispensado (laranja), Perdido (vermelho)
3. **Número grande central** no donut: `X/4` (carros na loja vs meta diária de 4)
4. **Barra de progresso** visual abaixo do donut
5. **Agendados hoje**: quantos leads agendados para o dia
6. **Faltam**: `max(0, 4 - naLoja)` carros para bater meta
7. **Indicador visual de conquista**: emoji/ícone quando meta é atingida (🏆), com cor verde no card

### Elementos motivacionais
- Card fica com borda verde brilhante e ícone de troféu quando unidade bate a meta
- Pulso animado sutil no número central quando está próximo da meta (falta 1)
- Relógio em tempo real no header
- Auto-refresh dos dados a cada 60 segundos

### Sidebar colapsável
- Botão no header para ocultar/mostrar o sidebar do gestor
- Quando oculto, o painel ocupa 100% da largura — ideal para TV
- Sidebar mostra perfil do gestor e navegação para outras abas

### Implementação técnica

| Arquivo | Ação |
|---------|------|
| `src/components/TVDashboardPanel.tsx` | **Criar** — Componente principal do painel TV |
| `src/pages/ManagerDashboard.tsx` | **Editar** — Adicionar tab "Painel TV" no sidebar + estado de sidebar colapsável |

### Lógica de dados (reutiliza LeadContext)

```typescript
// Para cada unidade, filtra leads do dia (data_agendamento === hoje)
const hoje = getToday();
const leadsHoje = leads.filter(l => 
  l.data_agendamento === hoje || l.data_entrada === hoje
);

// Por unidade: naLoja, agendados, concluídos, faltam
unidades.forEach(u => {
  const uLeads = leadsHoje.filter(l => l.id_unidade === u.id);
  const naLoja = uLeads.filter(l => foiNaLoja(l.etapa)).length;
  const agendados = uLeads.filter(l => l.data_agendamento === hoje).length;
  const faltam = Math.max(0, 4 - naLoja);
});
```

### Responsividade
- Grid de 5 colunas em tela grande (≥1400px)
- Grid de 3 colunas em tela média
- Grid de 2 colunas em tela menor
- Cards com `min-height` generoso para legibilidade à distância

