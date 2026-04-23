
# Regra definitiva do Painel TV: contador de carros que foram hoje

## Confirmação da lógica

O contador principal do Painel TV deve ser apenas:

```text
Carros que fizeram check-in hoje na unidade
```

Ou seja, o carro conta para hoje se:

```ts
lead.checkin começa com a data de hoje
```

Não importa se depois ele foi:
- concluído
- dispensado
- perdido
- reagendado para outro dia
- enviado para análise
- atualizado em outro campo

Se o `checkin` foi hoje, ele continua contando como carro que foi hoje.

Se o `checkin` foi ontem e o lead foi finalizado hoje, ele não conta hoje. Conta apenas no dia do check-in.

---

## Situação atual do código

No `TVDashboardPanel.tsx`, a regra principal já está correta:

```ts
const checkinHoje = (l) =>
  !!l.checkin && l.checkin.startsWith(hoje);

const passouHoje = uLeads.filter(checkinHoje);

const naLoja = passouHoje.length;
```

Isso significa que o número central de cada unidade já representa:

```text
quantos carros fizeram check-in hoje naquela unidade
```

E ele continua contando mesmo se o lead depois mudar para `dispensado`, `perdido`, `concluido` ou `reagendado`.

---

## Ajuste necessário: deixar o donut acompanhar exatamente o contador

O ponto que precisa correção não é a regra principal do contador, mas a composição visual do círculo.

Hoje o donut separa apenas:
- Concluído
- Em Loja
- Dispensado
- Perdido
- Restante

Mas um lead que fez check-in hoje e depois ficou em outro status, como `confirmado`, `reagendado` ou `analise_supervisor`, pode contar no número central e não aparecer claramente em nenhuma fatia do círculo.

Isso pode fazer parecer que o círculo não acompanha o número, especialmente em uma unidade específica como Catalão.

---

## Implementação proposta

### 1. Manter `naLoja` como contador puro de check-in do dia

Não alterar esta regra:

```ts
const passouHoje = uLeads.filter(checkinHoje);
const naLoja = passouHoje.length;
```

Esse será o contador oficial:

```text
Carros que foram hoje
```

---

### 2. Criar uma fatia “Atendidos” no donut

Adicionar uma categoria visual para todos os carros que fizeram check-in hoje, mas não estão em:
- concluído
- em loja
- dispensado
- perdido

Exemplo:

```ts
const outrosAtendidos = Math.max(
  0,
  naLoja - concluidos - emLoja - dispensados - perdidos
);
```

E incluir no gráfico:

```ts
{ name: "Atendidos", value: outrosAtendidos, color: DONUT_COLORS.atendidos }
```

Essa fatia cobre casos como:
- `confirmado`
- `reagendado`
- `analise_supervisor`
- qualquer outro status que já teve check-in hoje

Resultado: o círculo passa a representar exatamente o mesmo total do número central.

---

### 3. Desativar animação do donut no Painel TV

Para evitar a sensação de atraso visual entre número e círculo:

```tsx
<Pie isAnimationActive={false} />
```

Assim, quando os dados atualizarem, número e círculo mudam juntos.

---

### 4. Ajustar textos para não gerar dúvida

Trocar o rótulo do card global de:

```text
Na Loja
```

Para algo mais fiel à regra:

```text
Carros Hoje
```

Ou manter “Na Loja”, mas com comentário interno claro no código:

```text
Na Loja = carros com check-in hoje, mesmo que depois tenham sido dispensados, concluídos, perdidos ou reagendados.
```

Minha recomendação é usar no TV:

```text
Carros Hoje
```

Porque é exatamente o que você pediu: um contador apenas de carros que foram hoje.

---

## Regras finais esperadas

### Caso 1: chegou hoje e foi dispensado

```text
checkin = hoje
etapa = dispensado
```

Conta hoje no Painel TV.

---

### Caso 2: chegou hoje e foi reagendado para outro dia

```text
checkin = hoje
data_agendamento = amanhã
etapa = reagendado
```

Conta hoje no Painel TV.

---

### Caso 3: chegou ontem e foi concluído hoje

```text
checkin = ontem
checkout = hoje
etapa = concluido
```

Não conta hoje. Conta apenas ontem.

---

### Caso 4: agendado hoje, mas ainda não chegou

```text
data_agendamento = hoje
checkin = vazio
etapa = agendado
```

Não conta como carro hoje. Entra apenas em “Agendados Hoje”.

---

## Arquivo a editar

- `src/components/TVDashboardPanel.tsx`

## Resultado

O Painel TV terá um contador confiável por unidade:

```text
Carros Hoje = todos os leads com check-in hoje naquela unidade
```

E o círculo visual passará a acompanhar exatamente esse número, incluindo carros concluídos, dispensados, perdidos, reagendados ou em qualquer outro status após terem dado entrada hoje.
