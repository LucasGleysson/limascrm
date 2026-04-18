

Aplicar as mudanças que ficaram pendentes do plano anterior:

## 1. `EventoPanel.tsx` — esconder "Encerrar" pós-loja/agendamento

Mudar linha 424:
```ts
const canEncerrar = lead && !lead.fup_concluido 
  && !["agendado","reagendado","confirmado","na_loja","dispensado"].includes(lead.etapa);
```
Resultado: botão "Encerrar" só aparece para `novo` e `trabalhado`. Para os demais, agente usa apenas "Enviar para Análise".

## 2. `FollowUpTrackingPanel.tsx` — mesma regra

Localizar onde o botão "Encerrar" é renderizado nos cards (`renderPendingCard`) e aplicar o mesmo guard:
```ts
const canEncerrar = !["agendado","reagendado","confirmado","na_loja","dispensado"].includes(lead.etapa);
```

## 3. `DispensaReportPanel.tsx` — pergunta supervisor "volta para FUP?"

Substituir `handleDecision` por um fluxo com dialog:
- Supervisor clica "Perda" ou "Desq." → abre dialog: *"O agente deve voltar a fazer follow-up deste cliente?"* [Sim / Não]
- **Sim** → `etapa = "dispensado"`, `fup_concluido = false` (volta para fila do agente).
- **Não** → `etapa = "perdido"` ou `"desqualificado_agendado"` conforme botão clicado, `fup_concluido = true`, `fup_concluido_em = now()`.
- Anota no campo `notas` a decisão do supervisor.

Adicionar estado:
```ts
const [decisionOpen, setDecisionOpen] = useState(false);
const [decisionLead, setDecisionLead] = useState<Lead|null>(null);
const [decisionType, setDecisionType] = useState<"perdido"|"desqualificado_agendado">("perdido");
```

### Arquivos editados

- `src/components/EventoPanel.tsx`
- `src/components/FollowUpTrackingPanel.tsx`
- `src/components/DispensaReportPanel.tsx`

