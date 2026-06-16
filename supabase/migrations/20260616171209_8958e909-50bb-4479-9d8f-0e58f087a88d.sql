CREATE OR REPLACE FUNCTION public.leads_reset_fup_on_reagendamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.data_agendamento IS DISTINCT FROM OLD.data_agendamento
     AND NEW.data_agendamento IS NOT NULL
     AND NEW.data_agendamento >= CURRENT_DATE
  THEN
    -- Promover etapa automaticamente quando o agente atualiza a data de agendamento
    -- sem mudar o status (evita perder leads resgatados no último FUP).
    IF NEW.etapa = 'novo' THEN
      NEW.etapa := 'agendado';
    ELSIF NEW.etapa = 'dispensado' THEN
      NEW.etapa := 'reagendado';
    END IF;

    -- Só reinicia o ciclo se a etapa final for de agendamento.
    IF NEW.etapa IN ('agendado', 'reagendado') THEN
      DELETE FROM public.eventos
       WHERE id_lead = NEW.id
         AND tipo = 'followup'
         AND concluido = false;

      NEW.fup_concluido := false;
      NEW.fup_concluido_em := NULL;
      NEW.fup_concluido_numero := NULL;
      NEW.fup_motivo_conclusao := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;