
CREATE OR REPLACE FUNCTION public.find_lead_by_phone(_phone_digits text)
RETURNS TABLE (
  id uuid,
  nome text,
  telefone text,
  etapa text,
  id_agente uuid,
  agente_nome text,
  id_unidade uuid,
  unidade_nome text,
  created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.id, l.nome, l.telefone, l.etapa,
    l.id_agente, p.nome AS agente_nome,
    l.id_unidade, u.nome AS unidade_nome,
    l.created_at
  FROM public.leads l
  LEFT JOIN public.profiles p ON p.id = l.id_agente
  LEFT JOIN public.unidades u ON u.id = l.id_unidade
  WHERE _phone_digits IS NOT NULL
    AND length(_phone_digits) >= 8
    AND regexp_replace(l.telefone, '\D', '', 'g') = _phone_digits
  ORDER BY l.created_at DESC
  LIMIT 5;
$$;

REVOKE EXECUTE ON FUNCTION public.find_lead_by_phone(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.find_lead_by_phone(text) TO authenticated, service_role;
