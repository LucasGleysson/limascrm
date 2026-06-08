
-- Tighten SELECT visibility: agents only see their own leads/eventos
DROP POLICY IF EXISTS "Authenticated users can read leads" ON public.leads;
CREATE POLICY "Leads visibility per role"
ON public.leads FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR id_agente = auth.uid()
  OR (
    has_role(auth.uid(), 'recepcionista'::app_role)
    AND id_unidade IS NOT NULL
    AND id_unidade = (
      SELECT NULLIF(p.unidade_padrao, '')::uuid
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.unidade_padrao ~ '^[0-9a-f-]{36}$'
    )
  )
);

DROP POLICY IF EXISTS "Authenticated users can read eventos" ON public.eventos;
CREATE POLICY "Eventos visibility per role"
ON public.eventos FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR id_usuario = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = eventos.id_lead
      AND (
        l.id_agente = auth.uid()
        OR (
          has_role(auth.uid(), 'recepcionista'::app_role)
          AND l.id_unidade IS NOT NULL
          AND l.id_unidade = (
            SELECT NULLIF(p.unidade_padrao, '')::uuid
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.unidade_padrao ~ '^[0-9a-f-]{36}$'
          )
        )
      )
  )
);
