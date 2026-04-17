

## Análise

Preciso identificar leads `desqualificado_novo` que foram desqualificados pelo processo de FUP (não por motivo manual de descarte) e converter para `trabalhado`.

Sinais disponíveis na base:
- `fup_concluido = true` + `fup_motivo_conclusao` indica que o encerramento veio do fluxo de FUP.
- O código atual (`EventoPanel.tsx` / `FollowUpTrackingPanel.tsx`) ao encerrar manualmente seta `fup_motivo_conclusao = "Encerrado pelo agente"` e a edge `generate-followups` seta `"Processo completo (7 follow-ups)"`.
- Leads `desqualificado_novo` que viraram desqualificados por motivo manual (selecionado pelo agente em `MotivoTagSelector` no fluxo de "Descartar") **não têm** `fup_concluido = true` — são marcados via update direto de etapa, sem tocar nesses campos.

Vou validar isso com SELECTs antes de propor o UPDATE.

## Plano

1. **Investigar** com `supabase--read_query`:
   - Contar `desqualificado_novo` com `fup_concluido = true` agrupado por `fup_motivo_conclusao`.
   - Confirmar que leads com `tags_motivo` preenchido (descarte manual) **não** têm `fup_concluido = true`, garantindo que o critério não pega falsos positivos.

2. **Migration de backfill** (UPDATE de dados, mas como é correção retroativa de schema/estado pós-refactor faço via migration para ficar versionado):
   ```sql
   UPDATE public.leads
   SET etapa = 'trabalhado'
   WHERE etapa = 'desqualificado_novo'
     AND fup_concluido = true
     AND fup_motivo_conclusao IN (
       'Processo completo (7 follow-ups)',
       'Encerrado pelo agente'
     );
   ```

3. **Sem mudanças de código** — a lógica nova já cria `trabalhado` corretamente daqui pra frente; isso é só limpeza histórica.

4. **Validação pós**: rodar SELECT mostrando quantos foram convertidos e confirmar que nenhum lead com `tags_motivo` (descarte manual genuíno) foi afetado.

