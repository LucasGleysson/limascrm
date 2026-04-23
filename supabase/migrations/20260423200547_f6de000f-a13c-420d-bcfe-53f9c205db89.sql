-- Allow agents to update leads from units they are assigned to (via agente_unidades)
DROP POLICY IF EXISTS "Users can update leads" ON public.leads;

CREATE POLICY "Users can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  (id_agente = auth.uid())
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR (
    has_role(auth.uid(), 'recepcionista'::app_role)
    AND id_unidade = (
      SELECT (profiles.unidade_padrao)::uuid
      FROM profiles WHERE profiles.id = auth.uid()
    )
  )
  OR (
    has_role(auth.uid(), 'agente'::app_role)
    AND id_unidade IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.agente_unidades au
      WHERE au.id_agente = auth.uid() AND au.id_unidade = leads.id_unidade
    )
  )
)
WITH CHECK (
  (id_agente = auth.uid())
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR (
    has_role(auth.uid(), 'recepcionista'::app_role)
    AND id_unidade = (
      SELECT (profiles.unidade_padrao)::uuid
      FROM profiles WHERE profiles.id = auth.uid()
    )
  )
  OR (
    has_role(auth.uid(), 'agente'::app_role)
    AND id_unidade IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.agente_unidades au
      WHERE au.id_agente = auth.uid() AND au.id_unidade = leads.id_unidade
    )
  )
);

-- Allow updating eventos when the user is responsible for the related lead's unit
DROP POLICY IF EXISTS "Users can update eventos" ON public.eventos;

CREATE POLICY "Users can update eventos"
ON public.eventos
FOR UPDATE
TO authenticated
USING (
  (id_usuario = auth.uid())
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = eventos.id_lead
      AND (
        l.id_agente = auth.uid()
        OR (
          has_role(auth.uid(), 'recepcionista'::app_role)
          AND l.id_unidade = (
            SELECT (profiles.unidade_padrao)::uuid
            FROM profiles WHERE profiles.id = auth.uid()
          )
        )
        OR (
          has_role(auth.uid(), 'agente'::app_role)
          AND l.id_unidade IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.agente_unidades au
            WHERE au.id_agente = auth.uid() AND au.id_unidade = l.id_unidade
          )
        )
      )
  )
);

-- Allow inserting eventos when user controls the related lead
DROP POLICY IF EXISTS "Users can insert eventos" ON public.eventos;

CREATE POLICY "Users can insert eventos"
ON public.eventos
FOR INSERT
TO authenticated
WITH CHECK (
  (id_usuario = auth.uid())
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = eventos.id_lead
      AND (
        l.id_agente = auth.uid()
        OR (
          has_role(auth.uid(), 'recepcionista'::app_role)
          AND l.id_unidade = (
            SELECT (profiles.unidade_padrao)::uuid
            FROM profiles WHERE profiles.id = auth.uid()
          )
        )
        OR (
          has_role(auth.uid(), 'agente'::app_role)
          AND l.id_unidade IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.agente_unidades au
            WHERE au.id_agente = auth.uid() AND au.id_unidade = l.id_unidade
          )
        )
      )
  )
);