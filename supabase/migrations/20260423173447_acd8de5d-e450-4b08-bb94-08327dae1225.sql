ALTER TABLE public.leads
ALTER COLUMN id_agente DROP NOT NULL;

DROP POLICY IF EXISTS "Users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads" ON public.leads;

CREATE POLICY "Users can insert leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  id_agente = auth.uid()
  OR public.has_role(auth.uid(), 'gestor'::app_role)
  OR public.has_role(auth.uid(), 'supervisor'::app_role)
  OR (
    public.has_role(auth.uid(), 'recepcionista'::app_role)
    AND id_recepcionista = auth.uid()
    AND id_unidade = (
      SELECT unidade_padrao::uuid
      FROM public.profiles
      WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  id_agente = auth.uid()
  OR public.has_role(auth.uid(), 'gestor'::app_role)
  OR public.has_role(auth.uid(), 'supervisor'::app_role)
  OR (
    public.has_role(auth.uid(), 'recepcionista'::app_role)
    AND id_unidade = (
      SELECT unidade_padrao::uuid
      FROM public.profiles
      WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  id_agente = auth.uid()
  OR public.has_role(auth.uid(), 'gestor'::app_role)
  OR public.has_role(auth.uid(), 'supervisor'::app_role)
  OR (
    public.has_role(auth.uid(), 'recepcionista'::app_role)
    AND id_unidade = (
      SELECT unidade_padrao::uuid
      FROM public.profiles
      WHERE id = auth.uid()
    )
  )
);