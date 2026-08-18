# Novos encerramentos: "Sem retorno" e "Não convertido"

## Análise: status ou tag?

As duas informações descrevem **como a ficha terminou**, e não *por que* — diferente de "Outra Cidade", que é uma tag de motivo aplicada junto de uma desqualificação.

- **Sem retorno** (nunca respondeu no follow-up) e **Não convertido** (registrado, mas nunca agendou nem foi à loja) são estados finais, mutuamente exclusivos entre si e com Agendado/Na Loja.
- Uma ficha só pode estar em um deles por vez, e você quer contá-los em relatório para entender por que o registro não virou agendamento.

Por isso a recomendação é **criar os dois como status (etapas)**, no mesmo grupo de evasão antes da loja onde hoje ficam os Desqualificados e o Trabalhado. As tags de motivo continuam existindo por cima (ex.: "Outra Cidade", "Em Breve"), permitindo detalhar o porquê dentro de cada status.

Observação: "Trabalhado" hoje significa quase o mesmo que "Sem retorno" (lead que percorreu o FUP sem agendar). Mantemos "Trabalhado" como está e "Sem retorno" passa a ser o encerramento definitivo de quem nunca respondeu; se preferir, depois podemos aposentar "Trabalhado".

## O que será feito

1. **Dois novos status no funil**
   - `sem_retorno` — "Sem retorno"
   - `nao_convertido` — "Não convertido"
   - Cor neutra/destrutiva suave, com badge próprio, aparecendo em toda a interface onde os status já aparecem (fichas, busca, detalhe da ficha, filtros).

2. **Somente Supervisor e Gestor movem para esses status**
   - Na ficha, a ação "Alterar status" ganha as duas opções a partir de **qualquer etapa**, visível apenas para supervisor/gestor.
   - Ao mover, é registrado no histórico de notas quem alterou e a data, e é possível selecionar tags de motivo (mesma lista já usada hoje).
   - Também é possível sair desses status de volta para Novo / Agendado / Trabalhado.

3. **Contagem nos relatórios**
   - Ambos entram como **evasão antes da loja**, junto com os desqualificados — não contam como carro, meta ou comissão (nenhum deles teve check-in).
   - Nos painéis de Gestor e Supervisor (Visão geral, Por Agente, Por Loja) e no relatório diário, entram como dois indicadores próprios, para mostrar o motivo de o registro não ter virado agendamento.
   - Filtro por status nas Fichas e na busca inclui as duas novas opções.

4. **Follow-up**
   - Fichas nesses status saem do ciclo de follow-up (os pendentes são encerrados), já que representam encerramento.

## Detalhes técnicos

- Não há mudança de schema obrigatória: `leads.etapa` é texto livre. Os novos valores entram em `ETAPAS_FUNIL` (`src/data/mockData.ts`), em `getStatusBadgeClass` e nos grupos de `src/lib/leadUtils.ts` (`ETAPAS_EVASAO_ANTES`, `isPerdidoAntesLoja`).
- `ACTIVE_FUNNEL_ETAPAS` **não** inclui os novos status (encerrados não precisam ficar carregados fora da janela de 90 dias).
- `STATUS_TRANSITIONS` em `LeadDetailSheet.tsx` ganha as duas opções via caminho supervisor/gestor (não por etapa de origem).
- Painéis atualizados: `DashboardOverviewPanel`, `ManagerDashboard`, `SupervisorDashboard`, `DailyReportPanel`, `FichasPanel`, `LeadSearchPanel`, `FollowUpTrackingPanel`, `ManagerIntelligencePanel`.
- A função de geração de follow-ups passa a ignorar leads nesses status.
