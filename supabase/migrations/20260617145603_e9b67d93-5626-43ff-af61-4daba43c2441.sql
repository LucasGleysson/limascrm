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