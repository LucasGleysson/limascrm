UPDATE public.leads
SET etapa = 'trabalhado',
    updated_at = now()
WHERE etapa = 'desqualificado_novo'
  AND fup_concluido = true;