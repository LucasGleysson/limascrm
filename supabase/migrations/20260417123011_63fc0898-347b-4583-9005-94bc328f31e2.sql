ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS visitas_loja integer NOT NULL DEFAULT 0;

UPDATE public.leads
SET visitas_loja = 1
WHERE etapa IN ('confirmado','na_loja','concluido','dispensado','perdido','reagendado','analise_supervisor')
  AND visitas_loja = 0;