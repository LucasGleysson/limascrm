-- Add dispensado_em timestamp to track when a lead was dispensed
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS dispensado_em timestamptz NULL;

-- Trigger function: stamp dispensado_em when etapa changes to 'dispensado'
CREATE OR REPLACE FUNCTION public.leads_set_dispensado_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.etapa = 'dispensado' AND NEW.dispensado_em IS NULL THEN
      NEW.dispensado_em := now();
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.etapa = 'dispensado' AND COALESCE(OLD.etapa, '') <> 'dispensado' THEN
      NEW.dispensado_em := now();
    END IF;
    -- when leaving 'dispensado' we keep the historical value
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_set_dispensado_em ON public.leads;
CREATE TRIGGER trg_leads_set_dispensado_em
BEFORE INSERT OR UPDATE OF etapa ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.leads_set_dispensado_em();

-- Backfill: for leads currently in 'dispensado', use updated_at as approximation
UPDATE public.leads
SET dispensado_em = updated_at
WHERE etapa = 'dispensado' AND dispensado_em IS NULL;