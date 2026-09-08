# Motivo obrigatório ao enviar para Análise do Supervisor

Hoje, ao enviar um cliente para Análise do Supervisor a partir do follow-up, o agente pode concluir a ação escrevendo apenas um texto livre, sem escolher nenhuma etiqueta de motivo. Isso deixa esse caminho fora do padrão das outras telas (desqualificar, dispensar e encerrar como trabalhado), onde a etiqueta já é obrigatória.

## O que muda

- Ao enviar para análise, o agente passa a ser obrigado a escolher pelo menos uma etiqueta de motivo.
- O botão "Enviar para Análise" fica desabilitado enquanto nenhuma etiqueta estiver marcada, com aviso em vermelho "Selecione ao menos um motivo".
- O texto livre continua existindo, mas como complemento opcional.
- As etiquetas oferecidas continuam sendo as de dispensa (Loja Cheia, Orçamento Alto, Mal Atendimento, Reagendado pelo Gerente, Falta de Peças), já que esse envio parte sempre de clientes que estiveram na loja ou foram dispensados.
- A etiqueta escolhida continua sendo gravada na ficha e registrada nas notas, como já acontece.

## Detalhes técnicos

- `src/components/EventoPanel.tsx`:
  - `handleMarkLoss` (linha ~258): trocar a condição `(!lossMotivo.trim() && lossTags.length === 0)` por `lossTags.length === 0`.
  - Diálogo "Enviar para Análise do Supervisor" (linhas ~661-707): marcar o rótulo das tags como obrigatório, exibir mensagem de erro quando `lossTags.length === 0`, ajustar o `disabled` do botão e o atalho de Enter para exigir tag.
- Não há mudança de banco de dados; `tags_motivo` já é gravado nesse fluxo.

## Verificação

- Checagem de tipos e build.
- Conferir no painel de eventos que o botão só habilita após escolher uma etiqueta.
