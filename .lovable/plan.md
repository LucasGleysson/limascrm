## Correções de dados

1. **Rodrigo (Laranjeiras, Gisele)** — ajustar `checkin` de hoje 09:26 para **18/06/2025 18:00** via update no banco. `data_agendamento` permanece 18/06. Adicionar nota de auditoria "Check-in corrigido manualmente para 18/06 18:00".
2. **EVERTON DE PAULA (Grandville, Gisele)** — desfazer check-in: zerar `checkin`, decrementar `visitas_loja`, manter etapa `agendado` (data 22/06). Adicionar nota "Check-in registrado por engano — desfeito".

Efeito imediato: Relatório Diário e Painel TV passam a contar 2 carros para Gisele em 19/06 (diogo + paulo), batendo com Fichas.

## Prevenção de check-ins errados

### A. Confirmação ao clicar em check-in
Em `AgentReceptionPanel.tsx` e `LeadDetailSheet.tsx`, envolver o botão "Check-in" num `AlertDialog` com:
- Nome do cliente em destaque
- Telefone (mascarado)
- Data do agendamento (com aviso vermelho se ≠ hoje)
- Botões "Cancelar" / "Confirmar check-in"

Aplica-se aos botões existentes que disparam `handleCheckin`. Sem alteração de regra de negócio.

### B. Check-in retroativo para supervisor/gestor
Em `LeadDetailSheet.tsx` (visível apenas para supervisor/gestor, quando lead tem `checkin` preenchido), adicionar botão **"Ajustar data do check-in"** ao lado do botão de desfazer já existente. Abre dialog com:
- Input `datetime-local` pré-preenchido com o checkin atual
- Validação: não pode ser futuro
- Ao salvar: `update leads set checkin = <novo>` + nota de auditoria com valor antigo→novo

Isso permite resolver casos como Rodrigo sem precisar mexer no banco.

## Arquivos afetados (build)

- `src/components/AgentReceptionPanel.tsx` — wrap check-in em AlertDialog de confirmação
- `src/components/LeadDetailSheet.tsx` — AlertDialog de confirmação + novo botão "Ajustar check-in" (supervisor/gestor)
- 1 migration/insert para corrigir Rodrigo e Everton

Nenhuma mudança em métricas, RLS, ou schema.