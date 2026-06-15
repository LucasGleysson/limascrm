
CREATE OR REPLACE FUNCTION public.find_lead_by_phone(_phone_digits text)
 RETURNS TABLE(id uuid, nome text, telefone text, etapa text, id_agente uuid, agente_nome text, id_unidade uuid, unidade_nome text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _d text := regexp_replace(COALESCE(_phone_digits, ''), '\D', '', 'g');
  _variants text[] := ARRAY[]::text[];
  _ddd text;
  _rest text;
BEGIN
  IF length(_d) < 8 THEN
    RETURN;
  END IF;

  _variants := array_append(_variants, _d);

  -- Brazilian mobile normalization: with/without the leading 9 after DDD
  IF length(_d) = 11 THEN
    _ddd := substring(_d FROM 1 FOR 2);
    _rest := substring(_d FROM 3);
    IF left(_rest, 1) = '9' THEN
      _variants := array_append(_variants, _ddd || substring(_rest FROM 2));
    END IF;
  ELSIF length(_d) = 10 THEN
    _ddd := substring(_d FROM 1 FOR 2);
    _rest := substring(_d FROM 3);
    _variants := array_append(_variants, _ddd || '9' || _rest);
  ELSIF length(_d) = 9 AND left(_d, 1) = '9' THEN
    _variants := array_append(_variants, substring(_d FROM 2));
  ELSIF length(_d) = 8 THEN
    _variants := array_append(_variants, '9' || _d);
  END IF;

  RETURN QUERY
  SELECT
    l.id, l.nome, l.telefone, l.etapa,
    l.id_agente, p.nome AS agente_nome,
    l.id_unidade, u.nome AS unidade_nome,
    l.created_at
  FROM public.leads l
  LEFT JOIN public.profiles p ON p.id = l.id_agente
  LEFT JOIN public.unidades u ON u.id = l.id_unidade
  WHERE regexp_replace(l.telefone, '\D', '', 'g') = ANY (_variants)
  ORDER BY l.created_at DESC
  LIMIT 5;
END;
$function$;
