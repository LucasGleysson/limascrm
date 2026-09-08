# Ajustes: contagem de concluídos e motivo obrigatório na análise

## 1. Concluídos: sempre ancorados no check-in

Hoje o painel do supervisor conta como concluído apenas o carro que tem check-in registrado no período, enquanto o painel do próprio agente conta pelo status da ficha. Por isso a Taina aparece com 9 no painel do supervisor e 10 no dela: a ficha de Guilherme Alves Neto está como "Serviço Concluído" sem nenhum check-in.

O que muda:
- No painel do agente ("Meu Painel") e no "Meu Dia", concluídos e perdidos passam a contar apenas fichas com check-in dentro do período, igual ao supervisor.
- A meta do mês (concluídos + perdidos) passa a usar a mesma base, então o progresso e a bonificação ficam iguais nos dois lugares.
- Os demais números do painel do agente (novos, agendados, trabalhados etc.) continuam como estão.

## 2. Motivo obrigatório ao enviar para Análise do Supervisor

Hoje o agente consegue enviar uma ficha para análise escrevendo apenas texto livre, sem escolher etiqueta de motivo — diferente das telas de desqualificar, dispensar e encerrar como trabalhado.

O que muda:
- Passa a ser obrigatório escolher pelo menos uma etiqueta de motivo.
- O botão fica desabilitado enquanto nenhuma etiqueta estiver marcada, com aviso "Selecione ao menos um motivo".
- O texto livre continua como complemento opcional.

## Detalhes técnicos

- `src/components/AgentPanelOverview.tsx`: `concluidos`/`perdidos` (linhas ~71-73) e o breakdown por unidade (linha ~143) passam a filtrar por `!!l.checkin` além da etapa, usando a mesma âncora de período (`foiNaLojaNoPeriodo`) já aplicada em `SupervisorDashboard.tsx:120-125`.
- `src/components/AgentDayPanel.tsx`: alinhar o cálculo de meta/comissão à mesma regra.
- `src/components/EventoPanel.tsx`: em `handleMarkLoss` (linha ~258) exigir `lossTags.length > 0`; no diálogo (linhas ~661-707) marcar o campo como obrigatório, exibir erro e ajustar `disabled` e o atalho de Enter.
- Sem alterações de banco de dados.

## Verificação

- Checagem de tipos e build.
- Conferir que os concluídos da Taina batem entre o painel do supervisor e o painel dela.
