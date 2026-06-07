
ALTER TABLE public.unidades ADD COLUMN IF NOT EXISTS ativa boolean NOT NULL DEFAULT true;
ALTER TABLE public.unidades ADD COLUMN IF NOT EXISTS ordem int;

-- Ordem fixa
UPDATE public.unidades SET ordem = 1 WHERE nome = 'Laranjeiras';
UPDATE public.unidades SET ordem = 2 WHERE nome = 'Grandville';
UPDATE public.unidades SET ordem = 4 WHERE nome = 'Patrocínio';
UPDATE public.unidades SET ordem = 5 WHERE nome = 'Araguari';
UPDATE public.unidades SET ordem = 6 WHERE nome = 'Serrana';

-- Desativa Catalão
UPDATE public.unidades SET ativa = false, ordem = NULL WHERE nome = 'Catalão';

-- Remove vínculos de agentes com Catalão
DELETE FROM public.agente_unidades
 WHERE id_unidade IN (SELECT id FROM public.unidades WHERE nome = 'Catalão');

-- Cria Pacaembu
INSERT INTO public.unidades (nome, ativa, ordem)
SELECT 'Pacaembu', true, 3
WHERE NOT EXISTS (SELECT 1 FROM public.unidades WHERE nome = 'Pacaembu');

-- Trigger: bloqueia INSERT/UPDATE em leads usando unidade inativa
-- Permite manter (não alterar) a unidade inativa em leads antigos.
CREATE OR REPLACE FUNCTION public.leads_block_unidade_inativa()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _ativa boolean;
BEGIN
  IF NEW.id_unidade IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.id_unidade IS NOT DISTINCT FROM NEW.id_unidade THEN
    RETURN NEW;
  END IF;
  SELECT ativa INTO _ativa FROM public.unidades WHERE id = NEW.id_unidade;
  IF _ativa IS FALSE THEN
    RAISE EXCEPTION 'Unidade selecionada está inativa e não aceita novos leads.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS leads_block_unidade_inativa_trg ON public.leads;
CREATE TRIGGER leads_block_unidade_inativa_trg
BEFORE INSERT OR UPDATE OF id_unidade ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.leads_block_unidade_inativa();

-- Trigger equivalente em agente_unidades
CREATE OR REPLACE FUNCTION public.agente_unidades_block_inativa()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _ativa boolean;
BEGIN
  SELECT ativa INTO _ativa FROM public.unidades WHERE id = NEW.id_unidade;
  IF _ativa IS FALSE THEN
    RAISE EXCEPTION 'Unidade inativa não pode receber vínculos de agente.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agente_unidades_block_inativa_trg ON public.agente_unidades;
CREATE TRIGGER agente_unidades_block_inativa_trg
BEFORE INSERT OR UPDATE ON public.agente_unidades
FOR EACH ROW EXECUTE FUNCTION public.agente_unidades_block_inativa();
