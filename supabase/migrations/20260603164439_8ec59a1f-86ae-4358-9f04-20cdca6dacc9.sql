
CREATE OR REPLACE FUNCTION public.leads_reset_fup_on_reagendamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.data_agendamento IS DISTINCT FROM OLD.data_agendamento
     AND NEW.data_agendamento IS NOT NULL
     AND NEW.data_agendamento >= CURRENT_DATE
     AND NEW.etapa IN ('agendado', 'reagendado')
  THEN
    -- Remove apenas FUPs pendentes do ciclo anterior; conclusões ficam como histórico
    DELETE FROM public.eventos
     WHERE id_lead = NEW.id
       AND tipo = 'followup'
       AND concluido = false;

    -- Reseta marcadores de conclusão do processo para permitir novo ciclo
    NEW.fup_concluido := false;
    NEW.fup_concluido_em := NULL;
    NEW.fup_concluido_numero := NULL;
    NEW.fup_motivo_conclusao := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_reset_fup_on_reagendamento ON public.leads;
CREATE TRIGGER trg_leads_reset_fup_on_reagendamento
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.leads_reset_fup_on_reagendamento();
