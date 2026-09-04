# Remover Patrocínio do Painel da TV

## Objetivo
Tirar a unidade "Patrocínio" da lista de unidades exibidas no Painel da TV.

## Alteração
Arquivo: `src/components/TVDashboardPanel.tsx` (linha 42)

Hoje a lista de unidades permitidas é:
```ts
const allowed = new Set(["Laranjeiras", "Grandville", "Patrocínio", "Araguari", "Pacaembu", "Serrana"]);
```

Passará a ser:
```ts
const allowed = new Set(["Laranjeiras", "Grandville", "Araguari", "Pacaembu", "Serrana"]);
```

## Resultado
O Painel da TV deixará de mostrar o card de Patrocínio, exibindo apenas Laranjeiras, Grandville, Araguari, Pacaembu e Serrana.
