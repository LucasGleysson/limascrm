
DROP TRIGGER IF EXISTS trg_leads_autofill_unidade ON public.leads;
DROP TRIGGER IF EXISTS leads_autofill_unidade_trigger ON public.leads;
DROP FUNCTION IF EXISTS public.leads_autofill_unidade() CASCADE;

CREATE OR REPLACE FUNCTION public.leads_validate_unidade()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.etapa IN (
    'agendado','reagendado','confirmado','na_loja',
    'concluido','dispensado','perdido','analise_supervisor',
    'desqualificado_agendado'
  ) AND NEW.id_unidade IS NULL THEN
    RAISE EXCEPTION 'Lead na etapa "%" exige unidade definida.', NEW.etapa
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_validate_unidade_trigger ON public.leads;
CREATE TRIGGER leads_validate_unidade_trigger
BEFORE INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.leads_validate_unidade();

CREATE INDEX IF NOT EXISTS leads_telefone_digits_idx
  ON public.leads ((regexp_replace(telefone, '\D', '', 'g')));
