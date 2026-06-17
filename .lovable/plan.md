## Problema

O lead "juliano" (final 8989, agente Maria Eduarda) foi resgatado de `desqualificado_agendado` → `novo` → `agendado` (Pacaembu, 17/06). Poucos minutos depois, o status voltou sozinho para `desqualificado_agendado`. As anotações registram isso acontecendo duas vezes seguidas (09:44 e 10:07).

## Causa raiz

A função `generate-followups` (cron horário) finaliza o ciclo de um lead quando o número de eventos `followup` na tabela `eventos` é maior ou igual ao máximo da categoria — para `agendado`, o máximo é **3**. Quando atinge, ela força `etapa` para `FINAL[agendado] = 'desqualificado_agendado'`.

O trigger `leads_reset_fup_on_reagendamento` resetou corretamente `fup_concluido=false`, mas **só apaga os followups pendentes** (`concluido=false`). Os 3 followups antigos do ciclo `novo` ficaram salvos como concluídos:

```
numero=1  concluido=true  (20/05)
numero=2  concluido=true  (22/05)
numero=3  concluido=true  (25/05)
```

Resultado: `maxExisting = 3 ≥ MAX[agendado] = 3` → a cron reverte a etapa imediatamente. Sempre que Maria muda para `agendado`, a próxima execução do cron derruba de volta.

O mesmo bug afeta qualquer lead resgatado depois de ter completado FUPs em outra categoria (ex.: `novo` → `agendado`, `dispensado` → `reagendado`).

## Correção

Alterar o trigger `public.leads_reset_fup_on_reagendamento` para, quando o ciclo é reiniciado (data_agendamento muda e etapa final é `agendado`/`reagendado`), apagar **todos** os followups antigos daquele lead (não só os pendentes). Assim a contagem volta a zero e o novo ciclo da categoria roda do início.

A trilha de auditoria continua preservada em `leads.notas` (cada FUP concluído já é gravado lá como texto).

### Detalhes técnicos

Migração única alterando a função:

```sql
CREATE OR REPLACE FUNCTION public.leads_reset_fup_on_reagendamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.data_agendamento IS DISTINCT FROM OLD.data_agendamento
     AND NEW.data_agendamento IS NOT NULL
     AND NEW.data_agendamento >= CURRENT_DATE
  THEN
    IF NEW.etapa = 'novo' THEN
      NEW.etapa := 'agendado';
    ELSIF NEW.etapa = 'dispensado' THEN
      NEW.etapa := 'reagendado';
    END IF;

    IF NEW.etapa IN ('agendado', 'reagendado') THEN
      -- Apaga TODO o histórico de followups (concluídos e pendentes)
      -- para que o novo ciclo da categoria comece do zero. A trilha de
      -- auditoria permanece em leads.notas.
      DELETE FROM public.eventos
       WHERE id_lead = NEW.id
         AND tipo = 'followup';

      NEW.fup_concluido := false;
      NEW.fup_concluido_em := NULL;
      NEW.fup_concluido_numero := NULL;
      NEW.fup_motivo_conclusao := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
```

### Correção pontual do lead afetado

Após aplicar a migração, executar UPDATE no lead `81cbee27-…` para voltá-lo a `agendado` (Maria Eduarda já registrou o agendamento) e apagar os 3 eventos antigos, para destravar o caso reportado imediatamente.

### Escopo

- Apenas a função de trigger e o conserto manual do lead reportado.
- Sem mudanças no frontend.
- Sem mudanças em `generate-followups`, painéis ou RLS.

### Validação

1. Lead `juliano` permanece em `agendado` após a próxima execução da cron.
2. Criar/simular outro resgate (lead com FUPs concluídos → novo agendamento) e confirmar que não reverte.
